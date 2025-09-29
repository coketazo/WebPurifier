from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Union, List


class Settings(BaseSettings):
    # .env 파일에서 읽어올 변수들을 여기에 정의합니다.
    # 대소문자를 구분하지 않습니다.

    # CORS 설정
    CORS_ORIGINS: Union[str, List[str]] = []

    # .env 파일 읽도록 설정
    model_config = SettingsConfigDict(env_file=".env")


settings = Settings()
