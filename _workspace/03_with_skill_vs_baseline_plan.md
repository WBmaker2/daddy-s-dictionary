# With-Skill vs Baseline Plan

## 목적
이 하네스가 스킬 없이 즉흥적으로 조율하는 방식보다 더 일관된 산출물과 핸드오프를 만드는지 비교한다.

## 비교 방식
- With-skill:
  - [website-orchestrator](/Volumes/DATA/Dev/Codex/daddy's-dictionary/.agents/skills/website-orchestrator/SKILL.md)
  - 역할 파일과 `_workspace/` 규칙 사용
- Baseline:
  - 동일한 프롬프트를 스킬 없이 실행

## 테스트 프롬프트 후보
1. "스타트업 랜딩 페이지와 문의 API를 포함한 Next.js 사이트를 설계부터 배포까지 조율해줘."
2. "로그인, 대시보드, REST API, QA를 포함한 SaaS MVP 웹앱 전달 체계를 구성해줘."

## 핵심 assertion
- `agents/` 역할이 명확히 분리되어 있다.
- `.agents/skills/`에 역할별 반복 절차가 있다.
- `_workspace/` 산출물 경로와 파일명이 충돌 없이 정의되어 있다.
- 리더의 orchestration 순서가 문서화되어 있다.
- QA 단계가 구현 후가 아니라 통합 직후 포함된다.

## 평가 메모
- 정량:
  - 역할 파일 수
  - 스킬 파일 수
  - `_workspace/` 산출물 정의 수
- 정성:
  - 워커에게 바로 전달 가능한가
  - 범위와 책임이 충돌하지 않는가
  - 다음 프로젝트에도 재사용 가능한가
