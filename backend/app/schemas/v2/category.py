from pydantic import BaseModel

class CategoryCreateRequest(BaseModel):
    name: str  # 예: "게임 스포일러"
    keywords: list[str]  # 예: ["롤", "결승", "스포", "패배"]
    description: str | None = None # 설명은 선택 사항

class CategoryResponse(BaseModel):
    id: int
    name: str
    description: str | None
    # embedding은 반환하지 않음 (내부 데이터)

    class Config:
        from_attributes = True # SQLAlchemy 모델을 Pydantic 스키마로 변환 허용

class CategoryDeleteRequest(BaseModel):
    id: int  # 삭제할 카테고리 ID

class CategoryDeleteResponse(BaseModel):
    id: int  # 삭제된 카테고리 ID
    message: str  # 예: "카테고리를 삭제했습니다."
