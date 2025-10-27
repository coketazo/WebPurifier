import { loadConfig, saveConfig, subscribeConfigChanges } from "../lib/storage";
import type { RuntimeMessage } from "../types/messages";
import { DEFAULT_API_BASE_URL } from "../types/storage";

// 확장 설치/업데이트 시 기본 설정을 초기화
chrome.runtime.onInstalled.addListener(async () => {
  const current = await loadConfig();
  if (!current.apiBaseUrl) {
    await saveConfig({
      ...current,
      apiBaseUrl: DEFAULT_API_BASE_URL,
      isEnabled: false
    });
  }
});

// storage 변경을 감지해 콘텐츠 스크립트에 최신 설정을 전달
subscribeConfigChanges((config) => {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (tab.id !== undefined) {
        const message: RuntimeMessage = {
          type: "CONFIG_UPDATED",
          payload: config
        };
        chrome.tabs.sendMessage(tab.id, message);
      }
    });
  });
});
