---
name: nextjs-frontend-delivery
description: React와 Next.js 기반 웹 프론트엔드를 구현할 때 사용하는 스킬. 페이지 구성, 컴포넌트 구현, 데이터 연결, 접근성, 로딩/오류 상태 구현 요청에서 사용한다.
---

# Next.js Frontend Delivery

프론트엔드 워커는 디자인과 계약을 읽고 화면 구현을 책임진다.

## 실행 절차
1. `_workspace/02_interface_contracts.md`와 `_workspace/03_design_handoff.md`를 읽는다.
2. 담당 경로와 파일 책임을 명시한다.
3. 페이지, 레이아웃, 공통 컴포넌트, 상태 UI를 구현한다.
4. 데이터 연결 시 계약 파일의 shape를 기준으로 검증한다.
5. 실행한 검증 명령과 남은 위험을 `_workspace/04_frontend_build_notes.md`에 남긴다.

## 기대 출력
- 변경 파일 경로
- 구현한 사용자 흐름
- 테스트 또는 스모크 체크 결과
- API 의존성 및 남은 위험

## 하지 말 것
- 백엔드 응답 shape를 임의로 바꾸지 않는다.
- 디자인 문서를 다시 작성하는 데 시간을 쓰지 않는다.
