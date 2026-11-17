from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, validator


class WalletTopUpRequest(BaseModel):
    amount: int = Field(gt=0, description="Сумма пополнения в сомах")
    payment_method: str = Field(
        description="Метод пополнения (mbank, optima, mega, etc.)", max_length=50
    )
    reference: Optional[str] = Field(
        default=None, description="ID транзакции внешней системы", max_length=100
    )

    @validator("payment_method")
    def validate_payment_method(cls, value: str) -> str:
        allowed_methods = {"mbank", "optima", "megapay"}
        normalized = value.strip().lower()
        if normalized not in allowed_methods:
            raise ValueError(
                "Неверный способ пополнения. Доступны: mBank, Optima, MegaPay."
            )
        return normalized


class WalletTransactionResponse(BaseModel):
    id: int
    type: str
    amount: int
    status: str
    details: Optional[str] = None
    created_at: datetime
    processed_at: Optional[datetime] = None
    available_at: Optional[datetime] = None
    task_id: Optional[int] = None
    application_id: Optional[int] = None

    class Config:
        from_attributes = True

