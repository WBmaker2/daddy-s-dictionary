# Frontend Build Notes

> Release target: v1.1.0 RC

## Ownership
- Paths owned:
  - `index.html`
  - `styles.css`
  - `app.js`
  - `manifest.webmanifest`
- Routes owned:
  - `/`
- Shared components touched:
  - hero
  - update history details overlay
  - search panel
  - info accordion
  - result card
  - pronunciation banner

## Implemented Work
- Completed pages:
  - 단일 페이지 홈/검색/결과 뷰
- Completed components:
  - 검색 입력 / 카테고리 셀렉트 / 초기화 버튼
  - 정보 아코디언과 통계 바
  - Hero의 `업데이트 내역` 네이티브 `<details>` 제어와 fixed 오버레이 패널
  - 결과 카드 렌더링
  - 발음 듣기 / 말하기 점검 액션
- Pending frontend work:
  - 브라우저별 음성 기능 안내 문구 세분화
  - 설치 유도와 캐시 갱신 UX 개선
  - 장기적으로는 컴포넌트 분해 또는 React/Next.js 전환 필요성 검토

## Data Integration
- Endpoints consumed:
  - `./data/words.json`
  - `./data/supplemental-words.json`
  - `./data/textbook-expressions.json`
  - `./data/example-sentences.json`
- Mock data used: 없음, 운영용 정적 데이터 파일을 직접 소비
- Contract mismatches:
  - 선택 데이터의 load/HTTP/parse/shape/merge 오류는 모두 경고 후 base dictionary fallback으로 처리한다
  - 필수 base data의 load/HTTP/parse/shape 오류만 retry 가능한 fatal bootstrap으로 처리한다

## Current Behavior
- Search:
  - 빈 검색은 낮은 `id` 순, 검색어는 대표 표제어 정확 500, 영어 정확 480, 한국어 정확 460, 영어/한국어 prefix 320/300, contains 180/160 순으로 정렬하고 동점은 낮은 `id`를 우선한다
  - UI는 6개로 시작하고 `결과 12개 더 보기`로 전체 결과가 소진될 때까지 노출한다.
  - 현재 병합 데이터는 3,489개이며 strict 예문 연결은 `3,489/3,489`이다.
- Status regions:
  - 선택 데이터 fallback 경고는 `#data-warning`, base bootstrap 재시도는 `.load-failure`, 오프라인 상태는 `#offline-status-chip`, 검색/발음의 live 안내는 `#search-announcer`와 `#pronunciation-banner`로 분리한다.
- Offline release:
  - Pages build는 `dist-pages/data/*.json`을 minified JSON으로 생성한다.
  - build-generated release key가 HTML/CSS/JS/module/data query와 service worker cache name을 같은 세대로 고정한다.
- Update history:
  - v1.1.0 RC에서 Hero의 작은 `업데이트 내역`은 키보드와 클릭으로 열리는 native `<details>`이며, 고정 오버레이 패널이므로 닫힌 상태에서 검색 패널을 아래로 밀지 않는다.
  - 기록은 `<time datetime>`의 `2026-03-14` 첫 개발과 `2026-07-12` v1.1.0 개선으로 제공한다.

## Verification
- Commands run:
  - `npm run verify` (Node contract/data tests, data check, build, Playwright release gate)
- Manual flows checked:
  - 검색/필터/결과 수 갱신
  - 발음 듣기 클릭
  - 말하기 점검 시작과 배너 갱신
  - 모바일/태블릿/데스크톱 반응형 확인
- Accessibility checks:
  - 라벨 노출
  - 상태 문구 `aria-live`
  - 키보드 진입과 `<details>` 열기/닫기, `<time>` 노출, 모바일 fixed 오버레이의 뷰포트 경계를 확인

## Risks
- Risk: `app.js`에 UI/데이터/음성 로직이 많이 모여 있다
  - Impact: 기능 추가 시 회귀 위험이 커질 수 있다
  - Suggested fix: 검색, 렌더링, 음성 기능 모듈로 점진 분리
- Risk: 헤더 카피와 반응형 폭 조정이 미세한 레이아웃 회귀를 일으킬 수 있다
  - Impact: 특정 브라우저 폭에서 문장 줄바꿈이 다시 생길 수 있다
  - Suggested fix: 브레이크포인트별 시각 QA 캡처 기준 문서화

## Handoff to QA
- What is ready:
  - 사용자 기준 핵심 탐색/음성 흐름
  - 카테고리 기반 검색과 결과 카드
  - 오프라인 우선 셸
- What needs backend confirmation:
  - 각 데이터 JSON의 shape 안정성
  - 새 데이터 추가 시 서비스 워커 캐시 키 갱신 규칙
