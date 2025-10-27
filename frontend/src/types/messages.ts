import type { StoredConfig } from "./storage";

// 런타임 메시지 타입 정의
export type RuntimeMessage =
  | {
      type: "CONFIG_UPDATED";
      payload: StoredConfig;
    }
  | {
      type: "REQUEST_CONTENT_REFRESH";
    };
