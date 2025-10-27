import { loadConfig } from "./storage";
// 공통 Fetch 옵션 준비
async function callApi(path, init = {}, configOverride) {
    const config = configOverride ?? (await loadConfig());
    const url = new URL(path, config.apiBaseUrl).toString();
    const headers = new Headers(init.headers ?? {});
    headers.set("Content-Type", "application/json");
    if (!init.skipAuth && config.token) {
        headers.set("Authorization", `Bearer ${config.token}`);
    }
    const response = await fetch(url, {
        ...init,
        headers,
        body: init.body,
        method: init.method ?? "GET"
    });
    if (!response.ok) {
        const message = await safeReadError(response);
        throw new Error(message);
    }
    if (response.status === 204) {
        return undefined;
    }
    return (await response.json());
}
// 에러 응답에서 메시지를 추출하는 함수
async function safeReadError(response) {
    try {
        const data = await response.json();
        if (typeof data?.detail === "string") {
            return data.detail;
        }
        if (typeof data?.message === "string") {
            return data.message;
        }
    }
    catch (_) {
        // JSON 파싱 실패 시 무시하고 아래 fallback 사용
    }
    return `API 요청 실패 (status ${response.status})`;
}
export async function signup(payload) {
    return callApi("/api/v2/auth/signup", {
        method: "POST",
        body: JSON.stringify(payload),
        skipAuth: true
    });
}
export async function login(payload) {
    return callApi("/api/v2/auth/login", {
        method: "POST",
        body: JSON.stringify(payload),
        skipAuth: true
    });
}
export async function createCategory(payload, configOverride) {
    return callApi("/api/v2/category", {
        method: "POST",
        body: JSON.stringify(payload)
    }, configOverride);
}
export async function listCategories(configOverride) {
    return callApi("/api/v2/category", {
        method: "GET"
    }, configOverride);
}
export async function filterText(payload, configOverride) {
    return callApi("/api/v2/filter", {
        method: "POST",
        body: JSON.stringify(payload)
    }, configOverride);
}
export async function submitFeedback(payload, configOverride) {
    return callApi("/api/v2/feedback", {
        method: "POST",
        body: JSON.stringify(payload)
    }, configOverride);
}
