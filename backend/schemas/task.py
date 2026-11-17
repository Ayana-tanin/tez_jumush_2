from pydantic import BaseModel, validator
from typing import Optional
from datetime import date, time, datetime

class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    price: int
    count_people: int = 1
    date: date
    time_from: time
    time_to: time
    address: str
    district: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[int] = None
    count_people: Optional[int] = None
    date: Optional[date] = None
    time_from: Optional[time] = None
    time_to: Optional[time] = None
    address: Optional[str] = None
    district: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    status: Optional[str] = None
    reserved_budget: Optional[int] = None

class TaskResponse(TaskBase):
    id: int
    user_id: int
    status: str
    reserved_budget: int
    auto_release_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

    @validator("price")
    def validate_price(cls, value: int) -> int:
        if value <= 0:
            raise ValueError("Оплата за одного человека должна быть положительной")
        return value

    @validator("count_people")
    def validate_count_people(cls, value: int) -> int:
        if value <= 0:
            raise ValueError("Количество работников должно быть больше нуля")
        return value
