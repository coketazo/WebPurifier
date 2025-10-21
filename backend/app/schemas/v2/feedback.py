from pydantic import BaseModel, Field
from typing import Literal

# weaken: 약화 피드백 reinforce: 강화 피드백
FeedbackType = Literal["reinforce", "weaken"]

class FeedbackRequest(BaseModel):
    text_content: str = Field(..., min_length=1, description="피드백 대상 텍스트")
    category_id: int = Field(..., description="연관된 카테고리 ID")
    feedback_type: FeedbackType = Field(..., description="피드백 유형")

class FeedbackResponse(BaseModel):
    message: str
    category_id: int
    new_log_id: int # 생성된 FeedbackLog의 ID
