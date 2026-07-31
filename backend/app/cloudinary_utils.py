from urllib.parse import urlparse

import cloudinary
import cloudinary.uploader
import cloudinary.utils

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


def _photo_public_id(student_id: str) -> str:
    return f"khalsa_school/student_photos/{student_id}"


def upload_student_photo(file_bytes: bytes, student_id: str) -> str:
    """Uploads a photo to Cloudinary as a private ("authenticated") asset —
    student photos are minors' data, so they must never be reachable by
    guessing/enumerating a student_id in a public CDN URL. Returns the raw
    secure_url for storage only; it's unusable without a signature, so reads
    always go through get_student_photo_url() to mint a fresh signed link."""
    result = cloudinary.uploader.upload(
        file_bytes,
        folder="khalsa_school/student_photos",
        public_id=student_id,
        overwrite=True,
        resource_type="image",
        type="authenticated",
    )
    return result["secure_url"]


def get_student_photo_url(student_id: str) -> str:
    """Mints a freshly signed URL for a student's photo. Only our backend
    (holder of the Cloudinary API secret) can produce a valid signature, so a
    guessed or enumerated student_id can no longer be used to view a child's
    photo without going through our own authenticated API first."""
    url, _ = cloudinary.utils.cloudinary_url(
        _photo_public_id(student_id),
        resource_type="image",
        type="authenticated",
        sign_url=True,
        secure=True,
    )
    return url


def delete_student_photo(student_id: str) -> None:
    """Best-effort removal of a student's photo from Cloudinary. Never raises —
    clearing the DB reference is what matters; an orphaned Cloudinary asset is
    a minor cleanup issue, not worth failing the request over."""
    try:
        cloudinary.uploader.destroy(
            _photo_public_id(student_id), resource_type="image", type="authenticated"
        )
    except Exception:
        pass
