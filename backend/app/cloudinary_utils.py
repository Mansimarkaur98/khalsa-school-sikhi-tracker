from urllib.parse import urlparse

import cloudinary
import cloudinary.uploader

from app.config import settings

# cloudinary.config(cloudinary_url=...) does NOT parse the URL — the SDK only
# extracts cloud_name/api_key/api_secret from a CLOUDINARY_URL it finds in
# os.environ at import time. Since our credential lives in settings (loaded
# from .env via pydantic, never exported to the OS environment), we parse it
# ourselves and pass the pieces directly.
_parsed_cloudinary_url = urlparse(settings.cloudinary_url)
cloudinary.config(
    cloud_name=_parsed_cloudinary_url.hostname,
    api_key=_parsed_cloudinary_url.username,
    api_secret=_parsed_cloudinary_url.password,
)

MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024  # 5MB, per FR-2
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png"}


def upload_student_photo(file_bytes: bytes, student_id: str) -> str:
    """Uploads a photo to Cloudinary, returns the secure_url to store on the student."""
    result = cloudinary.uploader.upload(
        file_bytes,
        folder="khalsa_school/student_photos",
        public_id=student_id,
        overwrite=True,
        resource_type="image",
    )
    return result["secure_url"]


def delete_student_photo(student_id: str) -> None:
    """Best-effort removal of a student's photo from Cloudinary. Never raises —
    clearing the DB reference is what matters; an orphaned Cloudinary asset is
    a minor cleanup issue, not worth failing the request over."""
    try:
        cloudinary.uploader.destroy(f"khalsa_school/student_photos/{student_id}")
    except Exception:
        pass
