from app.services.v1.llm import generate_text
from app.schemas.filter import FilterRequest, FilterResponse


def detectCategory(req: FilterRequest) -> FilterResponse:
    """genai api를 이용해 주어진 카테고리와 텍스트의 유사도를 평가하는 filter v1"""

    prompt = f"""
당신은 텍스트 검사기 입니다.
텍스트 리스트와 카테고리 리스트가 주어집니다.
당신의 역할은 카테고리가 포함된 텍스트를 구해서 리스트로 반환하는 것 입니다.

입력 형식은 다음과 같습니다(json schema):
{FilterRequest.model_json_schema()}

입력/출력 예시:
입력:
{{
  "contents": [
	  {{
		  "idx": 0,
		  "text": "이 문장은 깨끗합니다."
      }},
		{{
	    "idx": 1,
	    "text": "<정치적으로 민감할 수 있는 문장>"
        }},
	  {{
		  "idx": 2,
		  "text": "<외모 비하하는 글>"
      }}
  ],
  "option": {{
    "categories": ["정치", "외모"],
    "strength": 3
  }}
}}

출력:
{{
	"detectedContents": [
		{{
			"idx": 1,
			"category": "정치"
		}},
		{{
			"idx": 2,
			"category": "외모"
		}}
	]
}}
"""
    req_str = req.model_dump_json()
    resp = generate_text(prompt=prompt, content=req_str, respSchema=FilterResponse)
    return resp
