from pydantic import BaseModel


class Content(BaseModel):
    id: int
    text: str


class Option(BaseModel):
    categories: list[str]
    strength: int


class FilterRequest(BaseModel):
    contents: list[Content]
    option: Option
