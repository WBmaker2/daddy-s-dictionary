# Full-Stack Website Harness Overview

## 목적
디자인, 프론트엔드(React/Next.js), 백엔드(API), QA 테스트를 와이어프레임부터 배포까지 파이프라인으로 조율하는 Codex 네이티브 팀 하네스를 제공한다.

## 역할 구성
- 리더: [website-tech-lead](/Volumes/DATA/Dev/Codex/daddy's-dictionary/agents/website-tech-lead.md)
- 디자인: [wireframe-designer](/Volumes/DATA/Dev/Codex/daddy's-dictionary/agents/wireframe-designer.md)
- 프론트엔드: [nextjs-frontend-builder](/Volumes/DATA/Dev/Codex/daddy's-dictionary/agents/nextjs-frontend-builder.md)
- 백엔드: [api-backend-builder](/Volumes/DATA/Dev/Codex/daddy's-dictionary/agents/api-backend-builder.md)
- QA/릴리즈: [qa-release-worker](/Volumes/DATA/Dev/Codex/daddy's-dictionary/agents/qa-release-worker.md)

## 기본 아키텍처
- 패턴: 리더-워커 팬아웃 + 단계형 파이프라인
- 병렬 단계:
  - 디자인 조사와 기술 범위 정리
  - 계약 확정 후 프론트엔드와 백엔드 구현
- 순차 단계:
  - brief 정리
  - 인터페이스 계약
  - 통합
  - QA 및 배포 인수인계

## 권장 산출물
- `01_lead_delivery_plan.md`
- `02_interface_contracts.md`
- `03_design_wireframes.md`
- `03_design_handoff.md`
- `04_frontend_build_notes.md`
- `04_backend_build_notes.md`
- `05_qa_release_report.md`
- `06_release_handoff.md`
