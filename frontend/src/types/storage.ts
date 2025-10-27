// chrome.storage.sync에 보관하는 데이터 구조 정의
import type { AuthenticatedUser } from "./auth";
import type { CategoryResponse } from "./category";

export interface StoredConfig {
  apiBaseUrl: string;
  isEnabled: boolean;
  token?: string;
  user?: AuthenticatedUser;
  categories?: CategoryResponse[];
}

export const DEFAULT_API_BASE_URL = "http://localhost:8000";
export const STORAGE_KEY = "webpurifier_config";
