from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from api.auth import get_current_user
from database import get_db
from models.user import User
from models.wallet_transaction import WalletTransaction
from schemas.wallet import WalletTopUpRequest, WalletTransactionResponse
from services.wallet import immediate_top_up, process_due_payouts

router = APIRouter()


@router.post("/topup", response_model=WalletTransactionResponse, status_code=status.HTTP_201_CREATED)
async def top_up_balance(
    payload: WalletTopUpRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.is_banned:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Аккаунт заблокирован. Пополнение баланса недоступно.",
        )

    transaction = immediate_top_up(
        db=db,
        user=current_user,
        amount=payload.amount,
        payment_method=payload.payment_method,
        reference=payload.reference,
    )
    db.commit()
    db.refresh(transaction)
    return transaction


@router.get("/transactions", response_model=List[WalletTransactionResponse])
async def list_transactions(
    skip: int = 0,
    limit: int = Query(50, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    transactions = (
        db.query(WalletTransaction)
        .filter(WalletTransaction.user_id == current_user.id)
        .order_by(WalletTransaction.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return transactions


@router.post("/process-payouts")
async def trigger_payout_processing(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "employer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Только работодатели могут инициировать обработку выплат.",
        )

    processed = process_due_payouts(db)
    db.commit()
    return {"processed": processed}


