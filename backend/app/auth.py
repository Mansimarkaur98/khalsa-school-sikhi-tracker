from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models
from app.config import settings
from app.database import get_db

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def hash_password(plain_password: str) -> str:
    return pwd_context.hash(plain_password)


def create_access_token(sub: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=settings.jwt_expiry_hours)
    payload = {"sub": sub, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> str:
    """
    FastAPI dependency — every protected route depends on this.
    MVP has one shared account, so this just confirms the token is valid,
    not tied to any per-user row.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(credentials.credentials, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        return username
    except JWTError:
        raise credentials_exception


@dataclass
class CurrentUserContext:
    identifier: str
    role: str
    school_id: Optional[int]

    @property
    def is_admin(self) -> bool:
        return self.role == "admin"


def get_current_user_context(
    current_user: str = Depends(get_current_user), db: Session = Depends(get_db)
) -> CurrentUserContext:
    """
    Resolves the authenticated identifier (JWT sub) to a role + school. Signed-up
    accounts get their row's role/school_id; the shared staff login (or any legacy
    row with no email) has no school of its own and is never an admin.
    """
    user = db.execute(select(models.User).where(models.User.email == current_user)).scalar_one_or_none()
    if user:
        return CurrentUserContext(identifier=current_user, role=user.role, school_id=user.school_id)
    return CurrentUserContext(identifier=current_user, role="teacher", school_id=None)


def require_admin(ctx: CurrentUserContext = Depends(get_current_user_context)) -> CurrentUserContext:
    if not ctx.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return ctx
