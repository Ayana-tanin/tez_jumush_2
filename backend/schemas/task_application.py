from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from .user import UserResponse


class TaskApplicationBase(BaseModel):
    cover_letter: Optional[str] = Field(
        default=None,
        description="Сопроводительное письмо работника",
        max_length=2000,
    )
    has_experience: Optional[bool] = False


class TaskApplicationCreate(TaskApplicationBase):
    pass


class TaskApplicationStatusUpdate(BaseModel):
    status: str
    decline_reason: Optional[str] = None


class TaskApplicationAttendanceUpdate(BaseModel):
    action: str  # worker_confirm_start, employer_confirm_start, worker_confirm_finish, employer_confirm_finish, report_no_show


class TaskApplicationResponse(TaskApplicationBase):
    id: int
    task_id: int
    worker_id: int
    employer_id: int
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    accepted_at: Optional[datetime] = None
    rejected_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    worker_confirmed_start_at: Optional[datetime] = None
    employer_confirmed_start_at: Optional[datetime] = None
    worker_confirmed_finish_at: Optional[datetime] = None
    employer_confirmed_finish_at: Optional[datetime] = None
    payout_amount: int
    commission_amount: int
    payout_status: str
    payout_available_at: Optional[datetime] = None
    notify_10h_sent_at: Optional[datetime] = None
    notify_1h_sent_at: Optional[datetime] = None
    worker: Optional[UserResponse] = None

    class Config:
        from_attributes = True

