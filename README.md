# 선생님의 영단어 사전

2022 개정교육과정 기준 영어 기본 어휘 3,000개를 학교급별로 검색하고, 한국어 뜻과 발음 듣기, 말하기 점검을 제공하는 오프라인 우선 웹앱입니다.

## 주요 기능

- `초등학교 필수 영단어`, `중학교 필수 영단어`, `고등학교 필수 영단어`, `전체 영단어` 카테고리 검색
- 영어 검색과 한국어 검색 동시 지원
- 브라우저 `speechSynthesis` 기반 영어 발음 듣기
- 브라우저 `SpeechRecognition` 기반 말하기 점검
- 서비스 워커 기반 오프라인 캐시

## 실행 방법

1. 데이터 생성

```bash
npm install
npm run generate:data
```

2. 로컬 서버 실행

```bash
python3 -m http.server 4173
```

3. 브라우저에서 `http://127.0.0.1:4173` 열기

4. 데이터 검증

- `npm run check:data:strict`
- strict 모드에서는 예문 커버리지를 `base: 1.0`, `supplemental: 0.5`, `textbookExpressions: 0`으로 강제합니다.
- `npm run check:data:partial`
- partial 모드에서는 optional 파일이 없어도 `summary.exampleCoverage`를 보고하고 실패하지 않습니다.
- `npm run test:data`는 CLI 검증과 단위 테스트를 함께 실행합니다.

## 릴리스 게이트

```bash
npm run test:data
npm run check:data
npm run build:pages
node --check app.js
node --check sw.js
```

이미 생성된 `data/words.json`을 그대로 쓸 경우 1단계를 건너뛸 수 있습니다.

## 데이터 출처

- `kice-word-lister-guide.pdf`
  - 2022 개정 교육과정에 따른 `KICE Word Lister` 자료집
  - 학교급 표기 기준 추출에 사용
- `krdict-reader-master/dict.entries.in`
  - 공개 영한 사전 원본
  - 한국어 뜻과 설명 추출에 사용
- `curriculum-wordbook.pdf`
  - 한국어 간단 뜻과 IPA 보강용 보조 자료

생성 결과는 `data/words.json`, `data/supplemental-words.json`, `data/textbook-expressions.json`, `data/example-sentences.json`입니다.
앱 실행 자체에는 `data/words.json`만 있으면 되지만, `supplemental`, `textbook-expressions`, `example-sentences` 파일이 있으면 카테고리 확장과 예문 검색이 완성됩니다.

## 오프라인 관련 메모

- 검색과 발음 듣기는 앱과 데이터가 캐시된 뒤 오프라인에서도 계속 사용할 수 있습니다.
- 말하기 점검은 브라우저와 기기 정책에 따라 오프라인에서 제한될 수 있습니다.
