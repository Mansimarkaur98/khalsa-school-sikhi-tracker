from fastapi import APIRouter, HTTPException, status

from app.auth import verify_password, create_access_token
from app.config import settings
from app.schemas import LoginRequest, TokenResponse

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest):
    # MVP: one shared username/password, checked against env-configured values —
    # not a users-table lookup yet, though the table exists for the future multi-user path.
    if payload.username != settings.app_username or not verify_password(
        payload.password, settings.app_password_hash
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    token = create_access_token()
    return TokenResponse(access_token=token)
