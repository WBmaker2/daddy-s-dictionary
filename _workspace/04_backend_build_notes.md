# Backend Build Notes

> Release target: v1.1.0 RC

## Ownership
- Routes owned:
  - 별도 HTTP API route 없음
  - 정적 데이터 fetch 대상 파일이 사실상 backend contract 역할을 한다
- Services owned:
  - 데이터 생성 스크립트
  - 데이터 검증 스크립트
  - 서비스 워커 캐시 목록 유지
- Data layer touched:
  - `data/words.json`
  - `data/supplemental-words.json`
  - `data/textbook-expressions.json`
  - `data/example-sentences.json`

## Implemented Work
- Completed endpoints:
  - 정적 JSON payload 제공
  - 필수 base payload와 선택 payload를 구분한 초기화 계약
- Validation rules added:
  - `scripts/check-data.mjs`로 카테고리 수치, payload 무결성, 예문 연결 상태 점검
  - strict 검증은 사전 항목과 예문 연결을 `3,489/3,489`로 요구한다
  - 데이터 생성 스크립트로 공식 어휘 + 보충 표현 + 예문 병합
- Pending backend work:
  - 데이터 스키마 버전 필드 추가 검토
  - expression/example sentence 품질 자동 점검 강화
  - 장기적으로 관리용 API 또는 원격 CMS 필요 여부 판단

## Response Contracts
- Stable response shapes:
  - 사전 payload: `{ generatedAt, sources, stats, words }`
  - 예문 payload: `{ items: [{ id, exampleSentence }] }`
- Known temporary fields:
  - `speakText`는 표현/숙어 발음 개선용 보조 필드로 계속 유지할지 추후 결정 필요
- Error codes used:
  - 선택 payload는 load, HTTP 응답, JSON parse, payload shape, merge/apply의 모든 오류에서 한국어 경고를 내고 base dictionary로 fallback한다
  - 필수 `words.json`은 load, HTTP 응답, JSON parse, payload shape 오류가 fatal이며 재시도 가능한 bootstrap 오류 화면으로 간다

## Current Data and Release Contract
- Current payload counts:
  - base 3,000개: 초등 800, 중학 1,200, 고등 1,000
  - supplemental 407개, 교과서형 표현 82개: 초등 표현 50, 중학 표현 32
  - 병합 검색 대상 3,489개와 예문 3,489개는 strict check에서 `3,489/3,489`로 일치해야 한다
- Search ranking:
  - 대표 표제어 정확 일치 500, 영어 키워드 정확 일치 480, 한국어 키워드 정확 일치 460
  - 영어/한국어 prefix 320/300, contains 180/160, 동점은 낮은 `id` 우선
  - 빈 검색은 낮은 `id` 순이며 UI는 6개로 시작해 12개씩 전체 결과까지 노출한다
- Release build:
  - `npm run build:pages`는 `dist-pages`에 data JSON을 minified JSON으로 복사한다
  - build가 생성한 release key로 HTML/CSS/JS/runtime module/data와 service worker cache key를 같은 세대에 고정한다

## Verification
- Commands run:
  - `npm run generate:data`
  - `npm run check:data`
  - 필요 시 `node --check app.js`
  - 필요 시 `node --check sw.js`
  - release gate: `npm run verify` (`test:data`, data check, Pages build, Playwright)
- Routes tested:
  - 정적 파일 fetch만 사용
- Failure paths tested:
  - 선택 JSON의 load/HTTP/parse/shape/merge 오류와 base fallback 경고
  - 기본 dictionary fetch/parse/shape 실패와 재시도
  - 서비스 워커 fallback 응답

## Deployment Requirements
- Env vars: 없음
- External services:
  - 브라우저 음성 API
- Seed/setup tasks:
  - 데이터 JSON 최신 상태 확인
  - `sw.js` 캐시 목록과 build-generated release key 확인
  - `dist-pages`의 minified JSON과 같은 세대의 release asset 확인

## Handoff to QA
- What is ready:
  - 데이터 공급원과 검증 스크립트
  - 정적 배포용 payload 구조
- What needs frontend confirmation:
  - 새 category나 새 필드 추가 시 UI 렌더링 영향
  - 음성 피드백과 데이터 텍스트 조합이 자연스러운지 여부
