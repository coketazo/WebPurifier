from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from app.core.config import settings
from app.api.v1.routers import router as api_v1_router
from app.api.v2.routers import router as api_v2_router
from contextlib import asynccontextmanager
from app.db import Base
from app.db import engine
from app.v2 import models

from mangum import Mangum


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 애플리케이션 시작 시 db 테이블 생성
    Base.metadata.create_all(bind=engine)
    yield
    # 종료 시 수행할 작업이 있으면 여기에 추가


app = FastAPI(
    root_path=(f"/{settings.STAGE}" if settings.STAGE else ""), lifespan=lifespan
)

# Mangum 핸들러 생성
handler = Mangum(app)

origins = settings.CORS_ORIGINS or []

if origins:
    # "*" 단독일 때는 credentials 허용 불가
    allow_creds = not (len(origins) == 1 and origins[0] == "*")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=allow_creds,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(api_v1_router, prefix="/api/v1")
app.include_router(api_v2_router, prefix="/api/v2")


@app.get("/")
def read_root(request: Request):
    # request 객체에서 root_path를 가져와 완전한 URL을 만듭니다.
    root_path = request.scope.get("root_path", "")
    return RedirectResponse(url=f"{root_path}/docs")
