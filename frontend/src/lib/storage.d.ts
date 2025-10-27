import type { StoredConfig } from "../types/storage";
export declare function loadConfig(): Promise<StoredConfig>;
export declare function saveConfig(config: StoredConfig): Promise<void>;
export declare function updateConfig(updater: (prev: StoredConfig) => StoredConfig): Promise<StoredConfig>;
export declare function subscribeConfigChanges(callback: (config: StoredConfig) => void): () => void;
