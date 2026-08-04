from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    jwt_expiry_hours: int = 8
    cloudinary_url: str

    # "development" (default) leaves the interactive API docs open; set to
    # "production" in the deployed environment to close them off.
    environment: str = "development"

    # Signup account-activation email. Left unset in dev — send_activation_email()
    # falls back to logging the link to the console when these aren't configured.
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    frontend_url: str = "http://localhost:5173"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
