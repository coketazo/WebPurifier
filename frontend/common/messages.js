// 확장 프로그램 내부에서 사용하는 메시지 타입 상수들을 정의한 객체
// background.js, content_script.js, popup.js 등 서로 다른 스크립트 간의 통신에 사용됨
export const MSG = {
  // content_script가 background에 "페이지의 텍스트를 필터링해 달라"는 요청을 보낼 때 사용
  PROCESS_PAGE_TEXT: "PROCESS_PAGE_TEXT",

  // background가 content_script에 "이 인덱스의 텍스트를 블러 처리하라"는 명령을 보낼 때 사용
  FILTER_TEXTS: "FILTER_TEXTS",

  // 사용자가 필터링 기능을 활성화했을 때, background가 모든 탭에 필터 활성 메시지를 보낼 때 사용
  ENABLE_FILTERING: "ENABLE_FILTERING",

  // 사용자가 필터링 기능을 비활성화했을 때, background가 모든 탭에 필터 비활성 메시지를 보낼 때 사용
  DISABLE_FILTERING: "DISABLE_FILTERING"
};
