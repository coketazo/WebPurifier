import type { StoredConfig } from "./storage";
export type RuntimeMessage = {
    type: "CONFIG_UPDATED";
    payload: StoredConfig;
} | {
    type: "REQUEST_CONTENT_REFRESH";
};
