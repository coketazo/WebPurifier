import type { AuthenticatedUser } from "./auth";
import type { CategoryResponse } from "./category";
export interface StoredConfig {
    apiBaseUrl: string;
    isEnabled: boolean;
    token?: string;
    user?: AuthenticatedUser;
    categories?: CategoryResponse[];
}
export declare const DEFAULT_API_BASE_URL = "http://localhost:8000";
export declare const STORAGE_KEY = "webpurifier_config";
