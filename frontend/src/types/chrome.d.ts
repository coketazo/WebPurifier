// Chrome 확장 관련 최소 타입 정의 (필요한 부분만 선별)
declare namespace chrome {
  namespace storage {
    interface StorageChange {
      oldValue?: unknown;
      newValue?: unknown;
    }

    namespace sync {
      function get(
        keys: string[] | string | Record<string, unknown>,
        callback: (items: Record<string, unknown>) => void
      ): void;

      function set(items: Record<string, unknown>, callback?: () => void): void;
    }

    const onChanged: {
      addListener(
        callback: (changes: Record<string, StorageChange>, areaName: string) => void
      ): void;
      removeListener(
        callback: (changes: Record<string, StorageChange>, areaName: string) => void
      ): void;
    };
  }

  namespace runtime {
    interface MessageSender {
      tab?: { id?: number };
    }

    function sendMessage(message: unknown): void;

    const onMessage: {
      addListener(
        callback: (
          message: unknown,
          sender: MessageSender,
          sendResponse: (response?: unknown) => void
        ) => void
      ): void;
      removeListener(
        callback: (
          message: unknown,
          sender: MessageSender,
          sendResponse: (response?: unknown) => void
        ) => void
      ): void;
    };

    const onInstalled: {
      addListener(callback: (details: { reason: string }) => void): void;
    };
  }

  namespace tabs {
    function query(
      queryInfo: { active?: boolean; currentWindow?: boolean } | Record<string, unknown>,
      callback: (tabs: Array<{ id?: number }>) => void
    ): void;

    function sendMessage(tabId: number, message: unknown): void;
  }
}
