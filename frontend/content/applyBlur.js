/**
 * 필터링된 텍스트 노드를 블러 처리 (escapeHtml 제거 버전)
 * @param {string[]} ids - 백엔드에서 반환한 텍스트 노드 ID 배열
 */
function applyBlurByIds(ids) {
  ids.forEach(id => {
    const element = document.querySelector(`[data-wp-node-id="${id}"]`);
    if (!element) return;

    const text = element.textContent;
    if (!text) return;

    // 원문을 그대로 innerHTML로 삽입 
    element.innerHTML = `<span class="webpurifier-blur">${text}</span>`;
  });
}

// WPApply 네임스페이스로 전역에 노출
window.WPApply = {
  applyBlurByIds
};
