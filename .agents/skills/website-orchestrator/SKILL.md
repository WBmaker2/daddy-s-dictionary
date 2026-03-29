---
name: website-orchestrator
description: 풀스택 웹사이트를 와이어프레임부터 배포까지 조율할 때 사용하는 리더용 스킬. 사용자가 웹사이트 구축, Next.js 프론트엔드와 API 백엔드 동시 진행, 디자인-구현-QA-배포 파이프라인 조율을 원하면 이 스킬을 사용한다.
---

# Website Orchestrator

리더는 범위 확정, 계약 정의, 워커 팬아웃, 통합, 릴리즈 판단을 맡는다.

## 언제 쓰는가
- 새 웹사이트 프로젝트를 팀 단위로 조율할 때
- 디자인, 프론트엔드, 백엔드, QA를 병렬 또는 단계형으로 운영할 때
- Next.js와 API 계층을 함께 납품해야 할 때

## 실행 절차
1. brief와 저장소 맥락을 읽고 완료 조건을 정리한다.
2. `update_plan`에 단계와 의존성을 적는다.
3. `_workspace/01_lead_delivery_plan.md`에 범위, 위험, 완료 조건을 기록한다.
4. `_workspace/02_interface_contracts.md`에 페이지, 데이터 계약, 실패 상태, 배포 전제조건을 기록한다.
5. 독립 작업만 `spawn_agent`로 위임한다.
   - 디자인: [wireframe-designer](/Volumes/DATA/Dev/Codex/daddy's-dictionary/agents/wireframe-designer.md)
   - 프론트엔드: [nextjs-frontend-builder](/Volumes/DATA/Dev/Codex/daddy's-dictionary/agents/nextjs-frontend-builder.md)
   - 백엔드: [api-backend-builder](/Volumes/DATA/Dev/Codex/daddy's-dictionary/agents/api-backend-builder.md)
   - QA: [qa-release-worker](/Volumes/DATA/Dev/Codex/daddy's-dictionary/agents/qa-release-worker.md)
6. 디자인 산출물이 핵심 흐름을 고정하면 프론트와 백엔드를 병렬 실행한다.
7. 통합 후 QA를 호출하고 결과를 `_workspace/05_qa_release_report.md`에서 회수한다.
8. 최종 판단과 배포 인수인계를 `_workspace/06_release_handoff.md`에 남긴다.

## 산출물 규칙
- 작업 계획: `_workspace/01_lead_delivery_plan.md`
- 인터페이스 계약: `_workspace/02_interface_contracts.md`
- 최종 배포 인수인계: `_workspace/06_release_handoff.md`

## 주의점
- 계약 없이 프론트와 백엔드를 동시에 시작하지 않는다.
- 모든 큰 결정은 `_workspace/` 파일로 남긴다.
- QA는 마지막 1회가 아니라 통합 직후 바로 붙인다.
