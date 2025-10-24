/ DOM이 모두 로드된 후 실행 
document.addEventListener("DOMContentLoaded", () => {

  // ------------------------------------------------------------
  // 요소 참조 (Element References)
  // ------------------------------------------------------------
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

  // ------------------------------------------------------------
  // 기본 설정값
  // ------------------------------------------------------------
  const DEFAULT_SETTINGS = {
    isEnabled: true,
    strength: "2",
    method: "block",
    selectedTopics: []
  };

  // ------------------------------------------------------------
  // 헬퍼 함수들
  // ------------------------------------------------------------
  const updateUiEnabledState = (isEnabled) => {
    container.classList.toggle("disabled", !isEnabled);
  };

  const readStore = () =>
    new Promise((resolve) => {
      chrome.storage.local.get(
        { customTopics: [], settings: DEFAULT_SETTINGS },
        (data) => {
          try {
            const settings = { ...DEFAULT_SETTINGS, ...(data?.settings || {}) };
            const customTopics = Array.isArray(data?.customTopics)
              ? data.customTopics
              : [];
            resolve({ settings, customTopics });
          } catch {
            resolve({ settings: DEFAULT_SETTINGS, customTopics: [] });
          }
        }
      );
    });

  const writeStore = (settings, customTopics) =>
    new Promise((resolve) => {
      chrome.storage.local.set({ settings, customTopics }, () => resolve());
    });

  // ------------------------------------------------------------
  // UI 전환 (메인 ↔ 상세설정)
  // ------------------------------------------------------------
  goToSettingsButton.addEventListener("click", () => {
    mainView.style.display = "none";
    settingsView.style.display = "block";
  });

  backButton.addEventListener("click", () => {
    settingsView.style.display = "none";
    mainView.style.display = "block";
  });

  // ------------------------------------------------------------
  // 민감주제 관련 이벤트
  // ------------------------------------------------------------
  topicsContainer.addEventListener("click", (e) => {
    const del = e.target.closest("span.delete-btn");
    if (del) {
      e.stopPropagation();
      const button = del.closest("button");
      if (button) {
        button.remove();
        saveSettings();
      }
      return;
    }

    const btn = e.target.closest("button");
    if (btn && topicsContainer.contains(btn)) {
      btn.classList.toggle("active");
      saveSettings();
    }
  });

  // ------------------------------------------------------------
  // 커스텀 토픽 추가
  // ------------------------------------------------------------
  addTopicButton.addEventListener("click", addCustomTopic);
  customTopicInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") addCustomTopic();
  });

  function addCustomTopic() {
    const value = (customTopicInput.value || "").trim();
    if (!value) return;

    const existing = Array.from(topicsContainer.querySelectorAll("button")).map(
      (b) => b.textContent.replace("✕", "").trim()
    );
    if (existing.includes(value)) {
      alert("이미 존재하는 주제입니다.");
      return;
    }

    const btn = document.createElement("button");
    btn.textContent = value;
    btn.classList.add("custom", "active");

    const del = document.createElement("span");
    del.textContent = "✕";
    del.className = "delete-btn";
    btn.appendChild(del);

    topicsContainer.appendChild(btn);
    customTopicInput.value = "";
    saveSettings();
  }

  // ------------------------------------------------------------
  // 상세 설정의 라디오 버튼 변경 이벤트
  // ------------------------------------------------------------
  document
    .querySelectorAll('input[name="response-method"]')
    .forEach((r) => r.addEventListener("change", saveSettings));

  // ------------------------------------------------------------
  // 온/오프 스위치 이벤트
  // ------------------------------------------------------------
  mainToggle.addEventListener("change", () => {
    updateUiEnabledState(mainToggle.checked);
    saveSettings();
  });

  // ------------------------------------------------------------
  // 필터 강도 슬라이더 이벤트
  // ------------------------------------------------------------
  strengthSlider.addEventListener("change", saveSettings);

  // ------------------------------------------------------------
  // 초기화 함수 (즉시 실행 아님)
  // ------------------------------------------------------------
  async function init() {
    const { settings, customTopics } = await readStore();

    mainToggle.checked = !!settings.isEnabled;
    updateUiEnabledState(mainToggle.checked);

    strengthSlider.value = String(settings.strength || "2");

    document.querySelectorAll(".topics button").forEach((btn) => {
      const label = btn.textContent.trim();
      btn.classList.toggle("active", settings.selectedTopics.includes(label));
    });

    customTopics.forEach((text) => {
      const btn = document.createElement("button");
      btn.textContent = text;
      btn.classList.add("custom");
      if (settings.selectedTopics.includes(text)) btn.classList.add("active");

      const del = document.createElement("span");
      del.textContent = "✕";
      del.className = "delete-btn";
      btn.appendChild(del);

      topicsContainer.appendChild(btn);
    });

    const method = settings.method || "block";
    const radio = document.querySelector(
      `input[name="response-method"][value="${method}"]`
    );
    if (radio) radio.checked = true;
  }

  //명시적으로 호출
  init();

  // ------------------------------------------------------------
  // 설정 저장 함수
  // ------------------------------------------------------------
  async function saveSettings() {
    const selectedRadio = document.querySelector(
      'input[name="response-method"]:checked'
    );
    const method = selectedRadio ? selectedRadio.value : "block";

    const btns = Array.from(document.querySelectorAll(".topics button"));
    const selectedTopics = btns
      .filter((b) => b.classList.contains("active"))
      .map((b) => b.textContent.replace("✕", "").trim());

    const customTopics = btns
      .filter((b) => b.classList.contains("custom"))
      .map((b) => b.textContent.replace("✕", "").trim());

    const next = {
      isEnabled: !!mainToggle.checked,
      strength: String(strengthSlider.value || "2"),
      method,
      selectedTopics,
    };

    await writeStore(next, customTopics);
  }
});


