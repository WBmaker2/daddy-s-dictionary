# Frontend Build Notes

## Ownership
- Paths owned:
  - [index.html](/Volumes/DATA/Dev/Codex/daddy's-dictionary/index.html)
  - [styles.css](/Volumes/DATA/Dev/Codex/daddy's-dictionary/styles.css)
  - [app.js](/Volumes/DATA/Dev/Codex/daddy's-dictionary/app.js)
  - [manifest.webmanifest](/Volumes/DATA/Dev/Codex/daddy's-dictionary/manifest.webmanifest)
- Routes owned:
  - `/`
- Shared components touched:
  - hero
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
  - 현재까지는 `404` optional 파일 처리 규칙이 앱 내부에만 있어 문서화가 중요하다
  - 일반 단어와 표현의 상세 필드 사용 규칙을 UI가 암묵적으로 갖고 있다

## Verification
- Commands run:
  - `python3 -m http.server 4173`
  - 브라우저 스모크 테스트
- Manual flows checked:
  - 검색/필터/결과 수 갱신
  - 발음 듣기 클릭
  - 말하기 점검 시작과 배너 갱신
  - 모바일/태블릿/데스크톱 반응형 확인
- Accessibility checks:
  - 라벨 노출
  - 상태 문구 `aria-live`
  - 키보드 진입 가능 여부를 우선 확인

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
