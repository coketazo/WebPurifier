from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from app.core.config import settings
from app.api.v1.routers import router as api_v1_router

from mangum import Mangum


app = FastAPI(root_path=(f"/{settings.STAGE}" if settings.STAGE else ""))

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


@app.get("/")
def read_root(request: Request):
    # request 객체에서 root_path를 가져와 완전한 URL을 만듭니다.
    root_path = request.scope.get("root_path", "")
    return RedirectResponse(url=f"{root_path}/docs")
