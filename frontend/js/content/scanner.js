// 즉시 실행 함수(IIFE)로 정의하여 전역 스코프 오염을 방지
(function() {

  // 주어진 요소(e)가 실제로 화면에 표시되고 있는지(시각적으로 보이는지) 확인하는 함수
  // getBoundingClientRect()로 요소의 크기를 가져오고, width나 height가 0보다 크면 true 반환
  function vis(e) {
    if (!e) return false;
    const r = e.getBoundingClientRect();
    return !!(r.width || r.height);
  }

  // 페이지의 텍스트 노드들을 순회하며 수집하는 함수
  // 기본적으로 document.body에서 시작하며, body 내 모든 텍스트 노드를 탐색
  function collect(base = document.body) {
    // TreeWalker를 이용하여 텍스트 노드(Node.TEXT_NODE)만 탐색
    const walker = document.createTreeWalker(base, NodeFilter.SHOW_TEXT);
    const arr = []; // 수집된 텍스트 정보를 저장할 배열
    let i = 0;      // 각 텍스트 노드에 부여할 고유 ID

    // 모든 텍스트 노드를 순회
    while (walker.nextNode()) {
      const node = walker.currentNode;      // 현재 텍스트 노드
      const parent = node.parentElement;    // 부모 요소 (텍스트를 감싸고 있는 HTML 요소)

      // 부모 요소가 없거나, 화면에 표시되지 않으면 무시
      if (!parent || !vis(parent)) continue;

      // 텍스트 내용에서 양쪽 공백을 제거
      const text = node.textContent.trim();

      // 너무 짧은 텍스트(길이 5 이하)는 필터링에서 제외 (불필요한 데이터 최소화)
      if (text.length <= 5) continue;

      // 고유 ID 부여 및 부모 요소에 data-wp-node-id 속성 추가
      const id = i++;
      parent.setAttribute("data-wp-node-id", id);

      // 인덱스와 텍스트 내용을 객체 형태로 저장
      arr.push({ idx: id, text });
    }

    // 수집된 모든 텍스트 정보 배열을 반환
    return arr;
  }

  // 특정 함수의 호출 빈도를 제한하는 디바운스 함수
  // f: 실행할 함수, m: 지연 시간(기본값 400ms)
  // 연속 호출 시 마지막 호출만 유효하게 실행됨
  function deb(f, m = 400) {
    let timer;
    return (...args) => {
      clearTimeout(timer);          // 이전 타이머 초기화
      timer = setTimeout(() => f(...args), m); // 일정 시간 후에 마지막 호출만 실행
    };
  }

  // 수집 함수와 디바운스 함수를 전역(window)에 노출
  // 다른 스크립트(content_script.js 등)에서 사용 가능
  window.WPScanner = {
    collectTexts: collect,
    debounce: deb
  };

})();
