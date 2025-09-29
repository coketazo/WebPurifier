from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from app.core.config import settings

from app.api.v1.routers import router as api_v1_router

app = FastAPI()

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
def read_root():
    return RedirectResponse(url="/docs")
