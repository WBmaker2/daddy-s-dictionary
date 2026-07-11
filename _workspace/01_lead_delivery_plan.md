# Lead Delivery Plan

## Project Summary
- Project name: 선생님의 영단어 사전
- Delivery goal: `v1.1.0` 검색·데이터·접근성·오프라인 품질 개선을 완료하고, 다음 안정화 마일스톤을 위한 운영 handoff를 남긴다.
- Launch target: `v1.1.0` 완료. 다음 목표는 `v1.1.x` 안정화 또는 `v1.2` 범위 확정이며, Cloudflare Pages 운영 배포를 유지한다.
- Decision owner: 저장소 소유자 / 제품 책임자

## Acceptance Checks
- [x] 핵심 페이지 구조가 단일 페이지 검색 앱 기준으로 정리되었다
- [x] 정적 데이터 로드 계약과 브라우저 기능 경계가 문서화되었다
- [x] 프론트엔드와 데이터/백엔드 역할 경계가 분리되었다
- [x] 디자인 워커 산출물이 실제 레이아웃 검토를 통과했다 (390x844 검색 패널 위치, 카드 액션, 키보드 포커스 확인)
- [x] QA와 릴리즈 기준이 최신 빌드 기준으로 검증되었다 (`npm run verify`, 데스크톱/모바일 Playwright, legacy 서비스워커 업그레이드와 오프라인 재로드)

## Delivery Phases
### Phase 1. Brief and Scope
- Inputs:
  - [00_project_brief.md](/Volumes/DATA/Dev/Codex/daddy's-dictionary/_workspace/00_project_brief.md)
  - [README.md](/Volumes/DATA/Dev/Codex/daddy's-dictionary/README.md)
  - 현재 운영 중인 정적 PWA 코드와 데이터 파일
- Open questions:
  - 고등 표현 묶음 추가 시점
  - 학습 기록 기능의 우선순위
- Exit criteria:
  - 단일 페이지 유지 여부와 다음 마일스톤 범위가 명확하다
  - 모바일 우선 UX 목표가 합의되었다

### Phase 2. Contracts
- Needed decisions:
  - 데이터 파일별 필수/선택 로드 규칙
  - 음성 API 실패 시 fallback 문구
  - 결과 카드에서 일반 단어와 표현의 상세 영역 처리 규칙
- Risks:
  - 브라우저 기능 지원 편차로 UX가 달라질 수 있다
  - 데이터 파일 shape가 어긋나면 앱 전체 부팅이 실패할 수 있다
- Exit criteria:
  - [02_interface_contracts.md](/Volumes/DATA/Dev/Codex/daddy's-dictionary/_workspace/02_interface_contracts.md)에 정적 fetch 계약과 UI 상태가 정리되었다

### Phase 3. Design
- Pages to design:
  - 홈/검색/결과 일체형 단일 페이지
  - 모바일 portrait에서의 헤더, 검색창, 결과 우선순위
  - 정보 아코디언 확장 상태와 결과 카드 상태
- Responsive priorities:
  - P0: 모바일 세로
  - P1: 태블릿 가로
  - P2: 데스크톱 넓은 화면
- Exit criteria:
  - [03_design_wireframes.md](/Volumes/DATA/Dev/Codex/daddy's-dictionary/_workspace/03_design_wireframes.md)와 [03_design_handoff.md](/Volumes/DATA/Dev/Codex/daddy's-dictionary/_workspace/03_design_handoff.md)가 완성되었다
  - 첫 화면에서 검색창이 바로 보이는 레이아웃 기준이 명확하다

### Phase 4. Parallel Build
- Frontend ownership:
  - [index.html](/Volumes/DATA/Dev/Codex/daddy's-dictionary/index.html)
  - [styles.css](/Volumes/DATA/Dev/Codex/daddy's-dictionary/styles.css)
  - [app.js](/Volumes/DATA/Dev/Codex/daddy's-dictionary/app.js)
  - [manifest.webmanifest](/Volumes/DATA/Dev/Codex/daddy's-dictionary/manifest.webmanifest)
- Backend ownership:
  - [scripts/generate-data.mjs](/Volumes/DATA/Dev/Codex/daddy's-dictionary/scripts/generate-data.mjs)
  - [scripts/check-data.mjs](/Volumes/DATA/Dev/Codex/daddy's-dictionary/scripts/check-data.mjs)
  - `data/*.json`
  - 서비스 워커 캐시 입력 목록
- Shared integration points:
  - 카테고리 enum과 라벨
  - `word` 엔트리 shape
  - optional dictionary file 404 허용 규칙
  - 예문/표현 상세 표시 규칙
- Exit criteria:
  - UI와 데이터 파일이 동일한 contract를 사용한다
  - 데이터 갱신 후 앱 부팅과 검색 흐름이 유지된다

### Phase 5. QA
- Core flows:
  - 빈 검색 상태 확인
  - 영어 검색 / 한국어 검색
  - 카테고리 필터 전환
  - 발음 듣기
  - 말하기 점검
  - 오프라인 재접속
- Failure paths:
  - 데이터 로드 실패
  - 말하기 점검 권한 거부
  - 음성 인식 네트워크 오류
- Exit criteria:
  - [05_qa_release_report.md](/Volumes/DATA/Dev/Codex/daddy's-dictionary/_workspace/05_qa_release_report.md)에 go/no-go 기준이 기록된다
  - 치명적 blocker가 없거나 명확한 우회가 정리된다

### Phase 6. Release
- Deploy target: Cloudflare Pages production + preview deployments
- Rollback note: 이전 성공 배포 또는 이전 Git 커밋으로 되돌린 뒤 Pages 재배포
- Exit criteria:
  - [06_release_handoff.md](/Volumes/DATA/Dev/Codex/daddy's-dictionary/_workspace/06_release_handoff.md)에 빌드/배포/롤백 절차가 정리된다
  - 프로덕션 URL 스모크 테스트가 통과한다

## Worker Plan
### wireframe-designer
- Purpose: 검색 중심 학습 UX를 유지하면서 첫 화면 정보 밀도를 줄이는 와이어프레임과 responsive 규칙을 정리한다.
- Reads:
  - [00_project_brief.md](/Volumes/DATA/Dev/Codex/daddy's-dictionary/_workspace/00_project_brief.md)
  - [02_interface_contracts.md](/Volumes/DATA/Dev/Codex/daddy's-dictionary/_workspace/02_interface_contracts.md)
  - 현재 [index.html](/Volumes/DATA/Dev/Codex/daddy's-dictionary/index.html) / [styles.css](/Volumes/DATA/Dev/Codex/daddy's-dictionary/styles.css)
- Writes:
  - [03_design_wireframes.md](/Volumes/DATA/Dev/Codex/daddy's-dictionary/_workspace/03_design_wireframes.md)
  - [03_design_handoff.md](/Volumes/DATA/Dev/Codex/daddy's-dictionary/_workspace/03_design_handoff.md)
- Success criteria:
  - 모바일 첫 화면에 검색 입력이 빠르게 노출된다
  - 데스크톱/태블릿에서 공백 낭비 없이 정보 계층이 유지된다

### nextjs-frontend-builder
- Purpose: 현재 정적 PWA 구조를 기준으로 UI, 접근성, 상호작용을 개선한다. Next.js 전환은 명시적 이득이 있을 때만 제안한다.
- Reads:
  - [00_project_brief.md](/Volumes/DATA/Dev/Codex/daddy's-dictionary/_workspace/00_project_brief.md)
  - [02_interface_contracts.md](/Volumes/DATA/Dev/Codex/daddy's-dictionary/_workspace/02_interface_contracts.md)
  - [03_design_handoff.md](/Volumes/DATA/Dev/Codex/daddy's-dictionary/_workspace/03_design_handoff.md)
- Writes:
  - [04_frontend_build_notes.md](/Volumes/DATA/Dev/Codex/daddy's-dictionary/_workspace/04_frontend_build_notes.md)
- Success criteria:
  - 검색, 결과, 음성 버튼, 정보 아코디언이 설계와 일치한다
  - 주요 브레이크포인트에서 레이아웃이 무너지지 않는다

### api-backend-builder
- Purpose: 데이터 생성/검증/캐시 계약을 정리하고, 정적 JSON 기반의 backend 역할을 명확히 문서화한다.
- Reads:
  - [00_project_brief.md](/Volumes/DATA/Dev/Codex/daddy's-dictionary/_workspace/00_project_brief.md)
  - [02_interface_contracts.md](/Volumes/DATA/Dev/Codex/daddy's-dictionary/_workspace/02_interface_contracts.md)
  - [scripts/check-data.mjs](/Volumes/DATA/Dev/Codex/daddy's-dictionary/scripts/check-data.mjs)
- Writes:
  - [04_backend_build_notes.md](/Volumes/DATA/Dev/Codex/daddy's-dictionary/_workspace/04_backend_build_notes.md)
- Success criteria:
  - 데이터 파일 shape가 문서화되고 검증 경로가 정리된다
  - optional 파일 부재 시 앱 동작 원칙이 명확하다

### qa-release-worker
- Purpose: 검색, 음성, 오프라인 핵심 흐름을 브라우저 기준으로 확인하고 릴리즈 가능 여부를 정리한다.
- Reads:
  - [00_project_brief.md](/Volumes/DATA/Dev/Codex/daddy's-dictionary/_workspace/00_project_brief.md)
  - [02_interface_contracts.md](/Volumes/DATA/Dev/Codex/daddy's-dictionary/_workspace/02_interface_contracts.md)
  - [04_frontend_build_notes.md](/Volumes/DATA/Dev/Codex/daddy's-dictionary/_workspace/04_frontend_build_notes.md)
  - [04_backend_build_notes.md](/Volumes/DATA/Dev/Codex/daddy's-dictionary/_workspace/04_backend_build_notes.md)
- Writes:
  - [05_qa_release_report.md](/Volumes/DATA/Dev/Codex/daddy's-dictionary/_workspace/05_qa_release_report.md)
  - [06_release_handoff.md](/Volumes/DATA/Dev/Codex/daddy's-dictionary/_workspace/06_release_handoff.md)
- Success criteria:
  - go/no-go 판단 근거가 남는다
  - 브라우저 기능 제한이 release caveat로 명확히 문서화된다

## Risks and Dependencies
- Risk: `SpeechRecognition` 지원이 브라우저마다 다르다
  - Impact: 말하기 점검이 일부 환경에서 동작하지 않거나 네트워크 의존성이 생긴다
  - Mitigation: 지원 감지, 권한/네트워크 오류 문구, QA 매트릭스 분리
- Risk: 데이터 정제 규칙이 수작업 지식에 의존한다
  - Impact: 새 단어/표현 추가 시 품질 편차가 생길 수 있다
  - Mitigation: 생성 스크립트와 수동 보정 목록을 계속 문서화
- Risk: 정적 JSON 크기 증가
  - Impact: 초기 부팅 시간이 늘고 캐시 갱신이 무거워질 수 있다
  - Mitigation: payload 통계 추적, category별 분리 여부를 추후 검토

## Notes
- Assumptions:
  - 현재 마일스톤은 단일 페이지 구조를 유지한다
  - 서버 저장형 기능은 넣지 않는다
  - Cloudflare Pages 기반 정적 배포를 계속 사용한다
- Deferred scope:
  - 사용자별 학습 기록
  - 로그인/권한
  - 관리자용 데이터 편집 UI
