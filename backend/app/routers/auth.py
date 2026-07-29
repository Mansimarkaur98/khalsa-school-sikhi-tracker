import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models
from app.auth import create_access_token, hash_password, verify_password
from app.config import settings
from app.database import get_db
from app.email_utils import send_activation_email
from app.schemas import (
    LoginRequest,
    ResendVerificationRequest,
    SignupRequest,
    SignupResponse,
    TokenResponse,
)

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

VERIFY_TOKEN_TTL_HOURS = 24


def _issue_verify_token(user: models.User) -> str:
    token = secrets.token_urlsafe(32)
    user.email_verify_token = token
    user.email_verify_token_expires = datetime.now(timezone.utc) + timedelta(hours=VERIFY_TOKEN_TTL_HOURS)
    return token


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

    expires_at = user.email_verify_token_expires
    if expires_at is not None and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at is None or expires_at < datetime.now(timezone.utc):
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
