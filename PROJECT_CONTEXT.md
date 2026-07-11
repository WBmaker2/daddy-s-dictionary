# 선생님의 영단어 사전 프로젝트 컨텍스트

## 한눈에 보기
- 현재 버전: `v1.1.0`
- 실제 작업 경로: `/Users/kimhongnyeon/Dev/codex/daddy's-dictionary`
- 원격 저장소: `https://github.com/WBmaker2/daddy-s-dictionary.git`
- 운영 배포: `https://daddy-s-dictionary.pages.dev/`
- 구조: 프레임워크 없는 정적 PWA (`index.html`, `styles.css`, `app.js`, 서비스워커)

## 제품과 검색 계약
- 초등·중등·고등 학생, 보호자, 교사가 교육과정 기준 단어와 교과서형 표현을 빠르게 확인하는 도구다.
- 검색은 정확한 표제어, 영어 대체 표기, 한국어 정확 일치, 접두 일치, 포함 일치 순으로 정렬한다.
- 초기/새 검색은 6개를 표시하고 `결과 12개 더 보기`로 12개씩 추가한다. 결과 문구는 `총 N개 중 M개 표시`로 전체와 표시 수를 구분한다.
- 기본 `words.json` 3,000개는 필수다. 확장·표현·예문 JSON은 선택 데이터여서 실패해도 기본 검색은 동작하고, 필수 데이터 실패 시 재시도 UI를 표시한다.

## 데이터 현황
- 병합 데이터: `3,489`개
- 기본: `3,000`개 (초등 800, 중등 1,200, 고등 1,000)
- 확장: `407`개
- 교과서 표현: `82`개 (초등 50, 중학 32)
- 예문: `3,489/3,489`개. strict 검증의 기본·확장·교과서 표현 커버리지 임계값은 모두 `1.0`이다.
- 배포 빌드는 JSON을 축소하며, 현재 측정값은 3,860,414바이트에서 2,648,684바이트로 31.39% 감소다.

## 접근성과 오프라인
- 검색과 결과에는 명명된 섹션 헤딩이 있고, 키보드 포커스는 강한 `:focus-visible` 윤곽으로 표시된다.
- 화면 상태 문구는 즉시 바뀌며, 숨김 라이브 영역은 250ms 디바운스 후 알린다. 카드 피드백, 데이터 경고, 네트워크/발음 배너, 오프라인 칩은 독립 상태 영역이다.
- 오프라인 칩 상태는 `오프라인 준비 중`, `오프라인 사용 준비됨`, `온라인에서 사용 가능`, `오프라인 준비 실패`다.
- `speechSynthesis` 발음 듣기는 오프라인에서도 브라우저 지원 범위에서 동작할 수 있다. 말하기 점검은 음성 인식 지원, 권한, 네트워크에 따라 제한된다.

## 빌드와 릴리스 게이트

```bash
npm run verify
```

- `verify`는 `test:data`, `check:data`, `build:pages`, `test:e2e`를 실행한다.
- Playwright는 데스크톱과 390x844 모바일에서 초기 6개 카드, `유산 -> asset`, `a`의 총 1,596개, 18개 페이지네이션, 키보드 포커스, 모바일 넘침과 첫 화면 높이를 검사한다.
- 서비스워커 필수 프리캐시는 앱 셸, 데이터, 로컬 제목 폰트, 런타임 모듈을 포함한다.
- 캐시 버전은 수동으로 올리지 않는다. `scripts/generate-cache-version.mjs`가 앱/서비스워커의 재귀 런타임 모듈 폐쇄와 프리캐시 정적 자산을 바탕으로 빌드 시 생성한다.

## 로컬 운영

```bash
npm install
npm run generate:data
npm run import:data:supplemental -- path/to/wordbook.xls
npm run check:data
npm run build:pages
python3 -m http.server 4173 --directory dist-pages
```

- 로컬 스모크 URL: `http://127.0.0.1:4173/`
- 운영 스모크 URL: `https://daddy-s-dictionary.pages.dev/`
- 데이터가 이미 커밋되어 있으면 전체 데이터 생성은 생략할 수 있다. 데이터 변경 뒤에는 `npm run check:data`와 `npm run verify`를 실행한다.
- 현재 앱과 Cloudflare Pages 배포에는 환경 변수가 필요하지 않다.

## 배포와 롤백

- `main` 브랜치로 푸시하면 연결된 Cloudflare Pages가 자동 배포한다.
- 배포 후 운영 URL에서 첫 6개 카드, `유산 -> asset`, 검색·오프라인 상태 칩을 스모크 확인한다.
- 문제가 생기면 Cloudflare Pages의 이전 성공 배포로 롤백하거나, 이전 정상 Git 커밋을 되돌려 `main`에 푸시해 다시 배포한다.

## 주요 파일
- `lib/dictionary-logic.js`: 검색 순위와 데이터 병합
- `lib/search-view-state.js`: 6개 초기 표시와 12개 추가 페이지네이션
- `lib/live-announcer.js`: 주입 가능한 타이머 기반 250ms 라이브 알림 디바운스
- `lib/load-recovery.js`: 필수 데이터 로드 실패와 재시도 UI
- `lib/offline-status.js`: 오프라인 준비 상태 추적
- `sw.js`: 프리캐시와 오프라인 라우팅
- `scripts/build-pages.mjs`: `dist-pages/` 생성 및 JSON 축소
