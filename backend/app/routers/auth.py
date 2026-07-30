import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models
from app.auth import create_access_token, get_current_user, hash_password, verify_password
from app.config import settings
from app.database import get_db
from app.email_utils import send_activation_email, send_password_reset_email
from app.schemas import (
    CurrentUserResponse,
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    ResendVerificationRequest,
    ResetPasswordRequest,
    SignupRequest,
    SignupResponse,
    TokenResponse,
)

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

VERIFY_TOKEN_TTL_HOURS = 24
RESET_TOKEN_TTL_HOURS = 1


def _issue_verify_token(user: models.User) -> str:
    token = secrets.token_urlsafe(32)
    user.email_verify_token = token
    user.email_verify_token_expires = datetime.now(timezone.utc) + timedelta(hours=VERIFY_TOKEN_TTL_HOURS)
    return token


def _is_expired(expires_at) -> bool:
    if expires_at is None:
        return True
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    return expires_at < datetime.now(timezone.utc)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    # Shared staff login (env-configured), kept alongside individual signed-up accounts.
    if payload.username == settings.app_username and verify_password(
        payload.password, settings.app_password_hash
    ):
        return TokenResponse(access_token=create_access_token(settings.app_username))

    user = db.execute(
        select(models.User).where(models.User.email == payload.username)
    ).scalar_one_or_none()
    if user and verify_password(payload.password, user.password_hash):
        if not user.email_verified:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Please verify your email before logging in. Check your inbox for the activation link.",
            )
        return TokenResponse(access_token=create_access_token(user.email))

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect username or password",
    )


@router.post("/signup", response_model=SignupResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    existing = db.execute(
        select(models.User).where(models.User.email == payload.email)
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    user = models.User(
        username=payload.email,
        first_name=payload.first_name,
        last_name=payload.last_name,
        school=payload.school,
        email=payload.email,
        password_hash=hash_password(payload.password),
        email_verified=False,
    )
    token = _issue_verify_token(user)
    db.add(user)
    db.commit()

    send_activation_email(user.email, user.first_name, token)

    return SignupResponse(
        message="Account created. Check your email for an activation link before logging in.",
        email=user.email,
    )


@router.get("/verify-email", response_model=TokenResponse)
def verify_email(token: str, db: Session = Depends(get_db)):
    user = db.execute(
        select(models.User).where(models.User.email_verify_token == token)
    ).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or already-used activation link")

    if _is_expired(user.email_verify_token_expires):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This activation link has expired")

    user.email_verified = True
    user.email_verify_token = None
    user.email_verify_token_expires = None
    db.commit()

    return TokenResponse(access_token=create_access_token(user.email))


@router.post("/resend-verification", response_model=SignupResponse)
def resend_verification(payload: ResendVerificationRequest, db: Session = Depends(get_db)):
    user = db.execute(
        select(models.User).where(models.User.email == payload.email)
    ).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No account found for that email")
    if user.email_verified:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This account is already verified")

    token = _issue_verify_token(user)
    db.commit()
    send_activation_email(user.email, user.first_name, token)

    return SignupResponse(message="A new activation link has been sent.", email=user.email)


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.execute(
        select(models.User).where(models.User.email == payload.email)
    ).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No account found for that email")

    token = secrets.token_urlsafe(32)
    user.password_reset_token = token
    user.password_reset_token_expires = datetime.now(timezone.utc) + timedelta(hours=RESET_TOKEN_TTL_HOURS)
    db.commit()

    send_password_reset_email(user.email, user.first_name, token)

    return MessageResponse(message="A password reset link has been sent to your email.")


@router.post("/reset-password", response_model=TokenResponse)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.execute(
        select(models.User).where(models.User.password_reset_token == payload.token)
    ).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or already-used reset link")

    if _is_expired(user.password_reset_token_expires):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This reset link has expired")

    user.password_hash = hash_password(payload.new_password)
    user.password_reset_token = None
    user.password_reset_token_expires = None
    db.commit()

    return TokenResponse(access_token=create_access_token(user.email))


@router.get("/me", response_model=CurrentUserResponse)
def get_me(current_user: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.execute(
        select(models.User).where(models.User.email == current_user)
    ).scalar_one_or_none()

    if user and user.first_name and user.last_name:
        return CurrentUserResponse(
            first_name=user.first_name,
            last_name=user.last_name,
            display_name=f"{user.first_name} {user.last_name}",
        )

    # Shared staff login (or a legacy account with no name on file) — fall back to the username.
    return CurrentUserResponse(display_name=current_user)
