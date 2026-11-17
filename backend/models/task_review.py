from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


class TaskReview(Base):
    __tablename__ = "task_reviews"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"))
    application_id = Column(
        Integer, ForeignKey("task_applications.id", ondelete="CASCADE"), nullable=True
    )
    employer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    worker_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    rating = Column(Float, default=5.0)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    task = relationship("Task", back_populates="reviews")
    application = relationship("TaskApplication")
    employer = relationship(
        "User", foreign_keys=[employer_id], back_populates="given_reviews"
    )
    worker = relationship(
        "User", foreign_keys=[worker_id], back_populates="received_reviews"
    )

