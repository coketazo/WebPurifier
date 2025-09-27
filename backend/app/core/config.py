from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    app_name: str = "WebPurifier API"
    debug: bool = False
    host: str = "0.0.0.0"
    port: int = 8000
    
    # CORS settings
    allowed_origins: List[str] = ["chrome-extension://*", "http://localhost:3000"]
    
    class Config:
        env_file = ".env"

settings = Settings()