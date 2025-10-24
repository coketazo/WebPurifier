// 메시지 타입 상수 import
import { MSG } from "./common/messages.js";

// 전역 유틸 함수 가져오기
const { collectTexts, debounce } = window.WPScanner;
const { applyBlurByIds } = window.WPApply;

/**
 * 페이지 텍스트를 수집하고 백그라운드 스크립트로 전송
 */
function sendPageTexts() {
  const texts = collectTexts();
  if (texts.length > 0) {
    chrome.runtime.sendMessage({
      type: MSG.PROCESS_PAGE_TEXT,
      payload: texts
    });
  }
}

/**
 * 사용자 설정 불러오기 및 초기 필터링 적용
 */
function initializeFiltering() {
  chrome.storage.local.get("settings", data => {
    if (data?.settings?.isEnabled) {
      document.body.classList.add("webpurifier-active");
      sendPageTexts();
    }
  });
}

/**
 * 백그라운드/팝업에서 메시지 수신 처리
 */
function setupMessageListener() {
  chrome.runtime.onMessage.addListener(message => {
    if (!message?.type) return;

    switch (message.type) {
      case MSG.FILTER_TEXTS:
        applyBlurByIds(message.payload || []);
        break;
      case MSG.ENABLE_FILTERING:
        document.body.classList.add("webpurifier-active");
        sendPageTexts();
        break;
      case MSG.DISABLE_FILTERING:
        document.body.classList.remove("webpurifier-active");
        break;
    }
  });
}

/**
 * DOM 변화 감지
 */
function setupMutationObserver() {
  const observer = new MutationObserver(debounce(sendPageTexts, 600));
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    characterData: true
  });
}

// 초기화 실행
initializeFiltering();
setupMessageListener();
setupMutationObserver();
