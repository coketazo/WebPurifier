document.addEventListener("DOMContentLoaded", () => {
  // --- DOM 요소 ---
  const mainToggle = document.getElementById("main-toggle");
  const container = document.getElementById("container");
  const mainView = document.getElementById("main-view");
  const settingsView = document.getElementById("settings-view");
  const goToSettingsButton = document.getElementById("go-to-settings-button");
  const strengthSlider = document.getElementById("strength-slider");
  const topicsContainer = document.querySelector(".topics");
  const customTopicInput = document.getElementById("custom-topic-input");
  const addTopicButton = document.getElementById("add-topic-button");
  const backButton = document.querySelector("#settings-view .back-button");
  const methodRadios = document.querySelectorAll(
    'input[name="response-method"]'
  );
  const defaultTopics = ["외모", "학벌", "신체", "정치"];

  // --- 화면 전환 로직 ---
  if (goToSettingsButton) {
    goToSettingsButton.addEventListener("click", () => {
      mainView.style.display = "none";
      settingsView.style.display = "block";
    });
  }

  if (backButton) {
    backButton.addEventListener("click", () => {
      settingsView.style.display = "none";
      mainView.style.display = "block";
    });
  }

  // --- UI 상태 업데이트 ---
  function updateUiEnabledState(isEnabled) {
    if (isEnabled) {
      container.classList.remove("disabled");
    } else {
      container.classList.add("disabled");
    }
  }

  // --- 설정 저장/불러오기 ---
  function loadSettings() {
    const defaultSettings = {
      isEnabled: true,
      strength: "2",
      method: "block",
      selectedTopics: [],
    };
    chrome.storage.local.get(
      { customTopics: [], settings: defaultSettings },
      (data) => {
        const { settings, customTopics } = data;
        mainToggle.checked = settings.isEnabled;
        updateUiEnabledState(settings.isEnabled);

        customTopics.forEach((topicText) => createTopicButton(topicText));

        strengthSlider.value = settings.strength;
        const selectedRadio = document.querySelector(
          `input[name="response-method"][value="${settings.method}"]`
        );
        if (selectedRadio) selectedRadio.checked = true;

        document.querySelectorAll(".topics button").forEach((button) => {
          if (settings.selectedTopics.includes(button.textContent)) {
            button.classList.add("active");
          } else {
            button.classList.remove("active");
          }
        });
      }
    );
  }

  function saveSettings() {
    const selectedRadio = document.querySelector(
      'input[name="response-method"]:checked'
    );
    const selectedMethod = selectedRadio ? selectedRadio.value : "block";
    const selectedTopics = [];
    const customTopics = [];
    document.querySelectorAll(".topics button").forEach((button) => {
      if (button.classList.contains("active")) {
        selectedTopics.push(button.textContent);
      }
      if (!defaultTopics.includes(button.textContent)) {
        customTopics.push(button.textContent);
      }
    });
    const currentSettings = {
      isEnabled: mainToggle.checked,
      strength: strengthSlider.value,
      method: selectedMethod,
      selectedTopics: selectedTopics,
    };
    chrome.storage.local.set(
      {
        settings: currentSettings,
        customTopics: customTopics,
      },
      () => {
        console.log("Settings saved:", currentSettings);
      }
    );
  }

  // --- 동적 기능 로직 ---
  function createTopicButton(text) {
    const button = document.createElement("button");
    button.textContent = text;
    // 기본 주제가 아니면 'custom' 클래스 추가
    if (!defaultTopics.includes(text)) {
      button.classList.add("custom");
    }
    topicsContainer.appendChild(button);
  }

  function addCustomTopic() {
    const newTopicText = customTopicInput.value.trim();
    if (newTopicText) {
      const existingTopics = Array.from(
        document.querySelectorAll(".topics button")
      ).map((b) => b.textContent);
      if (existingTopics.includes(newTopicText)) {
        alert("이미 존재하는 주제입니다.");
        return;
      }
      createTopicButton(newTopicText);
      // 새로 추가한 버튼을 바로 활성화하고 저장
      document.querySelectorAll(".topics button").forEach((button) => {
        if (button.textContent === newTopicText) {
          button.classList.add("active");
        }
      });
      saveSettings();
      customTopicInput.value = "";
    }
  }

  // --- 이벤트 리스너 연결 ---
  loadSettings();

  mainToggle.addEventListener("change", () => {
    updateUiEnabledState(mainToggle.checked);
    saveSettings();
  });

  // 이벤트 위임 방식으로 주제 버튼 클릭 처리
  topicsContainer.addEventListener("click", (event) => {
    // 클릭된 요소가 버튼일 경우에만 실행
    if (event.target.tagName === "BUTTON") {
      event.target.classList.toggle("active");
      saveSettings();
    }
  });

  strengthSlider.addEventListener("change", saveSettings);
  methodRadios.forEach((radio) =>
    radio.addEventListener("change", saveSettings)
  );
  addTopicButton.addEventListener("click", addCustomTopic);
  customTopicInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") addCustomTopic();
  });
});
