const textElements = document.querySelectorAll("p, h1, h2, h3, span, li, a");
const processedTexts = new Set();
const pageTexts = [];

// 페이지 로드 시 필터링이 켜져 있는지 확인하고 body 클래스 설정
chrome.storage.local.get("settings", (data) => {
  if (data.settings && data.settings.isEnabled) {
    document.body.classList.add("webpurifier-active");
  }
});

// 메시지 수신
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "FILTER_TEXTS") {
    const textsToFilter = message.payload;
    if (textsToFilter && textsToFilter.length > 0) {
      document.body.classList.add("webpurifier-active");
      filterTextsOnPage(textsToFilter);
    }
  } else if (message.type === "ENABLE_FILTERING") {
    document.body.classList.add("webpurifier-active");
  } else if (message.type === "DISABLE_FILTERING") {
    document.body.classList.remove("webpurifier-active");
  }
});

textElements.forEach((element, index) => {
  const isVisible = !!(
    element.offsetWidth ||
    element.offsetHeight ||
    element.getClientRects().length
  );
  if (!isVisible) return;

  const text = element.textContent.trim();
  if (text.length > 5 && !processedTexts.has(text)) {
    pageTexts.push({
      idx: index,
      text: text,
    });
    processedTexts.add(text);
  }
});

if (pageTexts.length > 0) {
  chrome.runtime.sendMessage({
    type: "PROCESS_PAGE_TEXT",
    payload: pageTexts,
  });
}

// --- 메시지 수신 및 블러 처리 부분 ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "FILTER_TEXTS") {
    const textsToFilter = message.payload;
    if (textsToFilter && textsToFilter.length > 0) {
      filterTextsOnPage(textsToFilter);
    }
  }
});

function filterTextsOnPage(textsToFilter) {
  const treeWalker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT
  );
  const nodesToReplace = [];

  while (treeWalker.nextNode()) {
    const node = treeWalker.currentNode;

    textsToFilter.forEach((textToFilter) => {
      if (node.textContent.includes(textToFilter)) {
        const newHtml = node.textContent.replace(
          textToFilter,
          `<span class="webpurifier-blur">${textToFilter}</span>`
        );
        nodesToReplace.push({ oldNode: node, newHtml: newHtml });
      }
    });
  }

  nodesToReplace.forEach((item) => {
    const newElement = document.createElement("span");
    newElement.innerHTML = item.newHtml;
    if (item.oldNode.parentNode) {
      item.oldNode.parentNode.replaceChild(newElement, item.oldNode);
    }
  });
}
