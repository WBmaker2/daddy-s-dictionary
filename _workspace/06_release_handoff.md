# Release Handoff: v1.1.0 Release Candidate

## Release Snapshot
- Project: 선생님의 영단어 사전
- Release target: `v1.1.0` release candidate
- Deploy target: Cloudflare Pages production, `https://daddy-s-dictionary.pages.dev/`
- Responsible owner: 저장소 소유자 / 제품 책임자

## Scope Completed
- 정확 검색 순위와 전체/표시 결과 수를 구분하는 6개 초기 + 12개 추가 페이지네이션
- 3,489/3,489 예문과 strict 1.0 커버리지 검증
- 선택 데이터 fallback과 필수 데이터 재시도 UI
- 반응형·접근성·로컬 제목 폰트·라이브 알림 개선
- build-generated versioned shell URL, legacy cache-first 서비스워커 업그레이드, versioned precache와 오프라인 재로드 회귀 검증

## Build and Deploy

```bash
npm install
npm run verify
```

- Build output: `dist-pages/`
- Deploy: 검토 후 `main`으로 푸시하면 Cloudflare Pages가 자동 배포한다.
- Required environment variables: 없음
- Local smoke URL: `http://127.0.0.1:4173/` (`python3 -m http.server 4173 --directory dist-pages`)
- Production smoke URL: `https://daddy-s-dictionary.pages.dev/`

## Pre-Release Checklist
- [x] 데이터 테스트와 strict 데이터 검사 통과
- [x] `npm run verify` 통과
- [x] 데스크톱과 390x844 모바일 검색·포커스·레이아웃 E2E 통과
- [x] legacy cache-first controller 아래 첫 방문 v1.1.0 동작과 오프라인 재로드 통과
- [x] 환경 변수 없음 확인
- [ ] 프로덕션 URL에서 배포 후 스모크 확인

## Post-Deploy Smoke
- 첫 화면에서 6개 카드가 표시되는지 확인
- `유산` 검색 결과 첫 카드가 `asset`인지 확인
- 넓은 `a` 검색이 전체 1,596개를 안내하고 `결과 12개 더 보기`가 18개까지 확장되는지 확인
- 오프라인 준비 칩 상태와 새로고침 후 기본 검색이 유지되는지 확인

## Rollback Plan
- Cloudflare Pages 대시보드에서 이전 성공 배포를 즉시 활성화한다.
- 또는 이전 정상 Git 커밋으로 되돌린 뒤 `main`에 푸시해 자동 재배포한다.
- 데이터 변경을 포함한 문제는 코드 롤백과 함께 이전 JSON 데이터를 복원하고 `npm run check:data`를 재실행한다.

## Residual Risks
- `SpeechRecognition`은 브라우저 지원, 권한, 네트워크 상태에 따라 제한된다.
- 제목용 한글 폰트는 오프라인 준비성을 위해 precache되므로 첫 캐시 용량을 늘린다.
- 다음 릴리스에서는 실제 Cloudflare 배포 직후의 브라우저 스모크와 cache-storage 크기를 관찰한다.

## Next Release
- `v1.1.x`: 운영 중 발견된 cache/voice/UI 핫픽스만 제한적으로 반영
- `v1.2`: 고등 표현 묶음 또는 학습 흐름 확장 여부를 제품 우선순위로 결정
