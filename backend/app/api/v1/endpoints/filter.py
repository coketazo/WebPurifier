from fastapi import APIRouter
from app.schemas.filter import FilterRequest, FilterResponse
from app.services.v1.filter import detectCategory

router = APIRouter()


@router.post("/")
def filter(form: FilterRequest) -> FilterResponse:
    return detectCategory(form)
