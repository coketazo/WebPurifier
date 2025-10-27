interface CategoryInfo {
    id: number;
    name: string;
    description?: string;
}
interface StoredConfig {
    apiBaseUrl: string;
    isEnabled: boolean;
    token?: string;
    categories?: CategoryInfo[];
}
interface FilterRequest {
    text: string;
    threshold: number;
}
interface MatchedCategoryInfo {
    id: number;
    name: string;
    similarity: number;
}
interface FilterResponse {
    should_filter: boolean;
    matched_categories: MatchedCategoryInfo[];
}
type FeedbackType = "reinforce" | "weaken";
interface FeedbackRequest {
    text_content: string;
    category_id: number;
    feedback_type: FeedbackType;
}
interface FeedbackResponse {
    message: string;
    category_id: number;
    new_log_id: number;
}
type RuntimeMessage = {
    type: "CONFIG_UPDATED";
    payload: StoredConfig;
} | {
    type: "REQUEST_CONTENT_REFRESH";
};
declare const STORAGE_KEY = "webpurifier_config";
declare const DEFAULT_API_BASE_URL = "http://localhost:8000";
declare function loadConfig(): Promise<StoredConfig>;
declare function subscribeConfigChanges(callback: (config: StoredConfig) => void): void;
declare function filterText(payload: FilterRequest, config: StoredConfig): Promise<FilterResponse>;
declare function sendFeedback(payload: FeedbackRequest, config: StoredConfig): Promise<FeedbackResponse>;
declare function parseApiError(response: Response, fallback: string): Promise<string>;
declare function getErrorMessage(error: unknown): string;
declare const filterCache: Map<string, FilterResponse>;
declare const inflightRequests: Map<string, Promise<FilterResponse>>;
declare function getFilterResult(text: string, config: StoredConfig): Promise<FilterResponse>;
declare const DEFAULT_THRESHOLD = 0.75;
declare const KOREAN_REGEX: RegExp;
declare const BLUR_CLASS = "webpurifier-blur";
declare const PENDING_CLASS = "webpurifier-pending";
declare const FEEDBACK_PANEL_CLASS = "webpurifier-feedback-panel";
declare const FEEDBACK_SELECT_CLASS = "webpurifier-feedback-select";
declare const FEEDBACK_BUTTON_CLASS = "webpurifier-feedback-button";
declare const FEEDBACK_STATUS_CLASS = "webpurifier-feedback-status";
declare const FEEDBACK_SUCCESS_TIMEOUT = 2500;
declare const SELECTION_BUTTON_CLASS = "webpurifier-selection-button";
declare const SELECTION_PANEL_CLASS = "webpurifier-selection-panel";
declare const SELECTION_SELECT_CLASS = "webpurifier-selection-select";
declare const SELECTION_STATUS_CLASS = "webpurifier-selection-status";
declare const SELECTION_PREVIEW_CLASS = "webpurifier-selection-preview";
declare const SELECTION_MIN_LENGTH = 6;
declare const MIN_TEXT_LENGTH = 6;
declare const DEBOUNCE_MS = 150;
declare const MAX_CONCURRENT_REQUESTS = 6;
declare const VIEWPORT_MARGIN = 200;
declare let currentConfig: StoredConfig | null;
declare let observer: MutationObserver | null;
declare let styleInjected: boolean;
declare const processedText: WeakMap<Text, string>;
declare const blurredElements: Set<Element>;
declare const pendingElements: Set<Element>;
declare let isProcessing: boolean;
declare const debounceTimers: WeakMap<Text, number>;
declare let activeRequests: number;
declare const highPriorityQueue: Text[];
declare const lowPriorityQueue: Text[];
declare function getQueueLength(): number;
declare function dequeueNode(): Text | undefined;
declare function isNodeHighPriority(node: Text): boolean;
interface FeedbackContext {
    element: Element;
    overlay: HTMLElement;
    select: HTMLSelectElement;
    status: HTMLSpanElement;
    weakenBtn: HTMLButtonElement;
    text: string;
    categories: MatchedCategoryInfo[];
    isSending: boolean;
    statusTimer?: number;
}
declare const feedbackContextMap: WeakMap<Element, FeedbackContext>;
declare const feedbackContextSet: Set<FeedbackContext>;
declare let feedbackListenersAttached: boolean;
declare let selectionButton: HTMLButtonElement | null;
declare let selectionPanel: HTMLElement | null;
declare let selectionSelect: HTMLSelectElement | null;
declare let selectionStatus: HTMLSpanElement | null;
declare let selectionPreview: HTMLSpanElement | null;
declare let selectionSendButton: HTMLButtonElement | null;
declare let selectionCurrentText: string | null;
declare let selectionIsSending: boolean;
declare let selectionStatusTimer: number | undefined;
declare let selectionListenersAttached: boolean;
declare let selectionAnchorRect: DOMRect | null;
declare function init(): Promise<void>;
declare function applyConfig(config: StoredConfig): void;
declare function ensureStyle(): void;
declare function startObserver(): void;
declare function stopObserver(): void;
declare function rescanDocument(): void;
declare function scanNode(node: Node): void;
declare function enqueueNode(node: Text): void;
declare function queueNode(node: Text): void;
declare function processQueue(): void;
declare function evaluateNode(node: Text): Promise<void>;
declare function applyBlur(element: Element | null, text: string, categories: MatchedCategoryInfo[]): void;
declare function removeBlur(element: Element | null): void;
declare function cleanupBlur(): void;
declare function findBlurTarget(element: Element | null): Element | null;
declare function markPending(element: Element | null): void;
declare function clearPending(element: Element | null): void;
declare function clearAllPending(): void;
declare function ensureSelectionControls(): void;
declare function attachSelectionListeners(): void;
declare function detachSelectionListeners(): void;
declare function handleSelectionChange(): void;
declare function handleSelectionMouseUp(): void;
declare function handleSelectionViewportChange(): void;
declare function handleSelectionKeyDown(event: KeyboardEvent): void;
declare function handleSelectionOutsideClick(event: MouseEvent): void;
declare function showSelectionButton(rect: DOMRect): void;
declare function updateSelectionButtonPosition(): void;
declare function openSelectionPanel(): void;
declare function populateSelectionCategories(categories: CategoryInfo[]): void;
declare function positionSelectionPanel(): void;
declare function hideSelectionControls(): void;
declare function closeSelectionPanel(): void;
declare function scheduleSelectionStatusClear(): void;
declare function submitSelectionFeedback(): Promise<void>;
declare function isSelectionWithinBlurred(selection: Selection): boolean;
declare function isNodeWithinBlurred(node: Node | null): boolean;
declare function getSelectionRect(selection: Selection): DOMRect | null;
declare function attachFeedbackControls(element: Element, text: string, categories: MatchedCategoryInfo[]): void;
declare function updateFeedbackSelect(context: FeedbackContext): void;
declare function positionFeedbackOverlay(context: FeedbackContext): void;
declare function refreshFeedbackOverlayPositions(): void;
declare function ensureFeedbackListeners(): void;
declare function teardownFeedbackListeners(): void;
declare function detachFeedback(element: Element): void;
declare function clearAllFeedback(): void;
declare function handleFeedbackSubmission(context: FeedbackContext, type: FeedbackType): Promise<void>;
declare function setFeedbackBusy(context: FeedbackContext, active: boolean): void;
declare function scheduleStatusClear(context: FeedbackContext): void;
declare function getSelectedCategoryId(context: FeedbackContext): number | null;
declare function cleanupRemovedNode(node: Node): void;
