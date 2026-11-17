from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models.message import Message
from models.user import User
from schemas.message import MessageCreate, MessageResponse
from api.auth import get_current_user

router = APIRouter()

@router.get("/", response_model=List[MessageResponse])
async def get_messages(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    messages = db.query(Message).filter(
        Message.task_id == task_id,
        (Message.sender_id == current_user.id) | (Message.receiver_id == current_user.id)
    ).order_by(Message.timestamp).all()
    return messages

@router.post("/", response_model=MessageResponse)
async def create_message(
    message: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_message = Message(
        **message.dict(),
        sender_id=current_user.id
    )
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    return db_message
