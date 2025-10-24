/**
 * 주어진 요소가 화면에 시각적으로 표시되는지 확인
 * @param {HTMLElement} element
 * @returns {boolean}
 */

function isVisible(element) {
  if (!element) return false;
  const rect = element.getBoundingClientRect();
  return !!(rect.width || rect.height);
}

/**
 * 페이지의 텍스트 노드를 수집
 * 기본적으로 document.body에서 시작
 * @param {HTMLElement} base
 * @returns {Array<{idx: number, text: string}>}
 */

function collectTexts(base = document.body) {
  const walker = document.createTreeWalker(base, NodeFilter.SHOW_TEXT);
  const result = [];
  let idCounter = 0;

  while (walker.nextNode()) {
    const node = walker.currentNode;
    const parent = node.parentElement;

    // 부모 요소가 없거나 화면에 표시되지 않으면 무시
    if (!parent || !isVisible(parent)) continue;

    const text = node.textContent.trim();
    if (text.length <= 5) continue; // 너무 짧은 텍스트 제외

    const id = idCounter++;
    parent.setAttribute("data-wp-node-id", id);

    result.push({ idx: id, text });
  }

  return result;
}

/**
 * 디바운스 함수
 * 연속 호출 시 마지막 호출만 실행
 * @param {Function} func
 * @param {number} wait - 지연 시간(ms)
 * @returns {Function}
 */
function debounce(func, wait = 400) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => func(...args), wait);
  };
}

// WPScanner 네임스페이스로 전역에 노출
window.WPScanner = {
  collectTexts,
  debounce
};

