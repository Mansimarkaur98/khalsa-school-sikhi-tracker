import logging
import smtplib
from email.mime.text import MIMEText

from app.config import settings

logger = logging.getLogger(__name__)


def send_activation_email(to_email: str, first_name: str, token: str) -> None:
    link = f"{settings.frontend_url}/verify-email?token={token}"

    if not settings.smtp_username or not settings.smtp_password:
        logger.warning("SMTP not configured — activation link for %s: %s", to_email, link)
        return

    body = f"""\
<p>Hi {first_name},</p>
<p>Thanks for signing up for the Khalsa School Sikhi Progress Tracker.
Click the link below to activate your account:</p>
<p><a href="{link}">{link}</a></p>
<p>This link expires in 24 hours. If you didn't request this, you can ignore this email.</p>
"""
    msg = MIMEText(body, "html")
    msg["Subject"] = "Activate your Khalsa Sikhi Tracker account"
    msg["From"] = settings.smtp_username
    msg["To"] = to_email

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
        server.starttls()
        server.login(settings.smtp_username, settings.smtp_password)
        server.sendmail(settings.smtp_username, [to_email], msg.as_string())
