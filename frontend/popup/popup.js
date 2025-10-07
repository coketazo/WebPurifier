// DOM이 모두 로드된 후 실행
document.addEventListener("DOMContentLoaded", () => {

  // ------------------------------------------------------------
  // 요소 참조 (Element References)
  // ------------------------------------------------------------
  const mainToggle = document.getElementById("main-toggle");              // 전체 필터 On/Off 스위치
  const container = document.getElementById("container");                 // 설정 섹션들을 감싸는 컨테이너
  const mainView = document.getElementById("main-view");                  // 기본 화면
  const settingsView = document.getElementById("settings-view");          // 상세 설정 화면
  const goToSettingsButton = document.getElementById("go-to-settings-button"); // "상세 설정" 이동 버튼
  const strengthSlider = document.getElementById("strength-slider");      // 필터 강도 조절 슬라이더
  const topicsContainer = document.querySelector(".topics");              // 주제 버튼 컨테이너
  const customTopicInput = document.getElementById("custom-topic-input"); // 커스텀 주제 입력창
  const addTopicButton = document.getElementById("add-topic-button");     // "추가" 버튼
  const backButton = document.querySelector("#settings-view .back-button"); // 상세 설정 → 메인으로 돌아가기 버튼

  // ------------------------------------------------------------
  // 기본 설정값
  // ------------------------------------------------------------
  const DEFAULT_SETTINGS = {
    isEnabled: true,       // 필터 기본 상태 (활성화)
    strength: "2",         // 기본 필터 강도
    method: "block",       // 기본 대응 방식 (자동 차단)
    selectedTopics: []     // 선택된 민감 주제 배열
  };

  // ------------------------------------------------------------
  // 헬퍼 함수들
  // ------------------------------------------------------------

  // UI 활성/비활성화 토글 (필터가 꺼져 있을 때 회색 처리)
  const updateUiEnabledState = (isEnabled) => {
    container.classList.toggle("disabled", !isEnabled);
  };

  // chrome.storage.local에서 설정 불러오기
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
            // 데이터 파싱 오류 시 기본값으로 복구
            resolve({ settings: DEFAULT_SETTINGS, customTopics: [] });
          }
        }
      );
    });

  // chrome.storage.local에 설정 저장하기
  const writeStore = (settings, customTopics) =>
    new Promise((resolve) => {
      chrome.storage.local.set({ settings, customTopics }, () => resolve());
    });

  // ------------------------------------------------------------
  // UI 전환 (메인 ↔ 상세설정)
  // ------------------------------------------------------------

  // 상세 설정 보기
  goToSettingsButton.addEventListener("click", () => {
    mainView.style.display = "none";
    settingsView.style.display = "block";
  });

  // 상세 설정에서 메인 화면으로 돌아가기
  backButton.addEventListener("click", () => {
    settingsView.style.display = "none";
    mainView.style.display = "block";
  });

  // ------------------------------------------------------------
  // 민감주제 관련 이벤트 (기본 + 커스텀 토픽)
  // ------------------------------------------------------------

  // 이벤트 위임 방식으로 버튼 클릭 처리 (삭제/선택 모두 처리)
  topicsContainer.addEventListener("click", (e) => {
    // 삭제 버튼 클릭 시
    const del = e.target.closest("span.delete-btn");
    if (del) {
      e.stopPropagation();
      const button = del.closest("button");
      if (button) {
        button.remove();   // 버튼 제거
        saveSettings();    // 변경사항 저장
      }
      return;
    }

    // 일반 토픽 버튼 클릭 시 (선택/해제)
    const btn = e.target.closest("button");
    if (btn && topicsContainer.contains(btn)) {
      btn.classList.toggle("active");
      saveSettings();
    }
  });

  // ------------------------------------------------------------
  // 커스텀 토픽 추가 관련 로직
  // ------------------------------------------------------------

  // "추가" 버튼 클릭 시
  addTopicButton.addEventListener("click", addCustomTopic);

  // Enter 키로도 추가 가능
  customTopicInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") addCustomTopic();
  });

  // 커스텀 토픽 추가 함수
  function addCustomTopic() {
    const value = (customTopicInput.value || "").trim();
    if (!value) return; // 빈 값은 무시

    // 이미 존재하는 토픽인지 확인 (중복 방지)
    const existing = Array.from(topicsContainer.querySelectorAll("button")).map(
      (b) => b.textContent.replace("✕", "").trim()
    );
    if (existing.includes(value)) {
      alert("이미 존재하는 주제입니다.");
      return;
    }

    // 새 버튼 생성 및 속성 추가
    const btn = document.createElement("button");
    btn.textContent = value;
    btn.classList.add("custom", "active");

    // 삭제 아이콘 추가
    const del = document.createElement("span");
    del.textContent = "✕";
    del.className = "delete-btn";
    btn.appendChild(del);

    // 목록에 추가
    topicsContainer.appendChild(btn);
    customTopicInput.value = ""; // 입력창 초기화
    saveSettings();              // 저장
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
  // 초기화 (저장된 설정 불러오기 및 UI 반영)
  // ------------------------------------------------------------
  (async function init() {
    const { settings, customTopics } = await readStore();

    // 온/오프 상태 반영
    mainToggle.checked = !!settings.isEnabled;
    updateUiEnabledState(mainToggle.checked);

    // 필터 강도 반영
    strengthSlider.value = String(settings.strength || "2");

    // 기본 토픽 버튼 상태 반영
    document.querySelectorAll(".topics button").forEach((btn) => {
      const label = btn.textContent.trim();
      btn.classList.toggle("active", settings.selectedTopics.includes(label));
    });

    // 커스텀 토픽 복원
    customTopics.forEach((text) => {
      const btn = document.createElement("button");
      btn.textContent = text;
      btn.classList.add("custom");
      if (settings.selectedTopics.includes(text))
        btn.classList.add("active");

      // 삭제 버튼 추가
      const del = document.createElement("span");
      del.textContent = "✕";
      del.className = "delete-btn";
      btn.appendChild(del);

      topicsContainer.appendChild(btn);
    });

    // 대응 방식 라디오 초기화
    const method = settings.method || "block";
    const radio = document.querySelector(
      `input[name="response-method"][value="${method}"]`
    );
    if (radio) radio.checked = true;
  })();

  // ------------------------------------------------------------
  // 설정 저장 함수 (스토리지 반영)
  // ------------------------------------------------------------
  async function saveSettings() {
    // 대응 방식 읽기
    const selectedRadio = document.querySelector(
      'input[name="response-method"]:checked'
    );
    const method = selectedRadio ? selectedRadio.value : "block";

    // 모든 주제 버튼 수집
    const btns = Array.from(document.querySelectorAll(".topics button"));

    // 활성화된 주제만 추출
    const selectedTopics = btns
      .filter((b) => b.classList.contains("active"))
      .map((b) => b.textContent.replace("✕", "").trim());

    // 커스텀 주제 목록 추출
    const customTopics = btns
      .filter((b) => b.classList.contains("custom"))
      .map((b) => b.textContent.replace("✕", "").trim());

    // 최종 설정 객체 구성
    const next = {
      isEnabled: !!mainToggle.checked,
      strength: String(strengthSlider.value || "2"),
      method,
      selectedTopics,
    };

    // 저장 수행
    await writeStore(next, customTopics);
  }

});
