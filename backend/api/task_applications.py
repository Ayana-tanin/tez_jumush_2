from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from api.auth import get_current_user
from database import get_db
from models.task import Task
from models.task_application import TaskApplication
from models.task_review import TaskReview
from models.user import User
from schemas.task_application import (
    TaskApplicationAttendanceUpdate,
    TaskApplicationCreate,
    TaskApplicationResponse,
    TaskApplicationStatusUpdate,
)
from services.wallet import (
    COMMISSION_PERCENT,
    refund_task_budget,
    schedule_payout_for_application,
)

router = APIRouter(prefix="/tasks/{task_id}/applications", tags=["task-applications"])
reminders_router = APIRouter(prefix="/applications", tags=["task-applications"])


def _get_task(db: Session, task_id: int) -> Task:
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Задача не найдена")
    return task


def _get_application(db: Session, task_id: int, application_id: int) -> TaskApplication:
    application = (
        db.query(TaskApplication)
        .filter(
            TaskApplication.id == application_id,
            TaskApplication.task_id == task_id,
        )
        .first()
    )
    if not application:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Отклик не найден")
    return application


@router.post(
    "/",
    response_model=TaskApplicationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def apply_for_task(
    task_id: int,
    payload: TaskApplicationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.is_banned:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Аккаунт заблокирован. Отклик невозможен.",
        )
    if current_user.role != "worker":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Только работники могут откликаться на задачи.",
        )

    task = _get_task(db, task_id)
    if task.status != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нельзя откликнуться на неактивную задачу.",
        )
    if task.user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нельзя откликнуться на собственную задачу.",
        )

    existing_application = (
        db.query(TaskApplication)
        .filter(
            TaskApplication.task_id == task_id,
            TaskApplication.worker_id == current_user.id,
        )
        .first()
    )
    if existing_application:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Вы уже откликались на эту задачу.",
        )

    cover_letter = payload.cover_letter
    if not cover_letter:
        if current_user.experience_description:
            cover_letter = current_user.experience_description
        else:
            cover_letter = "У меня нет опыта, но готов всему обучиться."

    has_experience = payload.has_experience
    if has_experience is None:
        has_experience = bool(
            (current_user.experience_years or 0) > 0 or current_user.experience_description
        )

    commission_amount = task.price * COMMISSION_PERCENT // 100
    application = TaskApplication(
        task_id=task.id,
        worker_id=current_user.id,
        employer_id=task.user_id,
        cover_letter=cover_letter,
        has_experience=has_experience,
        payout_amount=task.price - commission_amount,
        commission_amount=commission_amount,
    )
    db.add(application)
    db.commit()
    db.refresh(application)
    return application


@router.get("/", response_model=List[TaskApplicationResponse])
async def list_applications(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = _get_task(db, task_id)

    if current_user.id == task.user_id:
        applications = (
            db.query(TaskApplication)
            .options(joinedload(TaskApplication.worker))
            .filter(TaskApplication.task_id == task_id)
            .order_by(TaskApplication.created_at.asc())
            .all()
        )
        return applications

    if current_user.role == "worker":
        applications = (
            db.query(TaskApplication)
            .options(joinedload(TaskApplication.worker))
            .filter(
                TaskApplication.task_id == task_id,
                TaskApplication.worker_id == current_user.id,
            )
            .all()
        )
        return applications

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Нет доступа к откликам.",
    )


@router.patch("/{application_id}/status", response_model=TaskApplicationResponse)
async def update_application_status(
    task_id: int,
    application_id: int,
    payload: TaskApplicationStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = _get_task(db, task_id)
    application = _get_application(db, task_id, application_id)

    if current_user.id != task.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Только работодатель может управлять откликами.",
        )

    desired_status = payload.status
    now = datetime.utcnow()

    if desired_status == "accepted":
        if application.status not in {"pending"}:
            raise HTTPException(status_code=400, detail="Отклик уже обработан.")
        accepted_count = (
            db.query(TaskApplication)
            .filter(
                TaskApplication.task_id == task_id,
                TaskApplication.status.in_({"accepted", "started", "completed"}),
            )
            .count()
        )
        if accepted_count >= task.count_people:
            raise HTTPException(
                status_code=400,
                detail="Достигнут лимит работников для этой задачи.",
            )
        application.status = "accepted"
        application.accepted_at = now
        application.decline_reason = None
    elif desired_status == "rejected":
        if application.status not in {"pending"}:
            raise HTTPException(status_code=400, detail="Отклик уже обработан.")
        application.status = "rejected"
        application.rejected_at = now
        application.decline_reason = payload.decline_reason or "Отказ работодателя"
    elif desired_status == "cancelled":
        if application.status not in {"accepted", "started"}:
            raise HTTPException(status_code=400, detail="Нельзя отменить этот отклик.")
        application.status = "cancelled"
        application.cancelled_at = now
        application.decline_reason = payload.decline_reason or "Отмена отклика"
    else:
        raise HTTPException(status_code=400, detail="Неверный статус.")

    db.commit()
    db.refresh(application)
    return application


def _task_start_datetime(task: Task) -> datetime:
    return datetime.combine(task.date, task.time_from)


@router.post("/{application_id}/attendance", response_model=TaskApplicationResponse)
async def update_attendance(
    task_id: int,
    application_id: int,
    payload: TaskApplicationAttendanceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = _get_task(db, task_id)
    application = _get_application(db, task_id, application_id)
    employer_user = db.query(User).filter(User.id == application.employer_id).first()
    worker_user = db.query(User).filter(User.id == application.worker_id).first()
    if not employer_user or not worker_user:
        raise HTTPException(status_code=500, detail="Пользователи отклика не найдены.")
    now = datetime.utcnow()
    action = payload.action

    if action == "worker_confirm_start":
        if current_user.id != application.worker_id:
            raise HTTPException(status_code=403, detail="Нет доступа.")
        if application.status not in {"accepted", "started"}:
            raise HTTPException(status_code=400, detail="Отклик еще не принят работодателем.")
        if not application.is_ready_for_start_confirmation(_task_start_datetime(task)):
            raise HTTPException(
                status_code=400,
                detail="Подтвердить начало можно за 10 минут до старта задачи.",
            )
        application.worker_confirmed_start_at = now
    elif action == "employer_confirm_start":
        if current_user.id != application.employer_id:
            raise HTTPException(status_code=403, detail="Нет доступа.")
        application.employer_confirmed_start_at = now
    elif action == "worker_confirm_finish":
        if current_user.id != application.worker_id:
            raise HTTPException(status_code=403, detail="Нет доступа.")
        application.worker_confirmed_finish_at = now
    elif action == "employer_confirm_finish":
        if current_user.id != application.employer_id:
            raise HTTPException(status_code=403, detail="Нет доступа.")
        application.employer_confirmed_finish_at = now
    elif action == "report_no_show":
        if current_user.id != application.employer_id:
            raise HTTPException(status_code=403, detail="Нет доступа.")
        if application.status in {"completed", "no_show"}:
            raise HTTPException(status_code=400, detail="Статус уже установлен.")
        application.mark_no_show()
        worker_user.no_show_count += 1
        if worker_user.no_show_count >= 3:
            worker_user.is_banned = True
            worker_user.ban_reason = "Превышено допустимое количество неявок."
        refund_task_budget(
            db=db,
            employer=employer_user,
            task=task,
            amount=task.price,
            application=application,
            reason="Возврат за неявку работника",
        )
        application.payout_status = "cancelled"
        application.payout_available_at = None
    else:
        raise HTTPException(status_code=400, detail="Неизвестное действие.")

    if (
        application.worker_confirmed_start_at
        and application.employer_confirmed_start_at
        and application.status == "accepted"
    ):
        application.status = "started"

    if (
        application.worker_confirmed_finish_at
        and application.employer_confirmed_finish_at
        and application.status in {"accepted", "started"}
    ):
        payout_info = schedule_payout_for_application(
            db=db,
            employer=employer_user,
            worker=worker_user,
            task=task,
            application=application,
            gross_amount=task.price,
        )
        application.status = "completed"
        application.payout_status = "scheduled"
        application.payout_available_at = payout_info["available_at"]
        _ensure_default_review(db, task, application)

    db.commit()
    db.refresh(application)
    return application


@reminders_router.post("/process-reminders")
async def process_attendance_reminders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in {"employer", "worker"}:
        raise HTTPException(status_code=403, detail="Нет доступа.")

    now = datetime.utcnow()
    ten_hour_window = timedelta(hours=10)
    one_hour_window = timedelta(hours=1)

    applications = (
        db.query(TaskApplication)
        .options(joinedload(TaskApplication.task), joinedload(TaskApplication.worker))
        .filter(TaskApplication.status.in_(("accepted", "started")))
        .all()
    )

    ten_hour_count = 0
    one_hour_count = 0
    reminders: List[dict] = []

    for application in applications:
        task = application.task
        if not task:
            continue
        start_at = datetime.combine(task.date, task.time_from)
        delta = start_at - now
        if delta < timedelta(seconds=0):
            continue

        if application.notify_10h_sent_at is None and delta <= ten_hour_window:
            application.notify_10h_sent_at = now
            ten_hour_count += 1
            reminders.append(
                {
                    "application_id": application.id,
                    "task_id": task.id,
                    "worker_id": application.worker_id,
                    "type": "ten_hours",
                    "send_to": application.worker.phone if application.worker else None,
                    "start_at": start_at.isoformat(),
                }
            )

        if application.notify_1h_sent_at is None and delta <= one_hour_window:
            application.notify_1h_sent_at = now
            one_hour_count += 1
            reminders.append(
                {
                    "application_id": application.id,
                    "task_id": task.id,
                    "worker_id": application.worker_id,
                    "type": "one_hour",
                    "send_to": application.worker.phone if application.worker else None,
                    "start_at": start_at.isoformat(),
                }
            )

    db.commit()
    return {
        "ten_hour_notifications": ten_hour_count,
        "one_hour_notifications": one_hour_count,
        "reminders": reminders,
    }


def _ensure_default_review(db: Session, task: Task, application: TaskApplication) -> None:
    existing_review = (
        db.query(TaskReview)
        .filter(
            TaskReview.task_id == task.id,
            TaskReview.worker_id == application.worker_id,
            TaskReview.employer_id == application.employer_id,
        )
        .first()
    )
    if existing_review:
        return

    review = TaskReview(
        task_id=task.id,
        application_id=application.id,
        employer_id=application.employer_id,
        worker_id=application.worker_id,
        rating=5.0,
        comment="Претензий нет.",
    )
    db.add(review)
    db.flush()


