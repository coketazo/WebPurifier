import { DEFAULT_API_BASE_URL, STORAGE_KEY } from "../types/storage";
// chrome.storage.sync에서 설정을 읽어오는 함수
export async function loadConfig() {
    return new Promise((resolve) => {
        chrome.storage.sync.get([STORAGE_KEY], (result) => {
            const config = result[STORAGE_KEY];
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
export async function saveConfig(config) {
    return new Promise((resolve) => {
        chrome.storage.sync.set({ [STORAGE_KEY]: config }, () => resolve());
    });
}
// 특정 필드만 갱신하는 헬퍼 함수
export async function updateConfig(updater) {
    const current = await loadConfig();
    const next = updater(current);
    await saveConfig(next);
    return next;
}
// storage 변경 이벤트를 구독할 수 있도록 리스너를 감싼 함수
export function subscribeConfigChanges(callback) {
    const listener = (changes, _areaName) => {
        if (changes[STORAGE_KEY]?.newValue) {
            callback(changes[STORAGE_KEY].newValue);
        }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
}
