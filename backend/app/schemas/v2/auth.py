from pydantic import BaseModel, Field


class SignupRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, description="고유 사용자 이름")
    password: str = Field(..., min_length=8, max_length=128, description="로그인 비밀번호")


class SignupResponse(BaseModel):
    id: int
    username: str
    access_token: str
    token_type: str = "bearer"
    message: str = "User created successfully."


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, description="고유 사용자 이름")
    password: str = Field(..., min_length=8, max_length=128, description="로그인 비밀번호")


class LoginResponse(BaseModel):
    id: int
    username: str
    access_token: str
    token_type: str = "bearer"
    message: str = "Login successful."
