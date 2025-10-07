//  메시지 정의, 사용자 설정, 필터 API 함수 불러오기
import { MSG } from "../common/messages.js";       // 확장 프로그램 내부에서 사용하는 메시지 타입 상수들
import { getSettings } from "../common/storage.js"; // chrome.storage에 저장된 사용자 설정을 불러오는 함수
import { filterContents } from "../common/api.js";  // 백엔드 API로 텍스트 필터링 요청을 보내는 함수

// content_script.js로부터 메시지를 수신하는 리스너 등록
chrome.runtime.onMessage.addListener((message, sender) => {
  // 메시지의 type이 “페이지 내 텍스트를 필터링하라”인 경우에만 처리
  if (message?.type === MSG.PROCESS_PAGE_TEXT) {

    // 1️⃣ chrome.storage에 저장된 최신 사용자 설정을 불러옴
    getSettings().then(({ settings }) => {
      // 만약 필터링 기능이 꺼져 있다면 (isEnabled=false) 아무 작업도 하지 않음
      if (!settings?.isEnabled) return;

      // 2️⃣ 백엔드 필터링 요청에 사용할 옵션 구성
      const options = {
        categories: settings.selectedTopics,         // 사용자가 선택한 필터 주제 (예: 폭력, 선정성 등)
        strength: parseInt(settings.strength, 10),   // 필터 강도(문자열 → 숫자 변환)
      };

      // 3️⃣ 실제 필터링 요청: 감지된 텍스트 인덱스를 받아옴
      filterContents(message.payload, options)
        .then(response => {
          // 감지된 콘텐츠(detectedContents)의 idx 값을 Set으로 모아 중복 제거
          const ids = new Set((response?.detectedContents || []).map(d => d.idx));

          // 메시지를 보낸 탭 ID가 유효한지 확인
          if (!sender?.tab?.id) return;

          // 4️⃣ 감지된 텍스트 인덱스 목록을 content_script.js로 다시 전송
          chrome.tabs.sendMessage(sender.tab.id, {
            type: MSG.FILTER_TEXTS,     // “이 텍스트들을 블러 처리하라”는 메시지
            payload: [...ids],          // Set → 배열로 변환
          });
        })
        // 백엔드 호출 중 오류 발생 시 콘솔에 출력
        .catch(err => console.error("[WebPurifier] backend error:", err));
    });
  }
});

// ✅ 사용자 설정이 변경될 때(예: ON/OFF 토글, 주제 변경 등) 자동으로 반영하기 위한 리스너
chrome.storage.onChanged.addListener(changes => {
  // settings 객체가 변경된 경우에만 실행
  if (changes.settings) {
    // 새 설정에서 isEnabled 값 확인 (true면 필터 활성화)
    const isEnabled = !!changes.settings.newValue?.isEnabled;

    // 현재 열린 모든 탭을 가져옴
    chrome.tabs.query({}, tabs => {
      for (const tab of tabs) {
        // 각 탭에 필터 활성화/비활성화 메시지 전송
        chrome.tabs.sendMessage(tab.id, {
          type: isEnabled ? MSG.ENABLE_FILTERING : MSG.DISABLE_FILTERING,
        });
      }
    });
  }
});
