# WebPurifier 프런트 구조

WebPurifier의 프런트엔드 구조는 기능(feature)을 기준으로 나눈 구조로 바꿈
재사용 가능성을 생각해서 common 폴더를 만듬.
popup : 사용자 인터페이스(UI)를 담당하는 폴더(UI는 보기 좋게 / JS는 데이터와 로직만 관리)
background: content(페이지 내부 코드)와 popup(설정창) 사이의 중앙 통신(제어 및 통신 중심)
content: 웹페이지 내부에서 작동하는 코드들, 페이지의 DOM에 직접 접근함(실제 동작 수행)
common: 공통적으로 쓰이는 로직 관리

------------------------------------------------------------------------------------------
```
WebPurifier/
│
├── manifest.json # Chrome 확장 프로그램 설정 파일 (버전, 권한, 실행 파일 등)
│
├── background/ # 백그라운드 스크립트 (확장 프로그램의 중앙 제어 로직)
│ └── index.js # content(페이지 내부 코드)와 popup(UI) 간의 통신 및 제어
│
├── content/ # 웹페이지 내부에서 실행되는 스크립트
│ ├── index.js # 텍스트 수집 및 블러 처리 트리거
│ ├── scanner.js # 페이지의 텍스트 노드 탐색 및 수집 로직
│ ├── applyBlur.js # 감지된 텍스트를 블러 처리하는 로직
│ └── content.css # WebPurifier의 블러(blur) 효과 스타일 정의
│
├── popup/ # 확장 팝업(UI)
│ ├── popup.html # 팝업 UI 구조 (필터 설정, 토픽 관리 등)
│ ├── popup.css # 팝업 UI 스타일
│ └── popup.js # UI 이벤트 처리 및 설정 저장 로직
│
├── common/ # 공통 유틸 및 상수 관리
│ ├── messages.js # 스크립트 간 메시지 타입 정의 (PROCESS_PAGE_TEXT 등)
│ ├── api.js # 백엔드 API 호출 (로컬 서버로 필터 요청)
│ └── storage.js # chrome.storage 기반 설정 읽기/쓰기 헬퍼
│
└── README.md # 프로젝트 구조 및 개발 가이드 (현재 파일)

```


