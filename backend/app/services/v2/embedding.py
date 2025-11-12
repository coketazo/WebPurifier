from sentence_transformers import SentenceTransformer
from app.core.config import settings

# 사용할 모델 이름
MODEL_NAME = settings.SBERT_MODEL_NAME

# FastAPI 서버 시작 시 모델 로드 (시간이 걸릴 수 있음)
print(f"Loading Embedding model: {MODEL_NAME}...")
try:
    sbert_model = SentenceTransformer(MODEL_NAME, trust_remote_code=True)
    print("SBERT model loaded successfully.")
except Exception as e:
    print(f"Error loading SBERT model: {e}")
    # 에러 처리 로직 추가 필요
    sbert_model = None

# 다른 서비스에서 이 sbert_model 변수를 import 하여 사용
