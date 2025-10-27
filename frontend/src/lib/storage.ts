import { DEFAULT_API_BASE_URL, STORAGE_KEY } from "../types/storage";
import type { StoredConfig } from "../types/storage";

// chrome.storage.sync에서 설정을 읽어오는 함수
export async function loadConfig(): Promise<StoredConfig> {
  return new Promise((resolve) => {
    chrome.storage.sync.get([STORAGE_KEY], (result: Record<string, unknown>) => {
      const config = result[STORAGE_KEY] as StoredConfig | undefined;
      if (config) {
        resolve(config);
        return;
      }
      resolve({
        apiBaseUrl: DEFAULT_API_BASE_URL,
        isEnabled: false
      });
    });
  });
}

// 전체 설정을 저장하는 함수
export async function saveConfig(config: StoredConfig): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ [STORAGE_KEY]: config }, () => resolve());
  });
}

// 특정 필드만 갱신하는 헬퍼 함수
export async function updateConfig(
  updater: (prev: StoredConfig) => StoredConfig
): Promise<StoredConfig> {
  const current = await loadConfig();
  const next = updater(current);
  await saveConfig(next);
  return next;
}

// storage 변경 이벤트를 구독할 수 있도록 리스너를 감싼 함수
export function subscribeConfigChanges(
  callback: (config: StoredConfig) => void
): () => void {
  const listener = (
    changes: Record<string, chrome.storage.StorageChange>,
    _areaName: string
  ) => {
    if (changes[STORAGE_KEY]?.newValue) {
      callback(changes[STORAGE_KEY].newValue as StoredConfig);
    }
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
