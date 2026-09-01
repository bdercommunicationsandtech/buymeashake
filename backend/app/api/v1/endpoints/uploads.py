from fastapi import APIRouter, File, UploadFile

from app.api.dependencies import CurrentAthlete, CurrentUser
from app.schemas.dtos import UploadFileResponse
from app.services.core_services import StorageService

router = APIRouter()


@router.post("/uploads/image", response_model=UploadFileResponse)
async def upload_image(
    file: UploadFile = File(...),
    user: CurrentUser = None,
) -> UploadFileResponse:
    """Sube una imagen de avatar, portada o logo (JPEG, PNG, WEBP)."""
    file_bytes = await file.read()
    return await StorageService.save_image(
        file_bytes, file.filename or "image.png", file.content_type or "image/png"
    )


@router.post("/uploads/product", response_model=UploadFileResponse)
async def upload_digital_product_file(
    file: UploadFile = File(...),
    athlete: CurrentAthlete = None,
) -> UploadFileResponse:
    """Sube un archivo de producto digital (PDF, ZIP de rutinas)."""
    file_bytes = await file.read()
    return await StorageService.save_product_file(
        file_bytes, file.filename or "file.pdf", file.content_type or "application/pdf"
    )
