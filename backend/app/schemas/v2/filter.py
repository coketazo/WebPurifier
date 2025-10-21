from pydantic import BaseModel, Field
from typing import List

class FilterRequest(BaseModel):
    text: str = Field(..., description="필터링을 검사할 텍스트")
    threshold: float = Field(default=0.75, ge=0.0, le=1.0, description="유사도 임계값 (이 값 이상이면 필터링)")

class MatchedCategoryInfo(BaseModel):
    id: int
    name: str
    similarity: float # 실제 계산된 유사도

class FilterResponse(BaseModel):
    should_filter: bool = Field(..., description="필터링 필요 여부")
    matched_categories: List[MatchedCategoryInfo] = Field(..., description="임계값을 넘은 카테고리 목록")