from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class TaskReviewCreate(BaseModel):
    rating: float = Field(ge=1.0, le=5.0)
    comment: Optional[str] = Field(default=None, max_length=2000)


class TaskReviewResponse(TaskReviewCreate):
    id: int
    task_id: int
    application_id: Optional[int] = None
    employer_id: int
    worker_id: int
    created_at: datetime

    class Config:
        from_attributes = True

