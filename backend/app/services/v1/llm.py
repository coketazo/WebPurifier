from google import genai
from app.core.config import settings
from typing import Any


# 설정 파일에서 API 키를 가져와 genai.Client 구성
client = genai.Client(api_key=settings.GEMINI_API_KEY)


def generate_text(
    content: str,
    prompt: str,
    model: str = "gemini-2.5-flash-lite",
    respSchema: Any = None,
) -> Any:
    """
    주어진 프롬프트, 콘텐츠, 모델을 기반으로 Gemini Developer API를 이용하여 텍스트를 생성합니다.

    `content` : 콘텐츠

    `prompt` : 어떤 형식으로 답변을 하고 `content`를 다룰지 명시하는 시스템 인스트럭션

    `model` : 요청할 gemini 모델 (default: "gemini-2.5-flash-lite")

    `respSchema` : 구조화된 출력 명시
    """

    try:
        config: dict[str, Any] = {}
        config["system_instruction"] = prompt
        if respSchema is not None:
            # 구조화 출력 사용
            config["response_mime_type"] = "application/json"
            config["response_schema"] = respSchema

        resp = client.models.generate_content(
            model=model,
            contents=content,
            config=config if config else None,  # type: ignore
        )
        if respSchema is not None:
            return resp.parsed
        return (resp.text or "").strip()
    except Exception as e:
        raise RuntimeError(f"Gemini text generation failed: {e}") from e
