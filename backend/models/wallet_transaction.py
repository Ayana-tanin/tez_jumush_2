from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    ForeignKey,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


class WalletTransaction(Base):
    __tablename__ = "wallet_transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True)
    application_id = Column(
        Integer, ForeignKey("task_applications.id", ondelete="SET NULL"), nullable=True
    )
    type = Column(
        String,
        nullable=False,
        index=True,
    )  # topup, hold, refund, commission, payout, release
    amount = Column(Integer, nullable=False)  # в сомах, может быть отрицательной
    status = Column(
        String, default="completed"
    )  # pending, scheduled, completed, failed, cancelled
    details = Column(Text, nullable=True)
    available_at = Column(DateTime(timezone=True), nullable=True)
    processed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="wallet_transactions")
    task = relationship("Task")
    application = relationship("TaskApplication", back_populates="payout_transaction")

