import cloudinary
import cloudinary.uploader

from app.config import settings

# cloudinary.config() reads CLOUDINARY_URL from the environment automatically
# when it's set — but we load it explicitly from our own settings object so
# it's consistent with how every other credential in this app is managed.
cloudinary.config(cloudinary_url=settings.cloudinary_url)

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
