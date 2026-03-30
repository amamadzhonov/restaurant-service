from __future__ import annotations

from pathlib import Path
from urllib.parse import urlparse

from fastapi import UploadFile

from app.core.config import get_settings

settings = get_settings()


def ensure_media_root() -> Path:
    media_root = Path(settings.MEDIA_ROOT)
    media_root.mkdir(parents=True, exist_ok=True)
    return media_root


def build_media_url(relative_path: str) -> str:
    return f"{settings.MEDIA_BASE_URL.rstrip('/')}/{relative_path.lstrip('/')}"


async def save_menu_item_image(tenant_slug: str, item_id: str, upload: UploadFile) -> str:
    ensure_media_root()
    suffix = Path(upload.filename or "upload.bin").suffix.lower() or ".bin"
    relative_path = Path("menu-items") / tenant_slug / f"{item_id}{suffix}"
    destination = ensure_media_root() / relative_path
    destination.parent.mkdir(parents=True, exist_ok=True)
    content = await upload.read()
    destination.write_bytes(content)
    return relative_path.as_posix()


def delete_media_url(url: str | None) -> None:
    if not url:
        return

    parsed = urlparse(url)
    base_parsed = urlparse(settings.MEDIA_BASE_URL)
    if parsed.scheme and (
        parsed.scheme != base_parsed.scheme
        or parsed.netloc != base_parsed.netloc
        or not parsed.path.startswith(base_parsed.path)
    ):
        return

    relative_path = parsed.path.replace(base_parsed.path.rstrip("/") + "/", "", 1).lstrip("/")
    if not relative_path:
        return

    target = (ensure_media_root() / relative_path).resolve()
    media_root = ensure_media_root().resolve()
    if media_root not in target.parents and target != media_root:
        return
    if target.exists():
        target.unlink()
