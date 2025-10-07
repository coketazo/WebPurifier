// 확장 프로그램의 기본 설정값을 정의한 상수 객체
// 사용자가 아직 설정을 변경하지 않았을 때 적용되는 초기 상태
export const DEFAULT_SETTINGS = {
  isEnabled: true,        // 필터링 기능의 기본 상태 (true면 활성화)
  strength: "2",          // 필터 강도 기본값 (문자열 형태, 나중에 숫자로 변환됨)
  method: "block",        // 필터링 방식 (예: 'block', 'blur' 등)
  selectedTopics: []      // 사용자가 선택한 민감 주제 카테고리 (기본적으로 비어 있음)
};

// chrome.storage.local에 저장된 설정을 불러오는 함수
// 반환값: Promise 객체 (settings와 customTopics를 포함한 데이터)
export function getSettings() {
  return new Promise(resolve => {
    chrome.storage.local.get(
      {
        settings: DEFAULT_SETTINGS, // 기본 설정값
        customTopics: []            // 사용자 정의 주제 (직접 추가한 필터 주제 등)
      },
      data => resolve({ ...data })  // 스토리지에서 불러온 데이터를 resolve로 반환
    );
  });
}

// 새로운 설정값을 chrome.storage.local에 저장하는 함수
// s: 새로운 settings 객체
// c: 새로운 customTopics 배열
// 반환값: Promise 객체 (저장이 완료되면 resolve 호출)
export function setSettings(s, c) {
  return new Promise(resolve => {
    chrome.storage.local.set(
      {
        settings: s,       // 새로 업데이트할 설정값
        customTopics: c    // 새로 업데이트할 사용자 정의 주제 목록
      },
      () => resolve()      // 저장이 완료되면 resolve 호출
    );
  });
}
