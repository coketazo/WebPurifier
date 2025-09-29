from fastapi import APIRouter
from app.schemas.filter import FilterRequest

router = APIRouter()


# TODO: filter 기능 구현, api 라우팅
@router.post("/")
def filter(form: FilterRequest):
    return {"mock": True, "received": form}
