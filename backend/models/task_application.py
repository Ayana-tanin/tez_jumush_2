from datetime import datetime, timedelta
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    ForeignKey,
    Boolean,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


class TaskApplication(Base):
    __tablename__ = "task_applications"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"))
    worker_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    employer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    status = Column(
        String,
        default="pending",
        index=True,
    )  # pending, accepted, rejected, cancelled, started, completed, no_show
    cover_letter = Column(Text, nullable=True)
    has_experience = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    accepted_at = Column(DateTime(timezone=True), nullable=True)
    rejected_at = Column(DateTime(timezone=True), nullable=True)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)
    worker_confirmed_start_at = Column(DateTime(timezone=True), nullable=True)
    employer_confirmed_start_at = Column(DateTime(timezone=True), nullable=True)
    worker_confirmed_finish_at = Column(DateTime(timezone=True), nullable=True)
    employer_confirmed_finish_at = Column(DateTime(timezone=True), nullable=True)
    no_show_reported_at = Column(DateTime(timezone=True), nullable=True)
    decline_reason = Column(Text, nullable=True)

    payout_amount = Column(Integer, default=0)
    commission_amount = Column(Integer, default=0)
    payout_status = Column(
        String, default="pending"
    )  # pending, scheduled, released, failed
    payout_available_at = Column(DateTime(timezone=True), nullable=True)
    payout_processed_at = Column(DateTime(timezone=True), nullable=True)
    payout_transaction_id = Column(
        Integer, ForeignKey("wallet_transactions.id"), nullable=True
    )
    notify_10h_sent_at = Column(DateTime(timezone=True), nullable=True)
    notify_1h_sent_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    task = relationship("Task", back_populates="applications")
    worker = relationship(
        "User",
        foreign_keys=[worker_id],
        back_populates="applications",
    )
    employer = relationship("User", foreign_keys=[employer_id])
    payout_transaction = relationship(
        "WalletTransaction", foreign_keys=[payout_transaction_id]
    )

    def is_ready_for_start_confirmation(self, task_datetime: datetime) -> bool:
        """
        Проверяет, можно ли подтверждать выход - за 10 минут до начала.
        """
        ten_minutes_before = task_datetime - timedelta(minutes=10)
        now = datetime.utcnow()
        return now >= ten_minutes_before.replace(tzinfo=None)

    def mark_no_show(self):
        self.status = "no_show"
        self.no_show_reported_at = datetime.utcnow()

