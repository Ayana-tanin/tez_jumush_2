from sqlalchemy import Column, Integer, String, Text, Float, Date, Time, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text)
    price = Column(Integer, nullable=False)  # Цена в сомах за одного работника
    count_people = Column(Integer, default=1)
    date = Column(Date, nullable=False)
    time_from = Column(Time, nullable=False)
    time_to = Column(Time, nullable=False)
    address = Column(String, nullable=False)
    district = Column(String, nullable=False)
    latitude = Column(Float)
    longitude = Column(Float)
    user_id = Column(Integer, ForeignKey("users.id"))
    status = Column(String, default="active")  # active, completed, cancelled
    reserved_budget = Column(Integer, default=0)  # Зарезервированная сумма
    auto_release_at = Column(DateTime(timezone=True), nullable=True)
    requires_attendance_confirmation = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Связь с пользователем
    user = relationship("User", back_populates="tasks")
    applications = relationship("TaskApplication", back_populates="task", cascade="all, delete-orphan")
    reviews = relationship("TaskReview", back_populates="task", cascade="all, delete-orphan")
