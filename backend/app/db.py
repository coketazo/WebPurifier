from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

# 1. 데이터베이스 연결 엔진 생성
engine = create_engine(settings.DATABASE_URL)

# 2. 데이터베이스 세션 생성기(Factory) 만들기
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 3. SQLAlchemy 모델의 Base 클래스 (models.py 에서도 사용)
Base = declarative_base()

# 4. 의존성 주입 함수: get_db 구현
def get_db():
    db = SessionLocal() # 요청마다 새 DB 세션 생성
    try:
        yield db # API 함수에 세션 제공
    finally:
        db.close() # 요청 처리 후 세션 닫기 (자원 반환)

# Base.metadata.create_all(bind=engine) # 직접 테이블 생성 (Alembic 사용 권장)  // 참고용