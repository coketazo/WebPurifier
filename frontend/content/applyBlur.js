// 즉시 실행 함수 (IIFE) - 전역 오염을 방지하고 내부 변수들을 로컬 스코프로 한정
(function() {

  // HTML 특수문자를 안전하게 변환하는 함수
  // 예: <, >, &, ", ' 등을 HTML 엔티티로 치환하여 XSS 공격을 방지
  function esc(s) {
    return s
      .replace(/&/g, "&amp;")   // & → &amp;
      .replace(/</g, "&lt;")    // < → &lt;
      .replace(/>/g, "&gt;")    // > → &gt;
      .replace(/\"/g, "&quot;") // " → &quot;
      .replace(/'/g, "&#039;"); // ' → &#039;
  }

  // 필터링된 텍스트 노드를 블러 처리하는 함수
  // ids: 백엔드가 반환한 감지된 텍스트 노드의 고유 ID 목록
  function apply(ids) {
    ids.forEach(i => {
      // data-wp-node-id 속성이 해당 ID인 요소를 찾음
      const h = document.querySelector(`[data-wp-node-id="${i}"]`);
      if (!h) return; // 요소가 없으면 건너뜀

      // 해당 요소의 텍스트 내용을 가져옴
      const t = h.textContent;
      if (!t) return; // 텍스트가 없으면 건너뜀

      // 텍스트를 HTML 안전하게 변환하고, 블러 처리용 span으로 감쌈
      h.innerHTML = `<span class="webpurifier-blur">${esc(t)}</span>`;
      // CSS에서 .webpurifier-blur 클래스가 블러 효과를 적용함
    });
  }

  // apply 함수를 전역(window) 객체의 WPApply 네임스페이스로 노출
  // 다른 스크립트(예: background.js나 popup.js)에서 호출할 수 있게 함
  window.WPApply = {
    applyBlurByIds: apply
  };

})(); // 즉시 실행
