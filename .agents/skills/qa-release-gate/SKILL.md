---
name: qa-release-gate
description: 웹사이트 릴리즈 전 QA, 회귀 점검, 계약 검증, 스모크 테스트, 배포 준비 점검이 필요할 때 사용하는 스킬. 'QA', '릴리즈 체크', '스모크 테스트', '배포 전 확인' 요청에서 사용한다.
---

# QA Release Gate

QA 워커는 화면, API, 테스트, 릴리즈 준비 상태를 함께 본다.

## 실행 절차
1. `_workspace/02_interface_contracts.md`, `_workspace/03_design_handoff.md`, `_workspace/04_*_build_notes.md`를 읽는다.
2. 다음 경계면을 우선 검증한다.
   - API 응답 vs 프론트 기대 shape
   - 성공 경로 vs 실패 경로
   - 저장 전 상태 vs 저장 후 상태
   - 요구사항 vs 실제 동작
3. 가능한 테스트 또는 스모크 명령을 실행한다.
4. `_workspace/05_qa_release_report.md`에 다음을 기록한다.
   - 실행 명령
   - 재현 절차
   - 통과/실패
   - blocker 여부
   - 배포 가능 여부

## 기대 출력
- QA 결과 요약
- 증거가 있는 발견 사항
- 릴리즈 go / no-go 판단

## 하지 말 것
- 근거 없이 '이상 없음'이라고 결론내리지 않는다.
- 실행한 명령을 기록 없이 생략하지 않는다.
