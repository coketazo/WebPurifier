"use strict";
const STORAGE_KEY = "webpurifier_config";
const DEFAULT_API_BASE_URL = "http://localhost:8000";
// chrome.storage.sync에서 설정 값을 불러온다
async function loadConfig() {
    return new Promise((resolve) => {
        chrome.storage.sync.get([STORAGE_KEY], (result) => {
            const stored = result[STORAGE_KEY];
            if (stored) {
                resolve(stored);
            }
            else {
                resolve({ apiBaseUrl: DEFAULT_API_BASE_URL, isEnabled: false });
            }
        });
    });
}
// storage 변경을 구독하여 설정 변경을 전달받는다
function subscribeConfigChanges(callback) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== "sync") {
            return;
        }
        const updated = changes[STORAGE_KEY]?.newValue;
        if (updated) {
            callback(updated);
        }
    });
}
// 필터 API 호출 로직 (fetch 기반)
async function filterText(payload, config) {
    const baseUrl = config.apiBaseUrl || DEFAULT_API_BASE_URL;
    const url = new URL("/api/v2/filter/", baseUrl).toString();
    const headers = new Headers({ "Content-Type": "application/json" });
    if (config.token) {
        headers.set("Authorization", `Bearer ${config.token}`);
    }
    const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        throw new Error(`필터 API 호출 실패: ${response.status}`);
    }
    return (await response.json());
}
async function sendFeedback(payload, config) {
    const baseUrl = config.apiBaseUrl || DEFAULT_API_BASE_URL;
    const url = new URL("/api/v2/feedback/", baseUrl).toString();
    const headers = new Headers({ "Content-Type": "application/json" });
    if (config.token) {
        headers.set("Authorization", `Bearer ${config.token}`);
    }
    const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        const fallback = `피드백 API 호출 실패: ${response.status}`;
        const message = await parseApiError(response, fallback);
        throw new Error(message);
    }
    return (await response.json());
}
async function parseApiError(response, fallback) {
    try {
        const data = await response.json();
        if (typeof data.detail === "string") {
            return data.detail;
        }
        if (typeof data.message === "string") {
            return data.message;
        }
    }
    catch (_error) {
        // ignore JSON parse errors and fallback
    }
    return fallback;
}
function getErrorMessage(error) {
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
}
// 동일한 텍스트에 대한 요청을 캐시하여 서버 부하를 줄인다
const filterCache = new Map();
const inflightRequests = new Map();
const inflightResolvers = new Map();
const batchQueue = [];
let batchTimer = null;
let batchInFlight = false;
const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 25;
function getConfigKey(config) {
    return `${config.apiBaseUrl || DEFAULT_API_BASE_URL}|${config.token ?? ""}`;
}
function createFallbackResult(text) {
    return {
        text,
        should_filter: false,
        matched_categories: [],
    };
}
function scheduleBatchFlush() {
    if (batchQueue.length === 0) {
        return;
    }
    if (batchQueue.length >= BATCH_SIZE) {
        void flushBatchQueue();
        return;
    }
    if (batchTimer !== null) {
        return;
    }
    batchTimer = window.setTimeout(() => {
        batchTimer = null;
        void flushBatchQueue();
    }, BATCH_DELAY_MS);
}
async function flushBatchQueue() {
    if (batchInFlight || batchQueue.length === 0) {
        return;
    }
    if (batchTimer !== null) {
        clearTimeout(batchTimer);
        batchTimer = null;
    }
    const first = batchQueue.shift();
    if (!first) {
        return;
    }
    const configKey = getConfigKey(first.config);
    const batch = [first];
    for (let i = 0; i < batchQueue.length && batch.length < BATCH_SIZE;) {
        if (getConfigKey(batchQueue[i].config) === configKey) {
            batch.push(batchQueue.splice(i, 1)[0]);
        }
        else {
            i += 1;
        }
    }
    const texts = batch.map((item) => item.text);
    const config = first.config;
    batchInFlight = true;
    try {
        console.log("[WebPurifier] 필터 요청(batch)", {
            count: texts.length,
            threshold: DEFAULT_THRESHOLD,
            url: config.apiBaseUrl || DEFAULT_API_BASE_URL,
        });
        const response = await filterText({
            texts,
            threshold: DEFAULT_THRESHOLD,
        }, config);
        response.results.forEach((result, index) => {
            const targetText = texts[index];
            const normalized = result ?? createFallbackResult(targetText);
            filterCache.set(targetText, normalized);
            console.log("[WebPurifier] 필터 응답", {
                text: targetText.slice(0, 60),
                shouldFilter: normalized.should_filter,
                matched: normalized.matched_categories.map((item) => item.name),
            });
            const resolver = inflightResolvers.get(targetText);
            if (resolver) {
                resolver.resolve(normalized);
                inflightResolvers.delete(targetText);
            }
            inflightRequests.delete(targetText);
        });
        // 응답에 매칭이 없을 경우 개별 fallback 적용
        texts.forEach((targetText) => {
            if (!filterCache.has(targetText)) {
                const fallback = createFallbackResult(targetText);
                filterCache.set(targetText, fallback);
                const resolver = inflightResolvers.get(targetText);
                if (resolver) {
                    resolver.resolve(fallback);
                    inflightResolvers.delete(targetText);
                }
                inflightRequests.delete(targetText);
            }
        });
    }
    catch (error) {
        console.error("[WebPurifier] 필터 요청 실패(batch)", error);
        texts.forEach((targetText) => {
            inflightRequests.delete(targetText);
            const resolver = inflightResolvers.get(targetText);
            if (resolver) {
                resolver.reject(error);
                inflightResolvers.delete(targetText);
            }
        });
    }
    finally {
        batchInFlight = false;
        if (batchQueue.length > 0) {
            scheduleBatchFlush();
        }
    }
}
async function getFilterResult(text, config) {
    const cached = filterCache.get(text);
    if (cached) {
        return cached;
    }
    const inflight = inflightRequests.get(text);
    if (inflight) {
        return inflight;
    }
    const requestPromise = new Promise((resolve, reject) => {
        inflightResolvers.set(text, { resolve, reject });
    });
    inflightRequests.set(text, requestPromise);
    batchQueue.push({ text, config });
    scheduleBatchFlush();
    return requestPromise;
}
// 기본 임계값 (백엔드 기본값과 동일하게 0.75 사용)
const DEFAULT_THRESHOLD = 0.6;
const KOREAN_REGEX = /[가-힣]/;
const BLUR_CLASS = "webpurifier-blur";
const PENDING_CLASS = "webpurifier-pending";
const FEEDBACK_PANEL_CLASS = "webpurifier-feedback-panel";
const FEEDBACK_SELECT_CLASS = "webpurifier-feedback-select";
const FEEDBACK_BUTTON_CLASS = "webpurifier-feedback-button";
const FEEDBACK_STATUS_CLASS = "webpurifier-feedback-status";
const FEEDBACK_SUCCESS_TIMEOUT = 2500;
const SELECTION_BUTTON_CLASS = "webpurifier-selection-button";
const SELECTION_PANEL_CLASS = "webpurifier-selection-panel";
const SELECTION_SELECT_CLASS = "webpurifier-selection-select";
const SELECTION_STATUS_CLASS = "webpurifier-selection-status";
const SELECTION_PREVIEW_CLASS = "webpurifier-selection-preview";
const SELECTION_MIN_LENGTH = 6;
// 요청/스캔 최적화 설정
const MIN_TEXT_LENGTH = 6; // 이보다 짧은 텍스트는 무시
const DEBOUNCE_MS = 150; // 동일 노드 텍스트 변동 디바운스 시간
const MAX_CONCURRENT_REQUESTS = 6; // 동시에 진행할 최대 요청 수
const VIEWPORT_MARGIN = 200; // 뷰포트 경계 여유값(px)
let currentConfig = null;
let observer = null;
let styleInjected = false;
const processedText = new WeakMap();
const blurredElements = new Set();
const pendingElements = new Set();
let isProcessing = false;
// 노드별 디바운스 타이머, 진행 중 요청 수
const debounceTimers = new WeakMap();
let activeRequests = 0;
const highPriorityQueue = [];
const lowPriorityQueue = [];
function getQueueLength() {
    return highPriorityQueue.length + lowPriorityQueue.length;
}
function dequeueNode() {
    return highPriorityQueue.shift() ?? lowPriorityQueue.shift();
}
function isNodeHighPriority(node) {
    const target = findBlurTarget(node.parentElement);
    if (!target) {
        return false;
    }
    const rect = target.getBoundingClientRect();
    const extendedTop = -VIEWPORT_MARGIN;
    const extendedBottom = window.innerHeight + VIEWPORT_MARGIN;
    return rect.bottom >= extendedTop && rect.top <= extendedBottom;
}
const feedbackContextMap = new WeakMap();
const feedbackContextSet = new Set();
let feedbackListenersAttached = false;
let selectionButton = null;
let selectionPanel = null;
let selectionSelect = null;
let selectionStatus = null;
let selectionPreview = null;
let selectionSendButton = null;
let selectionCurrentText = null;
let selectionIsSending = false;
let selectionStatusTimer;
let selectionListenersAttached = false;
let selectionAnchorRect = null;
// 최초 실행: 저장소에서 설정을 불러오고 필요 시 감시 시작
init();
// storage 내용을 직접 구독해 설정 변경을 실시간으로 반영
subscribeConfigChanges((config) => {
    applyConfig(config);
});
// 백그라운드에서 설정이 갱신되면 전달받아 처리
chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
    const typedMessage = message;
    if (typedMessage?.type === "CONFIG_UPDATED") {
        applyConfig(typedMessage.payload);
    }
});
async function init() {
    const config = await loadConfig();
    applyConfig(config);
}
function applyConfig(config) {
    currentConfig = config;
    if (!config.isEnabled || !config.token) {
        cleanupBlur();
        stopObserver();
        hideSelectionControls();
        detachSelectionListeners();
        return;
    }
    ensureStyle();
    ensureSelectionControls();
    attachSelectionListeners();
    startObserver();
    rescanDocument();
}
function ensureStyle() {
    if (styleInjected) {
        return;
    }
    const style = document.createElement("style");
    style.textContent = `.${BLUR_CLASS} { filter: blur(6px) !important; transition: filter 0.2s ease-in-out; }
.${PENDING_CLASS} {
  opacity: 0 !important;
  pointer-events: none !important;
  filter: blur(12px) !important;
  transition: opacity 0.2s ease, filter 0.2s ease;
}
.${FEEDBACK_PANEL_CLASS} {
  position: fixed;
  z-index: 2147483647;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  padding: 4px 6px;
  border-radius: 6px;
  background: rgba(20, 20, 20, 0.85);
  color: #fff;
  font-size: 12px;
  line-height: 1.4;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  pointer-events: auto;
  filter: none !important;
}
.${FEEDBACK_PANEL_CLASS} * {
  filter: none !important;
}
.${FEEDBACK_SELECT_CLASS} {
  border: none;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  font-size: 12px;
  border-radius: 4px;
  padding: 2px 4px;
}
.${FEEDBACK_SELECT_CLASS}:focus {
  outline: 1px solid rgba(255, 255, 255, 0.6);
}
.${FEEDBACK_BUTTON_CLASS} {
  border: none;
  border-radius: 4px;
  padding: 3px 6px;
  font-size: 12px;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}
.${FEEDBACK_BUTTON_CLASS}[disabled] {
  opacity: 0.5;
  cursor: not-allowed;
}
.${FEEDBACK_BUTTON_CLASS}[data-type="reinforce"] {
  background: rgba(87, 202, 120, 0.8);
}
.${FEEDBACK_BUTTON_CLASS}[data-type="weaken"] {
  background: rgba(238, 121, 121, 0.8);
}
.${FEEDBACK_STATUS_CLASS} {
  font-size: 11px;
  margin-left: 4px;
}
.${SELECTION_BUTTON_CLASS} {
  position: fixed;
  z-index: 2147483646;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: rgba(87, 202, 120, 0.9);
  color: #111;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  display: none;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}
.${SELECTION_BUTTON_CLASS}:hover {
  background: rgba(87, 202, 120, 1);
}
.${SELECTION_PANEL_CLASS} {
  position: fixed;
  z-index: 2147483646;
  display: none;
  flex-direction: column;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(20, 20, 20, 0.9);
  color: #fff;
  min-width: 240px;
  max-width: 320px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.35);
  filter: none !important;
}
.${SELECTION_PANEL_CLASS} * {
  filter: none !important;
}
.${SELECTION_PREVIEW_CLASS} {
  font-size: 12px;
  line-height: 1.4;
  max-height: 70px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.${SELECTION_SELECT_CLASS} {
  border: none;
  border-radius: 4px;
  padding: 4px 6px;
  font-size: 12px;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}
.${SELECTION_SELECT_CLASS}:focus {
  outline: 1px solid rgba(255, 255, 255, 0.65);
}
.${SELECTION_STATUS_CLASS} {
  font-size: 11px;
  min-height: 14px;
}
.${SELECTION_PANEL_CLASS} button {
  border: none;
  border-radius: 4px;
  padding: 4px 6px;
  font-size: 12px;
  cursor: pointer;
  background: rgba(87, 202, 120, 0.85);
  color: #111;
}
.${SELECTION_PANEL_CLASS} button[disabled] {
  opacity: 0.5;
  cursor: not-allowed;
}`;
    document.head.appendChild(style);
    styleInjected = true;
}
function startObserver() {
    if (observer) {
        return;
    }
    observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === "childList") {
                mutation.addedNodes.forEach((node) => {
                    scanNode(node);
                });
                mutation.removedNodes.forEach((node) => {
                    cleanupRemovedNode(node);
                });
            }
            if (mutation.type === "characterData" &&
                mutation.target instanceof Text) {
                enqueueNode(mutation.target);
            }
        }
    });
    observer.observe(document.body, {
        childList: true,
        characterData: true,
        subtree: true,
    });
}
function stopObserver() {
    observer?.disconnect();
    observer = null;
    highPriorityQueue.length = 0;
    lowPriorityQueue.length = 0;
    isProcessing = false;
    clearAllPending();
}
function rescanDocument() {
    scanNode(document.body);
}
function scanNode(node) {
    if (!currentConfig?.isEnabled || !currentConfig.token) {
        return;
    }
    if (node.nodeType === Node.TEXT_NODE) {
        enqueueNode(node);
        return;
    }
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, {
        acceptNode(textNode) {
            const content = textNode.textContent?.trim();
            if (!content || content.length < MIN_TEXT_LENGTH) {
                return NodeFilter.FILTER_REJECT;
            }
            return KOREAN_REGEX.test(content)
                ? NodeFilter.FILTER_ACCEPT
                : NodeFilter.FILTER_REJECT;
        },
    });
    let next;
    while ((next = walker.nextNode())) {
        enqueueNode(next);
    }
}
function enqueueNode(node) {
    const content = node.textContent?.trim();
    if (!content ||
        content.length < MIN_TEXT_LENGTH ||
        !KOREAN_REGEX.test(content)) {
        return;
    }
    const targetElement = findBlurTarget(node.parentElement);
    markPending(targetElement);
    // 디바운스: 같은 노드 텍스트가 짧은 시간에 여러 번 바뀔 때 1회만 처리
    const prevTimer = debounceTimers.get(node);
    if (prevTimer) {
        clearTimeout(prevTimer);
    }
    const timerId = window.setTimeout(() => {
        debounceTimers.delete(node);
        queueNode(node);
    }, DEBOUNCE_MS);
    debounceTimers.set(node, timerId);
}
function queueNode(node) {
    const flagged = node;
    if (flagged.__webpurifierQueued) {
        return;
    }
    flagged.__webpurifierQueued = true;
    if (isNodeHighPriority(node)) {
        highPriorityQueue.push(node);
    }
    else {
        lowPriorityQueue.push(node);
    }
    processQueue();
}
function processQueue() {
    if (isProcessing)
        return;
    isProcessing = true;
    const pump = () => {
        if (activeRequests >= MAX_CONCURRENT_REQUESTS || getQueueLength() === 0) {
            isProcessing = false;
            return;
        }
        const node = dequeueNode();
        if (!node) {
            isProcessing = false;
            return;
        }
        const flagged = node;
        flagged.__webpurifierQueued = false;
        activeRequests += 1;
        evaluateNode(node)
            .catch((err) => {
            console.error("[WebPurifier] evaluateNode 오류:", err);
        })
            .finally(() => {
            activeRequests -= 1;
            if (getQueueLength() > 0) {
                pump();
            }
            else {
                isProcessing = false;
            }
        });
        if (activeRequests < MAX_CONCURRENT_REQUESTS && getQueueLength() > 0) {
            pump();
        }
    };
    pump();
}
async function evaluateNode(node) {
    const content = node.textContent?.trim();
    if (!content ||
        content.length < MIN_TEXT_LENGTH ||
        !KOREAN_REGEX.test(content)) {
        // 내용이 사라졌다면 이전에 적용했던 블러를 해제
        removeBlur(findBlurTarget(node.parentElement));
        return;
    }
    const truncated = content.slice(0, 1000);
    let targetElement = null;
    try {
        if (!currentConfig) {
            return;
        }
        targetElement = findBlurTarget(node.parentElement);
        if (!targetElement) {
            return;
        }
        markPending(targetElement);
        const previous = processedText.get(node);
        if (previous === truncated) {
            clearPending(targetElement);
            return;
        }
        processedText.set(node, truncated);
        const result = await getFilterResult(truncated, currentConfig);
        clearPending(targetElement);
        if (result.should_filter) {
            applyBlur(targetElement, truncated, result.matched_categories);
        }
        else {
            removeBlur(targetElement);
        }
    }
    catch (error) {
        console.error("WebPurifier 필터 요청 실패", error);
        clearPending(targetElement ?? findBlurTarget(node.parentElement));
    }
}
function applyBlur(element, text, categories) {
    if (!element) {
        return;
    }
    if (blurredElements.has(element)) {
        // 이미 블러 적용된 경우에도 피드백 컨트롤은 최신 데이터로 갱신한다
        attachFeedbackControls(element, text, categories);
        return;
    }
    if (element instanceof HTMLElement) {
        if (!element.dataset.webpurifierOriginalFilter) {
            element.dataset.webpurifierOriginalFilter = element.style.filter || "";
        }
        element.style.filter = "blur(6px)";
    }
    element.classList.add(BLUR_CLASS);
    element.setAttribute("data-webpurifier-blurred", "true");
    const categoryNames = categories.map((item) => item.name);
    if (categoryNames.length > 0) {
        element.setAttribute("title", `필터링된 카테고리: ${categoryNames.join(", ")}`);
    }
    blurredElements.add(element);
    attachFeedbackControls(element, text, categories);
    try {
        console.log("[WebPurifier] 블러 적용", { categories: categoryNames });
    }
    catch { }
}
function removeBlur(element) {
    if (!element) {
        return;
    }
    clearPending(element);
    if (!element.hasAttribute("data-webpurifier-blurred")) {
        return;
    }
    element.classList.remove(BLUR_CLASS);
    element.removeAttribute("data-webpurifier-blurred");
    element.removeAttribute("title");
    if (element instanceof HTMLElement) {
        if (element.dataset.webpurifierOriginalFilter !== undefined) {
            element.style.filter = element.dataset.webpurifierOriginalFilter;
            delete element.dataset.webpurifierOriginalFilter;
        }
        else {
            element.style.removeProperty("filter");
        }
    }
    blurredElements.delete(element);
    detachFeedback(element);
    // 디버깅용: 블러 해제 로그
    try {
        console.log("[WebPurifier] 블러 해제");
    }
    catch { }
}
function cleanupBlur() {
    blurredElements.forEach((element) => {
        element.classList.remove(BLUR_CLASS);
        element.removeAttribute("data-webpurifier-blurred");
        element.removeAttribute("title");
        detachFeedback(element);
    });
    blurredElements.clear();
    clearAllPending();
    clearAllFeedback();
}
function findBlurTarget(element) {
    let current = element;
    let depth = 0;
    while (current && depth < 4) {
        if (current instanceof HTMLElement) {
            return current;
        }
        current = current.parentElement;
        depth += 1;
    }
    return element;
}
function markPending(element) {
    if (!element) {
        return;
    }
    if (blurredElements.has(element) || pendingElements.has(element)) {
        return;
    }
    element.classList.add(PENDING_CLASS);
    element.setAttribute("data-webpurifier-pending", "true");
    pendingElements.add(element);
}
function clearPending(element) {
    if (!element) {
        return;
    }
    if (!pendingElements.has(element)) {
        return;
    }
    pendingElements.delete(element);
    element.classList.remove(PENDING_CLASS);
    element.removeAttribute("data-webpurifier-pending");
}
function clearAllPending() {
    const elements = Array.from(pendingElements);
    elements.forEach((element) => {
        clearPending(element);
    });
}
function ensureSelectionControls() {
    if (!selectionButton) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = SELECTION_BUTTON_CLASS;
        button.textContent = "강";
        button.style.display = "none";
        button.addEventListener("click", () => {
            openSelectionPanel();
        });
        document.body.appendChild(button);
        selectionButton = button;
    }
    if (!selectionPanel) {
        const panel = document.createElement("div");
        panel.className = SELECTION_PANEL_CLASS;
        panel.style.display = "none";
        const preview = document.createElement("span");
        preview.className = SELECTION_PREVIEW_CLASS;
        panel.appendChild(preview);
        selectionPreview = preview;
        const select = document.createElement("select");
        select.className = SELECTION_SELECT_CLASS;
        panel.appendChild(select);
        selectionSelect = select;
        const sendButton = document.createElement("button");
        sendButton.type = "button";
        sendButton.textContent = "강화 피드백 전송";
        panel.appendChild(sendButton);
        selectionSendButton = sendButton;
        const status = document.createElement("span");
        status.className = SELECTION_STATUS_CLASS;
        panel.appendChild(status);
        selectionStatus = status;
        sendButton.addEventListener("click", () => {
            void submitSelectionFeedback();
        });
        document.body.appendChild(panel);
        selectionPanel = panel;
    }
}
function attachSelectionListeners() {
    if (selectionListenersAttached) {
        return;
    }
    document.addEventListener("selectionchange", handleSelectionChange);
    document.addEventListener("mouseup", handleSelectionMouseUp);
    window.addEventListener("scroll", handleSelectionViewportChange, true);
    window.addEventListener("resize", handleSelectionViewportChange);
    document.addEventListener("keydown", handleSelectionKeyDown, true);
    document.addEventListener("mousedown", handleSelectionOutsideClick, true);
    selectionListenersAttached = true;
}
function detachSelectionListeners() {
    if (!selectionListenersAttached) {
        return;
    }
    document.removeEventListener("selectionchange", handleSelectionChange);
    document.removeEventListener("mouseup", handleSelectionMouseUp);
    window.removeEventListener("scroll", handleSelectionViewportChange, true);
    window.removeEventListener("resize", handleSelectionViewportChange);
    document.removeEventListener("keydown", handleSelectionKeyDown, true);
    document.removeEventListener("mousedown", handleSelectionOutsideClick, true);
    selectionListenersAttached = false;
}
function handleSelectionChange() {
    if (!currentConfig?.isEnabled || !currentConfig.token) {
        hideSelectionControls();
        return;
    }
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
        hideSelectionControls();
        return;
    }
    const rawText = selection.toString().trim();
    if (!rawText || rawText.length < SELECTION_MIN_LENGTH) {
        hideSelectionControls();
        return;
    }
    if (isSelectionWithinBlurred(selection)) {
        hideSelectionControls();
        return;
    }
    const rect = getSelectionRect(selection);
    if (!rect) {
        hideSelectionControls();
        return;
    }
    selectionCurrentText = rawText.slice(0, 1000);
    selectionAnchorRect = rect;
    closeSelectionPanel();
    showSelectionButton(rect);
}
function handleSelectionMouseUp() {
    handleSelectionChange();
}
function handleSelectionViewportChange() {
    updateSelectionButtonPosition();
}
function handleSelectionKeyDown(event) {
    if (event.key === "Escape") {
        hideSelectionControls();
    }
}
function handleSelectionOutsideClick(event) {
    if (!selectionPanel || selectionPanel.style.display === "none") {
        return;
    }
    const target = event.target;
    if (!target) {
        return;
    }
    if (selectionPanel.contains(target)) {
        return;
    }
    if (selectionButton && selectionButton.contains(target)) {
        return;
    }
    closeSelectionPanel();
}
function showSelectionButton(rect) {
    if (!selectionButton) {
        return;
    }
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    if (rect.bottom <= 0 ||
        rect.top >= viewportHeight ||
        rect.right <= 0 ||
        rect.left >= viewportWidth) {
        selectionButton.style.display = "none";
        return;
    }
    let top = rect.top - 36;
    if (top < 4) {
        top = rect.bottom + 6;
    }
    let left = rect.right - 14;
    if (left > viewportWidth - 32) {
        left = viewportWidth - 32;
    }
    if (left < 4) {
        left = 4;
    }
    selectionButton.style.display = "flex";
    selectionButton.style.top = `${Math.round(top)}px`;
    selectionButton.style.left = `${Math.round(left)}px`;
}
function updateSelectionButtonPosition() {
    if (!selectionButton || selectionButton.style.display === "none") {
        return;
    }
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selectionCurrentText) {
        hideSelectionControls();
        return;
    }
    const rect = getSelectionRect(selection);
    if (!rect) {
        hideSelectionControls();
        return;
    }
    selectionAnchorRect = rect;
    showSelectionButton(rect);
    if (selectionPanel && selectionPanel.style.display !== "none") {
        positionSelectionPanel();
    }
}
function openSelectionPanel() {
    if (!selectionPanel ||
        !selectionSelect ||
        !selectionStatus ||
        !selectionPreview) {
        return;
    }
    if (!selectionCurrentText) {
        selectionStatus.textContent = "선택된 텍스트가 없습니다.";
        return;
    }
    const categories = currentConfig?.categories ?? [];
    populateSelectionCategories(categories);
    selectionPreview.textContent = selectionCurrentText;
    selectionPanel.style.display = "flex";
    selectionStatus.textContent = "";
    selectionIsSending = false;
    if (selectionSendButton) {
        selectionSendButton.disabled = false;
    }
    positionSelectionPanel();
}
function populateSelectionCategories(categories) {
    if (!selectionSelect || !selectionSendButton) {
        return;
    }
    const selectEl = selectionSelect;
    const sendButton = selectionSendButton;
    selectEl.innerHTML = "";
    categories.forEach((category) => {
        const option = document.createElement("option");
        option.value = String(category.id);
        option.textContent = category.name;
        selectEl.appendChild(option);
    });
    if (categories.length === 0) {
        selectEl.disabled = true;
        sendButton.disabled = true;
        if (selectionStatus) {
            selectionStatus.textContent = "카테고리를 먼저 등록해주세요.";
        }
    }
    else {
        selectEl.disabled = selectionIsSending;
        sendButton.disabled = selectionIsSending;
        selectEl.value = String(categories[0].id);
    }
}
function positionSelectionPanel() {
    if (!selectionPanel) {
        return;
    }
    const baseRect = selectionAnchorRect
        ? selectionAnchorRect
        : selectionButton?.getBoundingClientRect() ?? null;
    if (!baseRect) {
        return;
    }
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    selectionPanel.style.display = "flex";
    const overlayRect = selectionPanel.getBoundingClientRect();
    let top = baseRect.bottom + 8;
    if (top + overlayRect.height > viewportHeight - 4) {
        top = baseRect.top - overlayRect.height - 8;
    }
    if (top < 4) {
        top = 4;
    }
    let left = baseRect.left;
    if (left + overlayRect.width > viewportWidth - 4) {
        left = viewportWidth - overlayRect.width - 4;
    }
    if (left < 4) {
        left = 4;
    }
    selectionPanel.style.top = `${Math.round(top)}px`;
    selectionPanel.style.left = `${Math.round(left)}px`;
}
function hideSelectionControls() {
    if (selectionButton) {
        selectionButton.style.display = "none";
    }
    closeSelectionPanel();
    selectionCurrentText = null;
    selectionAnchorRect = null;
    selectionIsSending = false;
    if (selectionStatusTimer) {
        window.clearTimeout(selectionStatusTimer);
        selectionStatusTimer = undefined;
    }
}
function closeSelectionPanel() {
    if (selectionPanel) {
        selectionPanel.style.display = "none";
    }
    if (selectionStatus) {
        selectionStatus.textContent = "";
    }
    if (selectionSendButton) {
        selectionSendButton.disabled = false;
    }
}
function scheduleSelectionStatusClear() {
    if (selectionStatusTimer) {
        window.clearTimeout(selectionStatusTimer);
    }
    selectionStatusTimer = window.setTimeout(() => {
        if (selectionStatus) {
            selectionStatus.textContent = "";
        }
        closeSelectionPanel();
        if (selectionButton) {
            selectionButton.style.display = "none";
        }
        selectionCurrentText = null;
        selectionAnchorRect = null;
        selectionStatusTimer = undefined;
    }, FEEDBACK_SUCCESS_TIMEOUT);
}
async function submitSelectionFeedback() {
    if (!currentConfig?.token) {
        if (selectionStatus) {
            selectionStatus.textContent = "로그인이 필요합니다.";
        }
        return;
    }
    if (!selectionCurrentText) {
        if (selectionStatus) {
            selectionStatus.textContent = "선택된 텍스트가 없습니다.";
        }
        return;
    }
    if (!selectionSelect) {
        return;
    }
    const value = selectionSelect.value;
    const categoryId = Number.parseInt(value, 10);
    if (Number.isNaN(categoryId)) {
        if (selectionStatus) {
            selectionStatus.textContent = "카테고리를 선택해주세요.";
        }
        return;
    }
    if (selectionIsSending) {
        return;
    }
    selectionIsSending = true;
    if (selectionSendButton) {
        selectionSendButton.disabled = true;
    }
    selectionSelect.disabled = true;
    if (selectionStatus) {
        selectionStatus.textContent = "강화 피드백 전송 중...";
    }
    try {
        const truncated = selectionCurrentText.slice(0, 1000);
        const response = await sendFeedback({
            text_content: truncated,
            category_id: categoryId,
            feedback_type: "reinforce",
        }, currentConfig);
        if (selectionStatus) {
            selectionStatus.textContent = "강화 피드백이 반영되었습니다.";
        }
        console.log("[WebPurifier] 강화 피드백 전송 완료", {
            categoryId,
            logId: response.new_log_id,
        });
        scheduleSelectionStatusClear();
    }
    catch (error) {
        if (selectionStatus) {
            selectionStatus.textContent = getErrorMessage(error);
        }
        if (selectionSendButton) {
            selectionSendButton.disabled = false;
        }
        if (selectionSelect) {
            selectionSelect.disabled = false;
        }
    }
    finally {
        selectionIsSending = false;
    }
}
function isSelectionWithinBlurred(selection) {
    const anchorNode = selection.anchorNode;
    const focusNode = selection.focusNode;
    return isNodeWithinBlurred(anchorNode) || isNodeWithinBlurred(focusNode);
}
function isNodeWithinBlurred(node) {
    let current = node;
    while (current) {
        if (current instanceof Element &&
            (current.hasAttribute("data-webpurifier-blurred") ||
                current.hasAttribute("data-webpurifier-pending"))) {
            return true;
        }
        current =
            current.parentElement ??
                (current.parentNode instanceof Element ? current.parentNode : null);
    }
    return false;
}
function getSelectionRect(selection) {
    if (selection.rangeCount === 0) {
        return null;
    }
    try {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        if (!rect || (rect.width === 0 && rect.height === 0)) {
            return null;
        }
        return rect;
    }
    catch (_error) {
        return null;
    }
}
function attachFeedbackControls(element, text, categories) {
    if (!(element instanceof HTMLElement)) {
        return;
    }
    if (categories.length === 0) {
        detachFeedback(element);
        return;
    }
    let targetContext = feedbackContextMap.get(element);
    if (!targetContext) {
        const overlay = document.createElement("div");
        overlay.className = FEEDBACK_PANEL_CLASS;
        const label = document.createElement("span");
        label.textContent = "카테고리";
        label.style.fontWeight = "600";
        overlay.appendChild(label);
        const select = document.createElement("select");
        select.className = FEEDBACK_SELECT_CLASS;
        select.setAttribute("aria-label", "피드백 대상 카테고리 선택");
        overlay.appendChild(select);
        const weakenBtn = document.createElement("button");
        weakenBtn.className = FEEDBACK_BUTTON_CLASS;
        weakenBtn.dataset.type = "weaken";
        weakenBtn.textContent = "약화";
        overlay.appendChild(weakenBtn);
        const status = document.createElement("span");
        status.className = FEEDBACK_STATUS_CLASS;
        overlay.appendChild(status);
        const newContext = {
            element,
            overlay,
            select,
            status,
            weakenBtn,
            text,
            categories,
            isSending: false,
        };
        feedbackContextMap.set(element, newContext);
        feedbackContextSet.add(newContext);
        document.body.appendChild(overlay);
        ensureFeedbackListeners();
        weakenBtn.addEventListener("click", (event) => {
            event.preventDefault();
            handleFeedbackSubmission(newContext, "weaken");
        });
        select.addEventListener("change", () => {
            newContext.status.textContent = "";
            if (newContext.statusTimer) {
                window.clearTimeout(newContext.statusTimer);
                newContext.statusTimer = undefined;
            }
        });
        targetContext = newContext;
    }
    else {
        targetContext.text = text;
        targetContext.categories = categories;
    }
    if (!targetContext) {
        return;
    }
    updateFeedbackSelect(targetContext);
    targetContext.status.textContent = "";
    positionFeedbackOverlay(targetContext);
    const contextRef = targetContext;
    window.requestAnimationFrame(() => {
        positionFeedbackOverlay(contextRef);
    });
}
function updateFeedbackSelect(context) {
    const previousValue = context.select.value;
    context.select.innerHTML = "";
    context.categories.forEach((category) => {
        const option = document.createElement("option");
        option.value = String(category.id);
        const similarity = Number.isFinite(category.similarity)
            ? ` (${category.similarity.toFixed(2)})`
            : "";
        option.textContent = `${category.name}${similarity}`;
        option.title = `${category.name}`;
        context.select.appendChild(option);
    });
    if (context.categories.length === 0) {
        context.select.value = "";
        context.select.disabled = true;
        return;
    }
    const hasPrevious = context.categories.some((cat) => String(cat.id) === previousValue);
    const nextValue = hasPrevious
        ? previousValue
        : String(context.categories[0].id);
    context.select.value = nextValue;
    context.select.disabled = context.isSending || context.categories.length <= 1;
}
function positionFeedbackOverlay(context) {
    const rect = context.element.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
    if (rect.bottom <= 0 ||
        rect.top >= viewportHeight ||
        rect.right <= 0 ||
        rect.left >= viewportWidth) {
        context.overlay.style.display = "none";
        return;
    }
    context.overlay.style.display = "flex";
    const overlayRect = context.overlay.getBoundingClientRect();
    let top = rect.top - overlayRect.height - 6;
    if (top < 4) {
        top = rect.bottom + 6;
    }
    let left = rect.right - overlayRect.width;
    if (left < 4) {
        left = rect.left;
    }
    left = Math.max(Math.min(left, viewportWidth - overlayRect.width - 4), 4);
    top = Math.max(Math.min(top, viewportHeight - overlayRect.height - 4), 4);
    context.overlay.style.top = `${Math.round(top)}px`;
    context.overlay.style.left = `${Math.round(left)}px`;
}
function refreshFeedbackOverlayPositions() {
    feedbackContextSet.forEach((context) => {
        positionFeedbackOverlay(context);
    });
}
function ensureFeedbackListeners() {
    if (feedbackListenersAttached) {
        return;
    }
    window.addEventListener("scroll", refreshFeedbackOverlayPositions, true);
    window.addEventListener("resize", refreshFeedbackOverlayPositions);
    feedbackListenersAttached = true;
}
function teardownFeedbackListeners() {
    if (!feedbackListenersAttached) {
        return;
    }
    window.removeEventListener("scroll", refreshFeedbackOverlayPositions, true);
    window.removeEventListener("resize", refreshFeedbackOverlayPositions);
    feedbackListenersAttached = false;
}
function detachFeedback(element) {
    const context = feedbackContextMap.get(element);
    if (!context) {
        return;
    }
    if (context.statusTimer) {
        window.clearTimeout(context.statusTimer);
        context.statusTimer = undefined;
    }
    feedbackContextMap.delete(element);
    feedbackContextSet.delete(context);
    context.overlay.remove();
    if (feedbackContextSet.size === 0) {
        teardownFeedbackListeners();
    }
}
function clearAllFeedback() {
    feedbackContextSet.forEach((context) => {
        if (context.statusTimer) {
            window.clearTimeout(context.statusTimer);
            context.statusTimer = undefined;
        }
        context.overlay.remove();
        feedbackContextMap.delete(context.element);
    });
    feedbackContextSet.clear();
    teardownFeedbackListeners();
}
async function handleFeedbackSubmission(context, type) {
    if (!currentConfig?.token) {
        context.status.textContent = "로그인이 필요합니다.";
        return;
    }
    if (context.isSending) {
        return;
    }
    const categoryId = getSelectedCategoryId(context);
    if (!categoryId) {
        context.status.textContent = "카테고리를 선택해주세요.";
        return;
    }
    context.isSending = true;
    setFeedbackBusy(context, true);
    const actionLabel = type === "reinforce" ? "강화" : "약화";
    context.status.textContent = `${actionLabel} 전송 중...`;
    try {
        const response = await sendFeedback({
            text_content: context.text,
            category_id: categoryId,
            feedback_type: type,
        }, currentConfig);
        context.status.textContent = "피드백이 반영되었습니다.";
        scheduleStatusClear(context);
        console.log("[WebPurifier] 피드백 전송 완료", {
            type,
            categoryId,
            logId: response.new_log_id,
        });
    }
    catch (error) {
        context.status.textContent = getErrorMessage(error);
    }
    finally {
        context.isSending = false;
        setFeedbackBusy(context, false);
    }
}
function setFeedbackBusy(context, active) {
    context.weakenBtn.disabled = active;
    const shouldDisableSelect = active || context.categories.length <= 1;
    context.select.disabled = shouldDisableSelect;
}
function scheduleStatusClear(context) {
    if (context.statusTimer) {
        window.clearTimeout(context.statusTimer);
    }
    context.statusTimer = window.setTimeout(() => {
        context.status.textContent = "";
        context.statusTimer = undefined;
    }, FEEDBACK_SUCCESS_TIMEOUT);
}
function getSelectedCategoryId(context) {
    if (context.categories.length === 0) {
        return null;
    }
    const value = context.select.value;
    const parsed = Number.parseInt(value, 10);
    if (!Number.isNaN(parsed)) {
        return parsed;
    }
    const fallback = context.categories[0]?.id;
    return typeof fallback === "number" ? fallback : null;
}
function cleanupRemovedNode(node) {
    if (!(node instanceof Element)) {
        return;
    }
    if (node.hasAttribute("data-webpurifier-pending")) {
        clearPending(node);
    }
    if (node.hasAttribute("data-webpurifier-blurred")) {
        removeBlur(node);
    }
    node
        .querySelectorAll("[data-webpurifier-pending='true']")
        .forEach((child) => {
        clearPending(child);
    });
    node
        .querySelectorAll("[data-webpurifier-blurred='true']")
        .forEach((child) => {
        removeBlur(child);
    });
}
