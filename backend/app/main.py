from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import purifier

app = FastAPI(
    title="WebPurifier API",
    description="Backend API for WebPurifier Chrome Extension",
    version="1.0.0"
)

# Configure CORS for Chrome extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["chrome-extension://*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(purifier.router, prefix="/api/v1", tags=["purifier"])

@app.get("/")
async def root():
    return {"message": "WebPurifier API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}