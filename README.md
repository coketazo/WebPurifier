# WebPurifier

**WebPurifier**는 AI 기술을 활용하여 웹 브라우징 중 마주치는 유해 콘텐츠를 실시간으로 필터링해주는 브라우저 확장 프로그램 솔루션입니다.

사용자의 웹페이지 내 텍스트(주로 한국어)를 실시간으로 분석하여, 설정된 카테고리에 따라 유해하다고 판단되는 내용을 자동으로 블러(Blur) 처리하여 시각적으로 차단합니다. 또한, 사용자의 피드백(강화/약화)을 통해 필터링 정확도를 지속적으로 개선할 수 있는 구조를 갖추고 있습니다.

## 🌟 주요 기능 (Key Features)

- **실시간 콘텐츠 필터링**: 웹페이지 로딩 시 텍스트 노드를 감지하여 분석 전 임시 블러 처리 후, AI 판별 결과에 따라 차단 또는 복원합니다.
- **뷰포트 우선 처리**: 현재 사용자가 보고 있는 화면(Viewport) 내의 텍스트를 우선적으로 처리하여 쾌적한 브라우징 경험을 제공합니다.
- **사용자 맞춤형 설정**:
  - 필터링 기능을 언제든지 켜고 끌 수 있는 토글 스위치 제공.
  - 차단하고 싶은 카테고리를 직접 선택 및 관리 가능.
- **피드백 시스템**:
  - **오탐 신고 (약화)**: 차단된 콘텐츠가 정상일 경우 피드백을 보내 AI 모델을 개선합니다.
  - **미탐 신고 (강화)**: 차단되지 않은 유해 텍스트를 드래그하여 신고할 수 있습니다.
- **보안 인증**: JWT 기반의 회원가입 및 로그인 시스템을 통해 안전하게 서비스를 이용할 수 있습니다.

## 🛠 기술 스택 (Tech Stack)

### Backend
- **Language**: Python 3.13+
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (ASGI Web Framework)
- **Database**: PostgreSQL (w/ `pgvector` for Vector Search), SQLAlchemy, Alembic
- **AI/ML**: Google GenAI (Gemini), Sentence Transformers, Vector Embeddings
- **Infrastructure**: Docker Compose, AWS SAM (Serverless Application Model), Mangum

### Frontend (Browser Extension)
- **Core**: Chrome Extension Manifest V3
- **Framework**: [React](https://react.dev/), TypeScript
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Communication**: REST API (with Backend)

## 🚀 시작하기 (Getting Started)

이 프로젝트는 백엔드 서버와 프론트엔드 확장 프로그램으로 구성되어 있습니다.

### 사전 요구 사항 (Prerequisites)
- **OS**: Linux (Arch/EndeavourOS 권장), macOS, Windows
- **Backend**: [uv](https://github.com/astral-sh/uv) (Python 패키지 매니저), [Docker](https://www.docker.com/) & Docker Compose
- **Frontend**: Node.js 18+ (LTS 권장), npm 9+

---

### 1. 백엔드 설정 및 실행 (Backend Setup)

데이터베이스와 API 서버를 실행합니다.

```bash
# 저장소 클론
git clone https://github.com/coketazo/WebPurifier.git
cd WebPurifier/backend

# PostgreSQL 데이터베이스 실행 (Docker)
docker compose up -d

# 의존성 설치 및 개발 서버 실행 (uv 사용)
uv run uvicorn main:app --reload
```
> **참고**: Google GenAI 등을 사용하기 위한 API Key 설정이 필요할 수 있습니다. 환경 변수 설정 파일(`.env` 등)을 확인하거나 `main.py`의 설정을 참고하세요.

---

### 2. 프론트엔드 설정 및 빌드 (Frontend Setup)

Chrome 확장 프로그램을 빌드하여 브라우저에 로드합니다.

```bash
cd ../frontend

# 의존성 설치
npm install

# 프로덕션 빌드 (dist 폴더 생성)
npm run build
```

### 3. Chrome 확장 프로그램 로드

1. Chrome 브라우저를 열고 주소창에 `chrome://extensions`를 입력합니다.
2. 우측 상단의 **개발자 모드(Developer mode)** 를 켭니다.
3. **압축해제된 확장 프로그램을 로드(Load unpacked)** 버튼을 클릭합니다.
4. `WebPurifier/frontend/dist` 폴더를 선택하여 로드합니다.

## 📖 사용 방법 (Usage)

1. 브라우저 우측 상단 퍼즐 아이콘에서 **WebPurifier**를 클릭하여 팝업을 엽니다.
2. **회원가입/로그인**을 진행하여 인증 토큰을 발급받습니다.
3. 토글 스위치를 **ON**으로 설정하면 필터링이 시작됩니다.
4. 웹 서핑 중 텍스트가 블러 처리된 경우:
   - 유해한 내용이 맞다면 그대로 둡니다.
   - 오탐(정상 내용)이라면 블러된 영역 우측 상단 패널에서 **약화** 버튼을 클릭하여 피드백을 보냅니다.
5. 유해한데 차단되지 않은 텍스트가 있다면:
   - 해당 텍스트를 드래그한 후 나타나는 버튼을 통해 카테고리를 선택하고 **강화** 피드백을 보냅니다.

## 📞 연락처 (Contact)

프로젝트 관련 문의사항은 아래로 연락해 주세요.

*   **GitHub**: [@coketazo](https://github.com/coketazo)

---
**Copyright © 2025 WebPurifier Team. All Rights Reserved.**
