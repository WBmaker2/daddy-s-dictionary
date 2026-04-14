# 선생님의 영단어 사전 프로젝트 컨텍스트

## 한눈에 보기
- 프로젝트명: 선생님의 영단어 사전
- 현재 버전: `v1.0.7`
- 실제 작업 경로: `/Users/kimhongnyeon/Dev/codex/daddy's-dictionary`
- 원격 저장소: `https://github.com/WBmaker2/daddy-s-dictionary.git`
- 운영 배포: `https://daddy-s-dictionary.pages.dev/`
- 배포 방식: GitHub `main` 브랜치와 연결된 Cloudflare Pages 자동 배포

## 프로젝트 목적
2022 개정교육과정 기준 영어 어휘와 교과서형 표현을 학교급별로 검색하고, 한국어 뜻, 예시 문장 또는 설명, 영어 발음 듣기, 말하기 점검까지 한 번에 제공하는 오프라인 우선 웹앱이다.

핵심 사용자는 초등·중등 학생과 보호자 또는 교사다. 현재 제품 방향은 "첫 화면에서 바로 검색 가능", "모바일 우선", "정적 데이터 기반의 빠른 탐색", "오프라인에서도 가능한 한 많은 기능 유지"에 맞춰져 있다.

## 현재 기능 범위
- 영어/한국어 양방향 검색
- 카테고리 필터
  - 초등학교 필수 영단어
  - 중학교 필수 영단어
  - 고등학교 필수 영단어
  - 초등 표현·숙어
  - 중학 표현·숙어
  - 확장 어휘·표현
- 결과 카드에서 한국어 뜻 + 예시 문장 또는 표현 설명 제공
- 브라우저 `speechSynthesis` 기반 발음 듣기
- 브라우저 `SpeechRecognition` 기반 말하기 점검
- excellent 판정 시 축하음 재생
- 서비스 워커 기반 오프라인 캐시
- 모바일/태블릿/데스크톱 반응형 레이아웃

## 데이터 현황
현재 로드 기준 총 데이터 수는 `3,489`개다.

카테고리별 구성:
- 초등: `800`
- 중등: `1200`
- 고등: `1000`
- 초등 표현: `50`
- 중학 표현: `32`
- 확장 어휘·표현: `407`

데이터 소스 파일:
- [data/words.json](/Users/kimhongnyeon/Dev/codex/daddy's-dictionary/data/words.json)
- [data/supplemental-words.json](/Users/kimhongnyeon/Dev/codex/daddy's-dictionary/data/supplemental-words.json)
- [data/textbook-expressions.json](/Users/kimhongnyeon/Dev/codex/daddy's-dictionary/data/textbook-expressions.json)
- [data/example-sentences.json](/Users/kimhongnyeon/Dev/codex/daddy's-dictionary/data/example-sentences.json)

## 기술 구조
현재 앱은 프레임워크 없는 정적 PWA 구조다.

핵심 파일:
- 엔트리 HTML: [index.html](/Users/kimhongnyeon/Dev/codex/daddy's-dictionary/index.html)
- 스타일: [styles.css](/Users/kimhongnyeon/Dev/codex/daddy's-dictionary/styles.css)
- 앱 로직: [app.js](/Users/kimhongnyeon/Dev/codex/daddy's-dictionary/app.js)
- 서비스 워커: [sw.js](/Users/kimhongnyeon/Dev/codex/daddy's-dictionary/sw.js)
- PWA 메타: [manifest.webmanifest](/Users/kimhongnyeon/Dev/codex/daddy's-dictionary/manifest.webmanifest)
- 패키지 메타: [package.json](/Users/kimhongnyeon/Dev/codex/daddy's-dictionary/package.json)

현재 중요한 구현 특징:
- 앱은 부팅 시 여러 JSON 파일을 병렬 로드한 뒤 병합한다.
- `words.json`은 필수, 나머지 보조 파일은 `404`일 때 optional로 처리된다.
- 일반 단어는 `exampleSentence`가 있으면 `예시 문장`을 보여주고, 표현/숙어는 `설명`을 보여준다.
- 표현/숙어는 `speakText`를 우선 사용해 발음 듣기 문장을 자연스럽게 보정한다.
- 캐시 이름은 [sw.js](/Users/kimhongnyeon/Dev/codex/daddy's-dictionary/sw.js)의 `CACHE_NAME`으로 관리한다. 앱 셸이 바뀌면 이 값을 올려야 한다.

## 실행과 검증
기본 실행:

```bash
npm install
python3 -m http.server 4173
```

브라우저 접속:

```text
http://127.0.0.1:4173
```

데이터 재생성/검증:

```bash
npm run generate:data
npm run check:data
```

추가로 자주 보는 파일:
- 데이터 생성: [scripts/generate-data.mjs](/Users/kimhongnyeon/Dev/codex/daddy's-dictionary/scripts/generate-data.mjs)
- 데이터 검증: [scripts/check-data.mjs](/Users/kimhongnyeon/Dev/codex/daddy's-dictionary/scripts/check-data.mjs)
- 보충 단어 엑셀 반영: [scripts/import-wordbook-xls.py](/Users/kimhongnyeon/Dev/codex/daddy's-dictionary/scripts/import-wordbook-xls.py)
- 교과서 표현 생성: [scripts/generate-textbook-expressions.mjs](/Users/kimhongnyeon/Dev/codex/daddy's-dictionary/scripts/generate-textbook-expressions.mjs)
- 예문 생성: [scripts/generate-example-sentences.mjs](/Users/kimhongnyeon/Dev/codex/daddy's-dictionary/scripts/generate-example-sentences.mjs)

## 배포 메모
- `main` 브랜치에 푸시하면 Cloudflare Pages가 자동 배포한다.
- 서비스 URL은 [https://daddy-s-dictionary.pages.dev/](https://daddy-s-dictionary.pages.dev/) 이다.
- 사용자에게 보이는 제목을 바꾸거나 앱 셸을 바꿨다면 서비스 워커 캐시 이름도 같이 올리는 편이 안전하다.

## 음성 기능 제약
- 발음 듣기:
  - `speechSynthesis`를 사용한다.
  - 대체로 오프라인에서도 동작 가능하지만 브라우저 엔진 차이가 있다.
- 말하기 점검:
  - `SpeechRecognition` 또는 `webkitSpeechRecognition`에 의존한다.
  - 일부 브라우저/기기에서 미지원일 수 있다.
  - 네트워크 연결이나 마이크 권한이 필요할 수 있다.

## 하네스와 작업 문서
이 저장소에는 다음 작업을 위한 하네스 문서가 이미 들어 있다.

핵심 문서:
- [PROJECT_CONTEXT.md](/Users/kimhongnyeon/Dev/codex/daddy's-dictionary/PROJECT_CONTEXT.md)
- [README.md](/Users/kimhongnyeon/Dev/codex/daddy's-dictionary/README.md)
- [_workspace/00_project_brief.md](/Users/kimhongnyeon/Dev/codex/daddy's-dictionary/_workspace/00_project_brief.md)
- [_workspace/01_lead_delivery_plan.md](/Users/kimhongnyeon/Dev/codex/daddy's-dictionary/_workspace/01_lead_delivery_plan.md)
- [_workspace/02_interface_contracts.md](/Users/kimhongnyeon/Dev/codex/daddy's-dictionary/_workspace/02_interface_contracts.md)

에이전트/스킬 문서:
- [agents/website-tech-lead.md](/Users/kimhongnyeon/Dev/codex/daddy's-dictionary/agents/website-tech-lead.md)
- [agents/wireframe-designer.md](/Users/kimhongnyeon/Dev/codex/daddy's-dictionary/agents/wireframe-designer.md)
- [agents/nextjs-frontend-builder.md](/Users/kimhongnyeon/Dev/codex/daddy's-dictionary/agents/nextjs-frontend-builder.md)
- [agents/api-backend-builder.md](/Users/kimhongnyeon/Dev/codex/daddy's-dictionary/agents/api-backend-builder.md)
- [agents/qa-release-worker.md](/Users/kimhongnyeon/Dev/codex/daddy's-dictionary/agents/qa-release-worker.md)

참고:
- `_workspace` 안의 일부 문서는 예전 절대경로(`/Volumes/DATA/...`) 링크가 남아 있을 수 있다.
- 실제 작업은 현재 경로 `/Users/kimhongnyeon/Dev/codex/daddy's-dictionary`를 기준으로 보면 된다.

## 다음 작업자가 바로 알면 좋은 것
- 제품 핵심은 "사전 검색 경험"이다. 새 기능을 넣더라도 검색창과 결과가 첫 화면에서 밀리지 않게 유지해야 한다.
- 현재 구조는 단순하지만 `app.js`에 로직이 많이 모여 있다. 검색, 렌더링, 음성 기능을 나누는 리팩터링 여지는 있다.
- 데이터 확장 작업은 기능 추가보다 회귀 위험이 크다. 새 JSON이나 category를 추가할 때는 `app.js`, `index.html`, `sw.js`, `scripts/check-data.mjs`를 함께 확인해야 한다.
- 사용자 요청에 따라 버전 숫자는 미세하게 계속 올리는 규칙이 있다.

## 이번 문서 작성 시점의 변경
- 앱 표시 이름을 `아빠의 영단어 사전`에서 `선생님의 영단어 사전`으로 변경
- 버전을 `v1.0.7`로 상향
- 이어받기용 루트 문서 `PROJECT_CONTEXT.md` 추가
