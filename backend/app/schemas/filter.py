from pydantic import BaseModel


class Content(BaseModel):
    id: int
    text: str


class Option(BaseModel):
    categories: list[str]
    strength: int


class FilterRequest(BaseModel):
    """filter request schema"""

    contents: list[Content]
    option: Option


class DetectedContent(BaseModel):
    idx: int
    category: str


class FilterResponse(BaseModel):
    """filter response schema"""

    detectedContents: list[DetectedContent]
