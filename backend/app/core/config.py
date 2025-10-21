from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Union, List


class Settings(BaseSettings):
    # .env 파일에서 읽어올 변수들을 여기에 정의합니다.
    # 대소문자를 구분하지 않습니다.

    # .env 파일 읽도록 설정
    model_config = SettingsConfigDict(env_file=".env")

    # CORS 설정
    CORS_ORIGINS: Union[str, List[str]] = []

    GEMINI_API_KEY: str
    DATABASE_URL: str
    SBERT_MODEL_NAME: str
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60


settings = Settings()
