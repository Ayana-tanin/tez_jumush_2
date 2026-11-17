from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from models.task import Task
from models.task_application import TaskApplication
from models.user import User
from models.wallet_transaction import WalletTransaction


@dataclass
class WalletCheckResult:
    has_funds: bool
    required_amount: int
    current_balance: int

    @property
    def missing_amount(self) -> int:
        if self.has_funds:
            return 0
        return max(self.required_amount - self.current_balance, 0)


COMMISSION_PERCENT = 10


def calculate_task_budget(price: int, count_people: int) -> int:
    if price <= 0:
        raise ValueError("Стоимость за одного работника должна быть больше нуля")
    if count_people <= 0:
        raise ValueError("Количество работников должно быть больше нуля")
    return price * count_people


def ensure_employer_funds(user: User, required_amount: int) -> WalletCheckResult:
    current_balance = max(user.balance, 0)
    has_funds = current_balance >= required_amount
    return WalletCheckResult(
        has_funds=has_funds,
        required_amount=required_amount,
        current_balance=current_balance,
    )


def raise_if_insufficient_funds(result: WalletCheckResult) -> None:
    if result.has_funds:
        return
    raise HTTPException(
        status_code=status.HTTP_402_PAYMENT_REQUIRED,
        detail={
            "code": "INSUFFICIENT_FUNDS",
            "message": (
                "Недостаточно средств для создания задачи. "
                "Пожалуйста, пополните баланс."
            ),
            "required_amount": result.required_amount,
            "current_balance": result.current_balance,
            "missing_amount": result.missing_amount,
        },
    )


def reserve_budget_for_task(
    db: Session,
    employer: User,
    task: Task,
    amount: int,
    details: Optional[str] = None,
) -> WalletTransaction:
    if amount <= 0:
        raise ValueError("Сумма резервирования должна быть больше нуля")
    result = ensure_employer_funds(employer, amount)
    raise_if_insufficient_funds(result)

    employer.balance -= amount
    employer.held_balance += amount
    task.reserved_budget = (task.reserved_budget or 0) + amount

    transaction = WalletTransaction(
        user_id=employer.id,
        task_id=task.id,
        type="hold",
        amount=-amount,
        status="completed",
        details=details
        or f"Резервирование средств для задачи #{task.id}",
    )
    db.add(transaction)
    db.flush()
    return transaction


def refund_task_budget(
    db: Session,
    employer: User,
    task: Task,
    amount: int,
    application: Optional[TaskApplication] = None,
    reason: str = "Возврат средств",
) -> WalletTransaction:
    if amount <= 0:
        raise ValueError("Сумма возврата должна быть больше нуля")

    employer.balance += amount
    employer.held_balance = max(employer.held_balance - amount, 0)
    task.reserved_budget = max((task.reserved_budget or 0) - amount, 0)

    transaction = WalletTransaction(
        user_id=employer.id,
        task_id=task.id,
        application_id=application.id if application else None,
        type="refund",
        amount=amount,
        status="completed",
        details=reason,
    )
    db.add(transaction)
    db.flush()
    return transaction


def schedule_payout_for_application(
    db: Session,
    employer: User,
    worker: User,
    task: Task,
    application: TaskApplication,
    gross_amount: int,
    payout_delay_hours: int = 2,
) -> dict:
    if gross_amount <= 0:
        raise ValueError("Сумма выплаты должна быть больше нуля")

    commission_amount = gross_amount * COMMISSION_PERCENT // 100
    net_amount = gross_amount - commission_amount
    if net_amount <= 0:
        raise ValueError("Комиссия превышает или равна сумме выплаты")

    employer.held_balance = max(employer.held_balance - gross_amount, 0)
    task.reserved_budget = max((task.reserved_budget or 0) - gross_amount, 0)

    available_at = datetime.utcnow() + timedelta(hours=payout_delay_hours)

    application.payout_amount = net_amount
    application.commission_amount = commission_amount
    application.payout_status = "scheduled"
    application.payout_available_at = available_at

    commission_tx = WalletTransaction(
        user_id=employer.id,
        task_id=task.id,
        application_id=application.id,
        type="commission",
        amount=-commission_amount,
        status="completed",
        details=f"Комиссия платформы за задачу #{task.id}",
    )
    db.add(commission_tx)

    worker_tx = WalletTransaction(
        user_id=worker.id,
        task_id=task.id,
        application_id=application.id,
        type="payout",
        amount=net_amount,
        status="scheduled",
        details=f"Выплата за задачу #{task.id}",
        available_at=available_at,
    )
    db.add(worker_tx)

    db.flush()
    application.payout_transaction_id = worker_tx.id

    return {
        "net_amount": net_amount,
        "commission_amount": commission_amount,
        "available_at": available_at,
    }


def process_due_payouts(db: Session) -> int:
    """
    Переводит запланированные выплаты, у которых наступил срок.
    Возвращает количество обработанных выплат.
    """
    now = datetime.utcnow()
    transactions = (
        db.query(WalletTransaction)
        .filter(
            WalletTransaction.type == "payout",
            WalletTransaction.status == "scheduled",
            WalletTransaction.available_at <= now,
        )
        .all()
    )

    processed = 0
    for tx in transactions:
        worker = db.query(User).filter(User.id == tx.user_id).with_for_update().first()
        if not worker:
            continue
        worker.balance += tx.amount
        tx.status = "completed"
        tx.processed_at = now

        application = (
            db.query(TaskApplication)
            .filter(TaskApplication.payout_transaction_id == tx.id)
            .first()
        )
        if application:
            application.payout_status = "released"
            application.payout_processed_at = now

        processed += 1

    if processed:
        db.flush()
    return processed


def immediate_top_up(
    db: Session,
    user: User,
    amount: int,
    payment_method: str,
    reference: Optional[str] = None,
) -> WalletTransaction:
    if amount <= 0:
        raise ValueError("Сумма пополнения должна быть больше нуля")

    readable_method = payment_method.upper()
    if payment_method == "megapay":
        readable_method = "MegaPay"
    elif payment_method == "mbank":
        readable_method = "mBank"
    elif payment_method == "optima":
        readable_method = "Optima"

    user.balance += amount
    transaction = WalletTransaction(
        user_id=user.id,
        type="topup",
        amount=amount,
        status="completed",
        details=f"Пополнение через {readable_method}",
    )

    if reference:
        transaction.details += f". Код операции: {reference}"

    db.add(transaction)
    db.flush()
    return transaction


