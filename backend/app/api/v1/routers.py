from fastapi import APIRouter
from app.api.v1.endpoints import filter

router = APIRouter()
router.include_router(filter.router, prefix="/filter", tags=["Filter"])
