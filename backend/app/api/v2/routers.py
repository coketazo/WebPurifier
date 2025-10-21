from fastapi import APIRouter
from app.api.v2.endpoints import auth, category, filter, feedback

router = APIRouter()
router.include_router(auth.router, prefix="/auth", tags=["Auth"])
router.include_router(category.router, prefix="/category", tags=["Category"])
router.include_router(filter.router, prefix="/filter", tags=["v2/Filter"])
router.include_router(feedback.router, prefix="/feedback", tags=["Feedback"])
