# Backend Build Notes

## Ownership
- Routes owned:
  - 별도 HTTP API route 없음
  - 정적 데이터 fetch 대상 파일이 사실상 backend contract 역할을 한다
- Services owned:
  - 데이터 생성 스크립트
  - 데이터 검증 스크립트
  - 서비스 워커 캐시 목록 유지
- Data layer touched:
  - [data/words.json](/Volumes/DATA/Dev/Codex/daddy's-dictionary/data/words.json)
  - [data/supplemental-words.json](/Volumes/DATA/Dev/Codex/daddy's-dictionary/data/supplemental-words.json)
  - [data/textbook-expressions.json](/Volumes/DATA/Dev/Codex/daddy's-dictionary/data/textbook-expressions.json)
  - [data/example-sentences.json](/Volumes/DATA/Dev/Codex/daddy's-dictionary/data/example-sentences.json)

## Implemented Work
- Completed endpoints:
  - 정적 JSON payload 제공
  - optional payload `404` 허용 정책
- Validation rules added:
  - `scripts/check-data.mjs`로 카테고리 수치, payload 무결성, 예문 연결 상태 점검
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
  - HTTP `404`는 optional file에 한해 허용
  - 그 외 비정상 응답은 bootstrap failure로 취급

## Verification
- Commands run:
  - `npm run generate:data`
  - `npm run check:data`
  - 필요 시 `node --check app.js`
  - 필요 시 `node --check sw.js`
- Routes tested:
  - 정적 파일 fetch만 사용
- Failure paths tested:
  - optional JSON 부재
  - 기본 dictionary fetch 실패
  - 서비스 워커 fallback 응답

## Deployment Requirements
- Env vars: 없음
- External services:
  - Cloudflare Pages
  - 브라우저 음성 API
- Seed/setup tasks:
  - 데이터 JSON 최신 상태 확인
  - `sw.js` 캐시 목록과 버전 키 갱신 여부 확인
  - Pages 빌드 산출물 확인

## Handoff to QA
- What is ready:
  - 데이터 공급원과 검증 스크립트
  - 정적 배포용 payload 구조
- What needs frontend confirmation:
  - 새 category나 새 필드 추가 시 UI 렌더링 영향
  - 음성 피드백과 데이터 텍스트 조합이 자연스러운지 여부
