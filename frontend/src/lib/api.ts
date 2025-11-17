// 백엔드 FastAPI 엔드포인트를 호출하는 공용 유틸리티 모듈
import type {
  LoginRequest,
  LoginResponse,
  SignupRequest,
  SignupResponse
} from "../types/auth";
import type {
  CategoryCreateRequest,
  CategoryResponse,
  CategoryDeleteResponse
} from "../types/category";
import type { FilterRequest, FilterResponse } from "../types/filter";
import { loadConfig } from "./storage";
import type { StoredConfig } from "../types/storage";
import type { FeedbackRequest, FeedbackResponse } from "../types/feedback";

// 공통 Fetch 옵션 준비
async function callApi<T>(
  path: string,
  init: RequestInit & { skipAuth?: boolean } = {},
  configOverride?: StoredConfig
): Promise<T> {
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
    return undefined as T;
  }

  return (await response.json()) as T;
}

// 에러 응답에서 메시지를 추출하는 함수
async function safeReadError(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (typeof data?.detail === "string") {
      return data.detail;
    }
    if (typeof data?.message === "string") {
      return data.message;
    }
  } catch (_) {
    // JSON 파싱 실패 시 무시하고 아래 fallback 사용
  }
  return `API 요청 실패 (status ${response.status})`;
}

export async function signup(payload: SignupRequest): Promise<SignupResponse> {
  return callApi<SignupResponse>("/api/v2/auth/signup", {
    method: "POST",
    body: JSON.stringify(payload),
    skipAuth: true
  });
}

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  return callApi<LoginResponse>("/api/v2/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
    skipAuth: true
  });
}

export async function createCategory(
  payload: CategoryCreateRequest,
  configOverride?: StoredConfig
): Promise<CategoryResponse> {
  return callApi<CategoryResponse>(
    "/api/v2/category",
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    configOverride
  );
}

export async function listCategories(
  configOverride?: StoredConfig
): Promise<CategoryResponse[]> {
  return callApi<CategoryResponse[]>(
    "/api/v2/category",
    {
      method: "GET"
    },
    configOverride
  );
}

export async function deleteCategory(
  categoryId: number,
  configOverride?: StoredConfig
): Promise<CategoryDeleteResponse> {
  return callApi<CategoryDeleteResponse>(
    "/api/v2/category",
    {
      method: "DELETE",
      body: JSON.stringify({ id: categoryId })
    },
    configOverride
  );
}

export async function filterText(
  payload: FilterRequest,
  configOverride?: StoredConfig
): Promise<FilterResponse> {
  return callApi<FilterResponse>(
    "/api/v2/filter",
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    configOverride
  );
}

export async function submitFeedback(
  payload: FeedbackRequest,
  configOverride?: StoredConfig
): Promise<FeedbackResponse> {
  return callApi<FeedbackResponse>(
    "/api/v2/feedback",
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    configOverride
  );
}
