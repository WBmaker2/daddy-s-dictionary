# Design Wireframes

## Sitemap
- Primary navigation:
  - 단일 페이지 구조, 별도 상단 내비게이션 없음
- Secondary navigation:
  - 카테고리 셀렉트
  - `사전 정보 보기` 아코디언
- Footer sections:
  - 현재 필수 아님
  - 추후 데이터 출처/버전/문의 영역 추가 가능

## User Flows
### Flow 1. 단어 검색
- Entry point: 앱 첫 진입 후 검색창
- Main steps:
  - 검색어 입력
  - 필요 시 카테고리 선택
  - 결과 카드 확인
  - 뜻과 예시 문장/설명 확인
- Success state: 최대 60개 결과 중 상위 일치 결과가 바로 노출된다
- Failure state: 결과 없음 안내 또는 데이터 로드 오류 상태가 표시된다

### Flow 2. 발음 듣기와 말하기 점검
- Entry point: 결과 카드의 `발음 듣기` 또는 `말하기 점검` 버튼
- Main steps:
  - 단어 카드에서 버튼 선택
  - 발음 듣기 또는 음성 인식 시작
  - 피드백 문구 확인
- Success state:
  - 발음 듣기: 카드 피드백과 함께 음성이 재생된다
  - 말하기 점검: 상단 배너에 결과가 표시되고 excellent면 축하음이 난다
- Failure state:
  - 브라우저 미지원, 마이크 권한 거부, 네트워크 오류 문구가 보인다

### Flow 3. 오프라인 재방문
- Entry point: 설치된 앱 또는 캐시된 브라우저 탭 재방문
- Main steps:
  - 앱 shell 로드
  - 캐시된 데이터 읽기
  - 검색 또는 발음 듣기 사용
- Success state: 검색/발음 듣기가 유지된다
- Failure state: 캐시가 비어 있으면 기본 셸만 보이거나 재연결 안내가 필요하다

## Page Wireframes
### Home
- Hero:
  - 상단 eyebrow
  - 큰 제목 + 버전 배지
  - 한 줄 소개
  - 2~3개의 요약 칩
- Proof / trust section:
  - 별도 신뢰 섹션보다 검색 패널을 즉시 노출
- Key CTA:
  - 검색 입력창 자동 시선 유도
- Supporting sections:
  - 카테고리 셀렉트
  - 상태 텍스트
  - `사전 정보 보기` 아코디언
  - 결과 목록
- Mobile notes:
  - 첫 화면에서 제목 아래 곧바로 검색창이 보여야 한다
  - 정보/통계는 접힌 상태가 기본이다
  - 결과 카드는 세로 스택으로 정리한다
- Desktop notes:
  - 소개 문구는 가능한 한 줄 유지
  - 헤더 여백은 넓되 검색창이 below-the-fold로 밀리지 않게 한다

### Secondary Page
- Purpose: 현재 마일스톤에서는 없음
- Blocks: 추후 `도움말` 또는 `데이터 출처` 페이지 후보
- CTA: 홈으로 돌아가 검색 시작
- Mobile notes: phase 2까지 보류
- Desktop notes: phase 2까지 보류

## Shared Component Notes
- Header:
  - 제목, 버전, 한 줄 소개, 요약 칩만 남겨 밀도를 낮춘다
- Footer:
  - 현재는 생략 가능
- Cards:
  - 결과 카드는 `한국어 뜻`, `예시 문장/설명`, 액션 버튼으로 고정
- Forms:
  - 검색 입력과 카테고리 셀렉트가 P0
  - 상태 텍스트와 초기화 버튼은 보조 레이어
- Alerts / banners:
  - 말하기 점검 배너는 일시적 상태 메시지용
  - 오프라인/온라인 배너는 시스템 안내용

## State Coverage
- Loading states:
  - 앱 부팅 중 상태 텍스트
- Empty states:
  - 검색 전 안내
  - 결과 없음
- Error states:
  - 데이터 로드 실패
  - 음성 기능 미지원
  - 마이크 권한 거부
- Confirmation states:
  - 발음 듣기 시작
  - 말하기 점검 listening
  - 말하기 점검 완료
