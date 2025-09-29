from fastapi import APIRouter
from app.schemas.filter import FilterRequest, FilterResponse

router = APIRouter()


# TODO: filter 기능 구현, api 라우팅
@router.post("/")
def filter(form: FilterRequest) -> FilterResponse:
    return {"mock": True, "received": form}
