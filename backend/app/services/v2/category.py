import numpy as np
from sqlalchemy.orm import Session

from app.services.v1.llm import generate_text # Gemini 호출 함수
from app.services.v2.embedding import sbert_model # SBERT 모델 객체
from app.v2.models import Category # SQLAlchemy 모델
from app.schemas.v2.category import CategoryResponse # 반환 타입용 스키마

# LLM이 예시 문장 생성 실패 시 사용할 에러
class ExampleGenerationError(Exception):
    pass

def create_category(
    db: Session, user_id: int, name: str, keywords: list[str], description: str | None = None
) -> Category:
    """사용자 키워드 기반으로 LLM을 이용해 대표 벡터를 생성하고 DB에 저장"""

    if not sbert_model:
        raise RuntimeError("SBERT model is not loaded.")

    # --- 1단계 & 2단계: LLM으로 예시 문장 생성 및 자체 선별 ---
    prompt_for_examples_and_selection = f"""
    당신은 텍스트 필터링 시스템을 위한 예시 문장 생성기입니다.
    '{", ".join(keywords)}' 키워드와 '{name}' 주제와 관련된, 필터링이 필요할 만한 다양한 스타일의 문장 20개를 생성한 후,
    그 중에서 주제를 가장 잘 대표하는 문장 5개만 골라서 번호 없이 한 줄에 하나씩 최종 결과로 출력해 주세요.
    """
    try:
        # LLM 호출 시 응답 스키마를 지정하지 않으므로 일반 텍스트로 받음
        selected_sentences_text = generate_text(content="", prompt=prompt_for_examples_and_selection)
        final_sentences = selected_sentences_text.strip().split('\n')
        print("LLM이 생성/선별한 예시 문장들:", final_sentences)
        
        # 생성된 문장이 비어있거나 유효하지 않은 경우 에러 발생
        if not final_sentences or not final_sentences[0] or len(final_sentences) < 3: # 최소 3개 이상은 생성되어야 함
             raise ExampleGenerationError("LLM이 유효한 예시 문장을 충분히 생성하지 못했습니다.")
        
        # 빈 줄 제거
        final_sentences = [s for s in final_sentences if s.strip()]

    except Exception as e:
        # LLM 호출 관련 에러 처리
        print(f"LLM 호출 중 에러 발생: {e}")
        raise ExampleGenerationError(f"LLM 예시 생성 실패: {e}") from e


    # --- 3단계: 대표 벡터 생성 ---
    try:
        embeddings = sbert_model.encode(final_sentences)
        representative_vector = np.mean(embeddings, axis=0)
    except Exception as e:
        # SBERT 인코딩 에러 처리
        print(f"SBERT 인코딩 중 에러 발생: {e}")
        raise RuntimeError(f"대표 벡터 생성 실패: {e}") from e

    # --- 4단계: 데이터베이스에 저장 ---
    try:
        new_category = Category(
            user_id=user_id,
            name=name,
            description=description,
            embedding=representative_vector.tolist() # NumPy 배열을 리스트로 변환
        )
        db.add(new_category)
        db.commit()
        db.refresh(new_category)
        
        print(f"'{name}' 카테고리 생성 완료. ID: {new_category.id}")
        return new_category
    except Exception as e:
        # DB 저장 에러 처리
        db.rollback() # 오류 발생 시 롤백
        print(f"DB 저장 중 에러 발생: {e}")
        raise RuntimeError(f"카테고리 DB 저장 실패: {e}") from e


def list_user_categories(db: Session, user_id: int) -> list[Category]:
    """특정 사용자의 카테고리 목록 반환"""
    return (
        db.query(Category)
        .filter(Category.user_id == user_id)
        .order_by(Category.created_at.desc())
        .all()
    )
