# Website Delivery Pipeline Playbook

## 목표
웹사이트 프로젝트를 brief 수집, wireframe, UI/API 구현, QA, 배포 인수인계까지 일관된 흐름으로 운영한다.

## 리더 오케스트레이션
1. `update_plan`으로 단계와 의존성을 등록한다.
2. `_workspace/01_lead_delivery_plan.md`에 범위, 우선순위, 위험을 기록한다.
3. `_workspace/02_interface_contracts.md`에 페이지 목록, API shape, 실패 상태, 배포 전제를 기록한다.
4. 독립 작업을 `spawn_agent`로 위임한다.
5. 결과가 필요할 때만 `wait_agent`로 회수한다.
6. 보강 지시는 `send_input`으로 전달한다.
7. 끝난 워커는 `close_agent`로 정리한다.

## 단계별 흐름

### Phase 1. Brief and Scope
- 리더가 목표 사용자, 페이지 범위, 기능 범위, 배포 목표를 정리한다.
- 산출물: `01_lead_delivery_plan.md`

### Phase 2. Contracts and System Shape
- 리더가 화면과 API의 경계면을 정의한다.
- 산출물: `02_interface_contracts.md`

### Phase 3. Design
- 디자인 워커가 sitemap, 흐름, wireframe, responsive notes를 만든다.
- 산출물:
  - `03_design_wireframes.md`
  - `03_design_handoff.md`

### Phase 4. Parallel Build
- 프론트엔드와 백엔드를 병렬 실행한다.
- 산출물:
  - `04_frontend_build_notes.md`
  - `04_backend_build_notes.md`

### Phase 5. Integration and QA
- QA 워커가 계약과 구현을 비교하고 테스트한다.
- 산출물: `05_qa_release_report.md`

### Phase 6. Release Handoff
- 리더가 배포 순서, 환경 변수, 확인 결과, 남은 위험을 정리한다.
- 산출물: `06_release_handoff.md`

## 워커 시작 템플릿
- 목적
- 책임 범위
- 읽어야 할 파일 경로
- 남겨야 할 `_workspace/` 파일 경로
- 성공 기준

## 실패 처리 규칙
- 범위 이탈: 리더가 다시 경계를 정의한다.
- 입력 부족: 필요한 결정만 짧게 요청한다.
- QA blocker: `05_qa_release_report.md`에 즉시 승격한다.
