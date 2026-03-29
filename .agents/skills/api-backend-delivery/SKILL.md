---
name: api-backend-delivery
description: 웹사이트용 API, 서버 로직, 검증, 에러 처리, 데이터 계층을 구현할 때 사용하는 백엔드 스킬. REST/JSON 엔드포인트, Next.js route handlers, 인증/검증, 서버 통합 작업에서 사용한다.
---

# API Backend Delivery

백엔드 워커는 계약을 기준으로 안정적인 API를 구현한다.

## 실행 절차
1. `_workspace/02_interface_contracts.md`를 읽고 라우트와 shape를 확정한다.
2. 요청 검증, 성공 응답, 실패 응답을 모두 구현한다.
3. 필요한 env var, 외부 서비스, 시드 데이터 전제를 정리한다.
4. 실행한 검증 명령과 결과를 `_workspace/04_backend_build_notes.md`에 남긴다.

## 기대 출력
- 변경 파일 경로
- 라우트 목록과 응답 shape
- 실패 상태 처리 메모
- 배포 전제조건

## 하지 말 것
- 프론트엔드가 아직 사용하지 않는 기능을 과도하게 확장하지 않는다.
- 검증 로직 없이 happy path만 남기지 않는다.
