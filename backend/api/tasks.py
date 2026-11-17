from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models.task import Task
from models.user import User
from schemas.task import TaskCreate, TaskUpdate, TaskResponse
from api.auth import get_current_user
from services.wallet import (
    calculate_task_budget,
    ensure_employer_funds,
    raise_if_insufficient_funds,
    refund_task_budget,
    reserve_budget_for_task,
)

router = APIRouter()

@router.get("/", response_model=List[TaskResponse])
async def get_tasks(
    skip: int = 0,
    limit: int = 100,
    price_min: Optional[int] = Query(None),
    price_max: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Task).filter(Task.status == "active")
    
    if price_min is not None:
        query = query.filter(Task.price >= price_min)
    if price_max is not None:
        query = query.filter(Task.price <= price_max)
    
    tasks = query.offset(skip).limit(limit).all()
    return tasks

@router.get("/nearby", response_model=List[TaskResponse])
async def get_tasks_nearby(
    lat: float = Query(...),
    lon: float = Query(...),
    radius: float = Query(5.0),  # радиус в километрах
    db: Session = Depends(get_db)
):
    # Простой поиск по прямоугольнику (для демонстрации)
    # В реальном проекте лучше использовать PostGIS
    lat_delta = radius / 111.0  # приблизительно 1 градус = 111 км
    lon_delta = radius / (111.0 * abs(lat))
    
    tasks = db.query(Task).filter(
        Task.status == "active",
        Task.latitude.between(lat - lat_delta, lat + lat_delta),
        Task.longitude.between(lon - lon_delta, lon + lon_delta)
    ).all()
    
    return tasks

@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if task is None:
        raise HTTPException(status_code=404, detail="Задача не найдена")
    return task

@router.post("/", response_model=TaskResponse)
async def create_task(
    task: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "employer":
        raise HTTPException(
            status_code=403,
            detail="Только работодатели могут создавать задачи",
        )
    if current_user.is_banned:
        raise HTTPException(
            status_code=403,
            detail="Аккаунт заблокирован, создание задач недоступно",
        )

    try:
        total_budget = calculate_task_budget(task.price, task.count_people)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    funds_check = ensure_employer_funds(current_user, total_budget)
    raise_if_insufficient_funds(funds_check)

    db_task = Task(
        **task.dict(),
        user_id=current_user.id,
        reserved_budget=0,
    )
    db.add(db_task)
    db.flush()

    reserve_budget_for_task(
        db=db,
        employer=current_user,
        task=db_task,
        amount=total_budget,
        details="Резервирование бюджета при создании задачи",
    )

    db.commit()
    db.refresh(db_task)
    return db_task

@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: int,
    task_update: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if task is None:
        raise HTTPException(status_code=404, detail="Задача не найдена")
    
    if task.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Недостаточно прав для редактирования")
    
    update_data = task_update.dict(exclude_unset=True)
    update_data.pop("reserved_budget", None)

    new_total_budget = None
    if "price" in update_data or "count_people" in update_data:
        new_price = update_data.get("price", task.price)
        new_count = update_data.get("count_people", task.count_people)
        try:
            new_total_budget = calculate_task_budget(new_price, new_count)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))
        current_reserved = task.reserved_budget or 0
        if new_total_budget > current_reserved:
            additional_amount = new_total_budget - current_reserved
            funds_check = ensure_employer_funds(current_user, additional_amount)
            raise_if_insufficient_funds(funds_check)
            reserve_budget_for_task(
                db=db,
                employer=current_user,
                task=task,
                amount=additional_amount,
                details="Увеличение бюджета задачи",
            )
        elif new_total_budget < current_reserved:
            refund_task_budget(
                db=db,
                employer=current_user,
                task=task,
                amount=current_reserved - new_total_budget,
                reason="Корректировка бюджета задачи",
            )
        task.reserved_budget = new_total_budget

    if "status" in update_data:
        new_status = update_data["status"]
        if new_status == "cancelled" and task.status != "cancelled":
            if task.reserved_budget:
                refund_task_budget(
                    db=db,
                    employer=current_user,
                    task=task,
                    amount=task.reserved_budget,
                    reason="Отмена задачи работодателем",
                )
                task.reserved_budget = 0

    for field, value in update_data.items():
        setattr(task, field, value)
    
    db.commit()
    db.refresh(task)
    return task

@router.delete("/{task_id}")
async def delete_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if task is None:
        raise HTTPException(status_code=404, detail="Задача не найдена")
    
    if task.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Недостаточно прав для удаления")

    if task.reserved_budget:
        refund_task_budget(
            db=db,
            employer=current_user,
            task=task,
            amount=task.reserved_budget,
            reason="Возврат средств при удалении задачи",
        )
        task.reserved_budget = 0

    db.delete(task)
    db.commit()
    return {"message": "Задача удалена"}
