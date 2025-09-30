chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "PROCESS_PAGE_TEXT") {
    chrome.storage.local.get(["settings"], (data) => {
      const { settings } = data;
      // settings 객체가 존재하고, isEnabled가 true일 때만 백엔드로 전송
      if (settings && settings.isEnabled) {
        sendToBackend(message.payload, settings);
      }
    });
  }
  return true;
});

function sendToBackend(texts, settings) {
  const backendUrl = "http://127.0.0.1:8000/api/v1/filter";

  const requestBody = {
    contents: texts,
    option: {
      // popup.js의 saveSettings 로직에 따라 selectedTopics가 모든 활성 주제를 포함
      categories: settings.selectedTopics,
      strength: parseInt(settings.strength, 10),
    },
  };

  fetch(backendUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  })
    .then((response) => response.json())
    .then((result) => {
      if (result.detectedContents && result.detectedContents.length > 0) {
        const detectedIndices = new Set(
          result.detectedContents.map((item) => item.idx)
        );
        const textsToFilter = texts
          .filter((textItem) => detectedIndices.has(textItem.idx))
          .map((textItem) => textItem.text);

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0] && tabs[0].id) {
            chrome.tabs.sendMessage(tabs[0].id, {
              type: "FILTER_TEXTS",
              payload: textsToFilter,
            });
          }
        });
      }
    })
    .catch((error) => console.error("Background Error:", error));
}
