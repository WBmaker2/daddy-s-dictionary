# Design Handoff

## Visual Direction
- Typography:
  - 제목은 현재 한글 손글씨 계열 브랜드 톤 유지
  - 본문은 한글 가독성이 좋은 산세리프 계열 유지
  - 버전 배지는 본문 계열 폰트로 작고 또렷하게 처리
- Color system:
  - 배경은 따뜻한 종이색
  - 본문/헤더는 청록 계열 진한 색
  - 상태색은 성공/경고에만 제한적으로 사용
- Spacing rhythm:
  - 모바일 16~20px, 태블릿 20~24px, 데스크톱 24~32px 간격 중심
- Iconography:
  - 필수 아님, 텍스트 중심 정보 구조 유지
- Motion guidance:
  - 정보 아코디언 열림/닫힘 정도만 허용
  - 과한 장식 애니메이션 금지

## Component Priority
| Priority | Component | Reuse Scope | Notes |
|----------|-----------|-------------|------|
| P0 | Search input | Home | 첫 화면 즉시 노출 |
| P0 | Category select | Home | 필터 전환의 핵심 |
| P0 | Result card | Results list | 단어/표현 공통 카드 |
| P0 | Speak/check buttons | Result card | 음성 기능 진입점 |
| P1 | Info accordion | Home | 통계와 사용 가이드 묶음 |
| P1 | Pronunciation banner | Global | 말하기 점검 피드백 |
| P2 | Hero chips | Header | 핵심 특징 요약 |

## Responsive Rules
- Mobile-first breakpoints:
  - 기본 설계는 세로형 모바일
  - 약 `768px` 이상에서 2열/가로 확장 검토
- Tablet behavior:
  - 헤더는 압축 유지, 검색 패널과 결과가 빠르게 보이도록 상단 높이 제한
  - 아코디언 내부 통계는 2~3열 그리드 허용
- Desktop behavior:
  - 소개 문구는 한 줄 유지 우선
  - 헤더 우측 공백을 낭비하지 않고 카피 가로폭을 넓게 사용
- Max content width:
  - 와이드 화면에서도 `1600px` 안쪽 정렬 유지, 내부 카피 폭은 더 유연하게 허용

## Content Hierarchy
- Primary headline rules:
  - 제품명은 가장 크고 분명하게
  - 버전은 제목 끝에 작은 배지로 붙인다
- Supporting copy rules:
  - 소개 문구는 1문장만 유지
  - 긴 기능 설명은 아코디언 안으로 이동
- CTA label rules:
  - 버튼은 동사형으로 짧게
  - `발음 듣기`, `말하기 점검`, `검색 초기화` 유지
- Card summary rules:
  - `한국어 뜻`이 먼저, `예시 문장` 또는 `설명`이 다음
  - 카테고리 배지는 카드 헤드 우측에 유지

## Accessibility Notes
- Heading hierarchy:
  - 페이지당 `h1` 1개
  - 결과 카드 제목은 `h2`
  - 뜻/예문 섹션은 `h3`
- Focus behavior:
  - 입력창, 셀렉트, 버튼, summary에 명확한 포커스 스타일
- Color contrast expectations:
  - 배경과 본문 대비는 WCAG AA 이상 목표
- Form labeling requirements:
  - 검색어/카테고리 라벨을 눈에 보이게 유지
  - 상태 문구는 `role="status"`와 `aria-live` 유지

## Frontend Handoff Notes
- Must-match sections:
  - 헤더 밀도와 검색창 우선순위
  - 결과 카드 구조
  - 말하기 점검 피드백 흐름
- Flexible sections:
  - 요약 칩 수와 카피
  - 통계 카드 배치
- Deferred polish:
  - 설치 유도 UI
  - OG 이미지/공유 카드
  - 학습 기록 및 즐겨찾기 인터랙션
