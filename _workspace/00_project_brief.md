# Project Brief

## 1. Project Snapshot
- Project name: 선생님의 영단어 사전
- One-line summary: 2022 개정교육과정 기준 영단어와 교과서형 표현을 학교급별로 검색하고, 발음 듣기와 말하기 점검까지 제공하는 오프라인 우선 학습용 사전 웹앱
- Delivery type: Hybrid educational PWA
- Current stage: `v1.1.0` 기준 Cloudflare Pages에서 운영 중인 단일 페이지 웹앱
- Next milestone: `v1.1.0` 안정화와 배포 관찰을 마친 뒤 `v1.1.x` 핫픽스 또는 `v1.2` 기능 범위를 결정
- Primary contact / decision owner: 저장소 소유자 / 제품 결정권자

## 2. Business Goal
- Why this project exists: 자녀와 학습자가 교육과정 기준 어휘를 빠르게 찾고, 뜻과 발음, 말하기 연습까지 한 화면에서 끝낼 수 있게 한다.
- Primary success metric: 모바일 기준 10초 이내에 원하는 단어 또는 표현을 찾고 발음을 재생할 수 있다.
- Secondary success metrics:
  - 오프라인 상태에서도 검색과 발음 듣기 흐름이 유지된다.
  - 학교급 카테고리와 표현 묶음을 혼동 없이 탐색할 수 있다.
  - 말하기 점검이 지원 브라우저에서 실패 없이 시작되고 결과 피드백을 제공한다.
- What must be true at launch:
  - `words.json`, `supplemental-words.json`, `textbook-expressions.json`, `example-sentences.json`이 일관된 형태로 로드된다.
  - 검색, 카테고리 필터, 발음 듣기, 말하기 점검, 오프라인 캐시가 모두 동작한다.
  - 모바일 세로 화면에서 검색창과 결과가 첫 화면에 가깝게 보인다.

## 3. Target Users
- Primary audience: 초등학생 자녀를 둔 보호자와 초등·중학생 학습자
- Secondary audience: 고등학생, 영어 보충학습이 필요한 학생, 가정에서 단어를 함께 점검하는 보호자
- Key user problems:
  - 교과 수준에 맞는 단어/표현을 빠르게 찾기 어렵다.
  - 뜻만 확인하는 것이 아니라 발음도 같이 듣고 싶다.
  - 인터넷이 약한 환경에서도 계속 쓸 수 있어야 한다.
- Devices to optimize first: Mobile web first, then tablet landscape, then desktop

## 4. Scope
### Pages
- Required pages:
  - `/` 단일 페이지 홈 겸 검색 페이지
- Optional pages:
  - 향후 `도움말` 또는 `데이터 출처` 페이지
- Pages that can wait until phase 2:
  - 학습 기록/즐겨찾기 페이지
  - 관리자용 데이터 검수 페이지

### Features
- Must-have features:
  - 영어/한국어 양방향 검색
  - 학교급/표현 카테고리 필터
  - 뜻, 예시 문장 또는 표현 설명 표시
  - `speechSynthesis` 기반 발음 듣기
  - `SpeechRecognition` 기반 말하기 점검
  - 서비스 워커 기반 오프라인 캐시
- Nice-to-have features:
  - 최근 검색어, 즐겨찾기, 오답 복습
  - 발음 연습 점수 이력
  - 학년별 추천 세트 보기
- Out of scope:
  - 로그인/회원 기능
  - 서버 저장형 학습 기록
  - 결제, 알림, 교사 대시보드

### Content
- Existing content source:
  - `data/words.json`
  - `data/supplemental-words.json`
  - `data/textbook-expressions.json`
  - `data/example-sentences.json`
- Missing content:
  - 더 정제된 표현 설명
  - 고교 수준 표현 묶음
  - 학습용 예문 추가 검수
- Need CMS or static content only: 현재는 정적 JSON 기반이면 충분하다.

## 5. Brand and Design Direction
- Tone: 따뜻하고 신뢰감 있는 교육용, 부모와 아이가 함께 쓰기 쉬운 분위기
- Visual references: 종이 사전과 학습 카드의 친근함, 넓은 여백, 한글 가독성이 좋은 정보 설계
- Colors or brand assets: 종이색 배경, 차분한 청록 계열 텍스트, 과한 강조색 최소화
- What the UI should feel like: 빠르게 찾고 바로 이해되는 학습 도구
- What to avoid: 광고처럼 보이는 요소, 과도한 카드 나열, 모바일 첫 화면에서 검색창이 밀려나는 구조

## 6. Frontend Direction
- Current frontend stack: 정적 `index.html` + `styles.css` + `app.js` + PWA 구성
- Preferred frontend direction:
  - 현재 마일스톤에서는 불필요한 프레임워크 마이그레이션 없이 기존 구조를 정리한다.
  - 멀티페이지, 계정, 서버 렌더링 요구가 생기면 그때 Next.js App Router 전환을 검토한다.
- SEO requirements:
  - 한국어 제목/설명 메타 유지
  - 공유용 OG 메타는 추후 추가 가능
- Accessibility requirements:
  - 키보드 접근 가능한 검색/버튼/아코디언
  - 명확한 `aria-live` 상태 문구
  - 모바일 입력 요소와 터치 타깃 충분히 확보
- Internationalization needed: 현재는 한국어 UI + 영어 어휘 콘텐츠로 충분

## 7. Backend / API Direction
- Current backend shape: 별도 서버 API 없음, 정적 JSON + 브라우저 내 음성 API + 데이터 생성 스크립트 중심
- Backend role in this harness:
  - 데이터 생성/정제 스크립트 관리
  - JSON 스키마 일관성 검증
  - 향후 필요 시 Next.js route handler 또는 별도 API 후보 설계
- Authentication needed: 없음
- Data storage needed: Git에 버전 관리되는 정적 JSON 파일
- Third-party integrations:
  - 브라우저 `speechSynthesis`
  - 브라우저 `SpeechRecognition` 또는 `webkitSpeechRecognition`
- Admin or internal tools required: 현재는 필요 없음

## 8. Deployment and Operations
- Hosting target: Cloudflare Pages
- Environment variables expected: 없음
- Analytics / monitoring:
  - 현재는 수동 스모크 테스트 중심
  - 추후 Cloudflare Web Analytics 정도는 검토 가능
- Domain or staging requirements:
  - production: `https://daddy-s-dictionary.pages.dev/`
  - Git 연동 preview 배포 유지

## 9. QA and Release Criteria
- Core user flows that must pass:
  - 검색어 입력 후 결과 노출
  - 카테고리 변경 후 결과 갱신
  - 발음 듣기 클릭 후 음성 재생
  - 말하기 점검 시작과 결과 메시지 표시
  - 오프라인 재방문 시 캐시된 앱 로드
- Error states that must be tested:
  - 데이터 파일 로드 실패
  - 음성 합성 미지원
  - 마이크 권한 거부
  - 네트워크 없이 음성 인식 실패
- Browser/device coverage:
  - iPhone Safari
  - Android Chrome
  - iPad landscape Safari/Chrome
  - Desktop Chrome/Safari
- Release blocker examples:
  - 검색 결과가 0개로 고정되는 문제
  - 카테고리 통계/결과 수 불일치
  - 서비스 워커가 오래된 데이터를 계속 보여주는 문제

## 10. Notes for the Lead Agent
- Missing decisions:
  - 고등 표현 묶음을 이번 마일스톤에 넣을지 여부
  - 오프라인 설치 유도 UI 필요 여부
  - 추후 학습 기록을 로컬 저장할지 서버 저장할지 여부
- Technical risks:
  - 브라우저별 음성 인식 지원 편차
  - 데이터 정제 규칙이 늘어날수록 수동 검수 비용 증가
  - 정적 JSON 증가에 따른 초기 로드 시간 증가
- Dependencies on external teams: 없음
- Suggested first worker fan-out:
  - `wireframe-designer`: 홈/검색/결과 와이어프레임 정리
  - `nextjs-frontend-builder`: 기존 정적 UI를 기준으로 인터랙션/접근성 개선안 작성
  - `api-backend-builder`: 데이터 스키마와 생성/검증 체계 정리
  - `qa-release-worker`: 핵심 흐름 스모크 시나리오 문서화

## Kickoff Prompt
```markdown
현재 `_workspace/00_project_brief.md`를 기준으로 선생님의 영단어 사전 하네스를 가동해줘.
먼저 `_workspace/01_lead_delivery_plan.md`와 `_workspace/02_interface_contracts.md`를 확정하고,
그 다음 디자인, 프론트엔드, 데이터/백엔드, QA 워커를 순서대로 조율해줘.
이번 마일스톤은 "검색 중심의 오프라인 우선 학습 UX 유지"가 핵심이며,
불필요한 프레임워크 전환보다 현재 구조를 명확히 정리하는 것을 우선한다.
```
