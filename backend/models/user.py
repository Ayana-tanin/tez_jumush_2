from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String, unique=True, index=True, nullable=True)  # Может быть null для Google auth
    email = Column(String, unique=True, index=True, nullable=True)  # Для Google auth
    full_name = Column(String, nullable=False)
    role = Column(String, default="worker")  # worker, employer
    google_id = Column(String, unique=True, index=True, nullable=True)  # Google ID
    profile_picture = Column(String, nullable=True)  # URL к фото профиля Google
    passport_series = Column(String, nullable=True)  # Опционально для Google auth
    passport_number = Column(String, nullable=True)
    passport_issued_by = Column(String, nullable=True)
    passport_date = Column(String, nullable=True)
    passport_front = Column(String)  # URL к фото паспорта (лицевая сторона)
    passport_back = Column(String)   # URL к фото паспорта (обратная сторона)
    avatar = Column(String)          # URL к аватару
    rating = Column(Float, default=5.0)
    is_verified = Column(Boolean, default=False)
    whatsapp_verified = Column(Boolean, default=False)
    whatsapp_linked_at = Column(DateTime(timezone=True), nullable=True)
    district = Column(String, nullable=True)
    experience_years = Column(Integer, default=0)
    experience_description = Column(Text, nullable=True)
    age = Column(Integer, nullable=True)
    card_number = Column(String, nullable=True)
    balance = Column(Integer, default=0)  # Баланс в сомах
    held_balance = Column(Integer, default=0)  # Зарезервированные средства
    no_show_count = Column(Integer, default=0)
    is_banned = Column(Boolean, default=False)
    ban_reason = Column(String, nullable=True)
    ban_expires_at = Column(DateTime(timezone=True), nullable=True)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Связи
    tasks = relationship("Task", back_populates="user")
    applications = relationship(
        "TaskApplication",
        back_populates="worker",
        foreign_keys="TaskApplication.worker_id"
    )
    received_reviews = relationship(
        "TaskReview",
        back_populates="worker",
        foreign_keys="TaskReview.worker_id"
    )
    given_reviews = relationship(
        "TaskReview",
        back_populates="employer",
        foreign_keys="TaskReview.employer_id"
    )
    wallet_transactions = relationship("WalletTransaction", back_populates="user")

    def has_active_ban(self) -> bool:
        if not self.is_banned:
            return False
        if self.ban_expires_at is None:
            return True
        return datetime.utcnow() < self.ban_expires_at.replace(tzinfo=None)
