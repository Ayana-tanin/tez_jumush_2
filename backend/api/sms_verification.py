from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from core.sms import sms_service, normalize_kg_phone
from schemas.sms_verification import (
    SMSVerificationRequest, 
    SMSVerificationConfirm, 
    SMSVerificationResponse,
    SMSVerificationStatus
)
from models.sms_verification import SMSVerification
from config import SMS_CODE_EXPIRE_MINUTES, SMS_MAX_ATTEMPTS

router = APIRouter()

@router.post("/send-code", response_model=SMSVerificationResponse)
async def send_verification_code(
    request: SMSVerificationRequest, 
    db: Session = Depends(get_db)
):
    """Отправляет SMS код подтверждения на указанный номер"""
    
    print(f"[API DEBUG] Получен запрос на отправку SMS: {request.phone}")
    
    # Проверяем формат номера телефона (базовая валидация)
    try:
        phone = normalize_kg_phone(request.phone)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Неверный формат номера телефона. Используйте +996XXXXXXXXX"
        )
    
    print(f"[API DEBUG] Обработанный номер: {phone}")
    
    if len(phone) < 10:
        print(f"[API ERROR] Неверный формат номера: {phone}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Неверный формат номера телефона"
        )
    
    # Проверяем, есть ли активная верификация
    existing = sms_service.get_verification_status(db, phone)
    if existing and not existing.is_expired() and not existing.is_verified:
        print(f"[API ERROR] Активная верификация уже существует для {phone}")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Код уже отправлен. Попробуйте через {SMS_CODE_EXPIRE_MINUTES} минут"
        )
    
    # Создаем новую запись верификации
    print(f"[API DEBUG] Создаем запись верификации для {phone}")
    verification = sms_service.create_verification_record(db, phone)
    
    # Отправляем SMS
    print(f"[API DEBUG] Отправляем SMS с кодом {verification.code}")
    if sms_service.send_sms(phone, verification.code):
        print(f"[API SUCCESS] SMS успешно отправлен для {phone}")
        return SMSVerificationResponse(
            message="Код подтверждения отправлен на ваш номер телефона",
            expires_in_minutes=SMS_CODE_EXPIRE_MINUTES
        )
    else:
        print(f"[API ERROR] Ошибка отправки SMS для {phone}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка отправки SMS. Попробуйте позже"
        )

@router.post("/verify-code")
async def verify_code(
    request: SMSVerificationConfirm,
    db: Session = Depends(get_db)
):
    """Проверяет код подтверждения"""
    
    try:
        phone = normalize_kg_phone(request.phone)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Неверный формат номера телефона. Используйте +996XXXXXXXXX"
        )
    
    code = request.code.strip()
    
    if len(code) != 4 or not code.isdigit():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Код должен содержать 4 цифры"
        )
    
    if sms_service.verify_code(db, phone, code):
        return {"message": "Номер телефона успешно подтвержден", "verified": True}
    else:
        # Получаем информацию о попытках
        verification = sms_service.get_verification_status(db, phone)
        if verification:
            attempts_left = SMS_MAX_ATTEMPTS - verification.attempts
            if attempts_left <= 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Превышено максимальное количество попыток. Запросите новый код"
                )
            elif verification.is_expired():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Код истек. Запросите новый код"
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Неверный код. Осталось попыток: {attempts_left}"
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Код не найден. Запросите новый код"
            )

@router.get("/status/{phone}", response_model=SMSVerificationStatus)
async def get_verification_status(
    phone: str,
    db: Session = Depends(get_db)
):
    """Получает статус верификации номера телефона"""
    
    try:
        phone = normalize_kg_phone(phone)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Неверный формат номера телефона. Используйте +996XXXXXXXXX"
        )
    
    verification = sms_service.get_verification_status(db, phone)
    
    if not verification:
        return SMSVerificationStatus(
            is_verified=False,
            attempts_left=SMS_MAX_ATTEMPTS
        )
    
    attempts_left = SMS_MAX_ATTEMPTS - verification.attempts
    if verification.is_expired():
        attempts_left = SMS_MAX_ATTEMPTS
    
    return SMSVerificationStatus(
        is_verified=verification.is_verified,
        attempts_left=max(0, attempts_left),
        expires_at=verification.expires_at if not verification.is_verified else None
    )
