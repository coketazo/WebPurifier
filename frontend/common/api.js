// 로컬 백엔드 서버의 필터링 API 주소
const BACKEND_URL = "http://127.0.0.1:8000/api/v1/filter";

// 지정된 시간(ms)이 지나면 fetch 요청을 자동으로 취소(abort)하는 함수
// ms: 제한 시간(밀리초)
// controller: AbortController 객체
// 반환값: setTimeout의 타이머 ID
function withTimeout(ms, controller) {
  return setTimeout(() => controller.abort(), ms);
}

// 백엔드에 텍스트 필터링을 요청하고 결과를 반환하는 비동기 함수
// contents: 페이지에서 추출된 텍스트 배열
// opt: 필터링 옵션 (예: { categories: [...], strength: 2 })
// 반환값: 필터링 결과(JSON 객체)
export async function filterContents(contents, opt) {
  // 요청을 취소할 수 있도록 AbortController 생성
  const controller = new AbortController();

  // 5초(5000ms) 후에 요청을 자동으로 취소하는 타이머 설정
  const timeout = withTimeout(5000, controller);

  try {
    // 백엔드 서버로 POST 요청 전송
    const response = await fetch(BACKEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json", // 요청 본문이 JSON 형식임을 명시
      },
      body: JSON.stringify({
        contents,   // 필터링할 텍스트 데이터
        option: opt // 필터링 옵션 (선택된 주제, 강도 등)
      }),
      signal: controller.signal, // AbortController와 연결하여 요청 취소 가능하게 설정
    });

    // 요청이 끝나면 타이머 해제 (중복 취소 방지)
    clearTimeout(timeout);

    // 응답 상태 코드가 200~299 범위가 아니라면 오류 발생
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    // 응답을 JSON 형식으로 파싱
    const json = await response.json().catch(() => ({}));

    // JSON 데이터가 유효하지 않다면 오류 발생
    if (!json || typeof json !== "object")
      throw new Error("Invalid JSON");

    // 정상적인 JSON 결과를 반환
    return json;

  } finally {
    // 요청 성공, 실패와 관계없이 항상 타이머 해제
    clearTimeout(timeout);
  }
}
