# Interface Contracts

> Release target: v1.1.0 RC

## 1. Page Inventory
| Page | Route | Purpose | Requires Data | Notes |
|------|-------|---------|---------------|------|
| Home | `/` | 검색, 카테고리 필터, 결과 탐색, 발음 듣기, 말하기 점검을 한 화면에서 제공 | `words.json` 필수, `supplemental-words.json` 선택, `textbook-expressions.json` 선택, `example-sentences.json` 선택 | 오프라인 fallback 진입점도 동일 route 사용 |
| PWA install / relaunch | `/` | 홈 화면 설치 후 재방문 시 동일 앱 로딩 | 캐시된 HTML/CSS/JS/data | 별도 install page 없음 |

## 2. Shared UI States
- Loading: `사전 데이터를 불러오는 중입니다.` 상태 텍스트와 비어 있는 결과 영역
- Empty:
  - 검색어 없음: 검색 안내 문구 노출
  - 검색 결과 없음: 철자/카테고리 재확인 안내
- Warning: 선택 데이터의 load, parse, payload shape, merge/apply 실패는 전용 한국어 경고를 표시하고 기본 3,000단어 검색으로 fallback
- Error: 필수 `words.json`의 load 또는 payload shape 실패는 재시도 가능한 전역 오류 화면으로 표시, 이전 캐시가 있으면 cached shell 유지
- Success: 검색 결과 카드 렌더링, 결과 수 갱신, 선택된 카테고리 기준 상태 문구 노출
- Permission denied: 마이크 권한 거부 시 카드 피드백과 상단 배너에 권한 필요 문구 노출

## 3. Frontend to Backend Contracts
| Flow | Trigger | Request Shape | Response Shape | Error Shape |
|------|---------|---------------|----------------|-------------|
| Core dictionary bootstrap | 앱 초기 로드 | `GET ./data/words.json` | `{ generatedAt?, sources?, stats: {}, words: Word[] }` | load/parse/shape 실패는 fatal이며 재시도 가능 |
| Supplemental dictionary bootstrap | 앱 초기 로드 | `GET ./data/supplemental-words.json` | `{ generatedAt?, sources?, stats: {}, words: Word[] }` | 모든 load/parse/shape/merge 실패는 경고 후 무시 |
| Textbook expressions bootstrap | 앱 초기 로드 | `GET ./data/textbook-expressions.json` | `{ generatedAt?, sources?, stats: {}, words: Word[] }` | 모든 load/parse/shape/merge 실패는 경고 후 무시 |
| Example sentence bootstrap | 앱 초기 로드 | `GET ./data/example-sentences.json` | `{ items: [{ id, exampleSentence }] }` | 모든 load/parse/shape/merge 실패는 경고 후 무시 |

### 3.1 Word Entry Shape
```json
{
  "id": 1,
  "word": "apple",
  "forms": ["apple", "apples"],
  "category": "elementary",
  "categoryLabel": "초등학교 필수 영단어",
  "categoryDescription": "초등학교 필수 영단어",
  "pronunciationIpa": "ˈæp.əl",
  "speakText": "apple",
  "koreanGlosses": ["사과"],
  "koreanDefinitions": ["사과, 사과 열매"],
  "searchKeywords": {
    "english": ["apple", "apples"],
    "korean": ["사과"]
  },
  "exampleSentence": "I eat an apple after lunch."
}
```

### 3.2 Category Enum
- `all`
- `elementary`
- `middle`
- `high`
- `elementary-expressions`
- `middle-expressions`
- `supplemental`

## 4. Form Contracts
### Search and Filter Form
- Fields:
  - `query`: 자유 입력 문자열
  - `category`: category enum
- Client validation:
  - `trim()` 후 빈 문자열 허용
  - 영어는 소문자/공백 정규화
  - 한국어는 연속 공백 정리
- Server validation: 없음
- Success behavior:
  - 검색 결과는 최초 6개를 표시하고, `결과 12개 더 보기`로 12개씩 전체 결과가 소진될 때까지 표시
  - UI는 명시적 페이지 제한을 사용하므로 60개에서 멈추지 않으며, `result-count`에는 전체 수와 현재 표시 수를 함께 표시
  - 호환성 helper `filterWords()`는 호출자가 제한을 전달하지 않으면 기존처럼 최대 60개를 반환
  - `result-count`와 상태 텍스트 갱신
- Failure behavior:
  - 결과 없음 안내 또는 bootstrap 오류 상태 표시

### Pronunciation Check Action
- Fields:
  - 대상 `word`
  - 브라우저 음성 인식 capability
- Client validation:
  - `SpeechRecognition` 또는 `webkitSpeechRecognition` 존재 확인
  - 마이크 권한 오류/네트워크 오류 분기
- Server validation: 없음
- Success behavior:
  - 카드 피드백 문구와 상단 배너에 결과 노출
  - excellent 시 축하음 재생
- Failure behavior:
  - 미지원 브라우저, 권한 거부, 네트워크 오류에 맞는 문구 표시

## 5. Auth and Session
- Auth type: 없음
- Protected routes: 없음
- Anonymous routes: `/`
- Session storage rule: 검색 상태는 메모리 상태만 사용, 영속 저장 없음
- Redirect behavior: 없음

## 6. Content and SEO
- Metadata requirements:
  - 제목: `선생님의 영단어 사전`
  - 설명: 교육과정 영단어/표현 검색과 발음/말하기 점검을 설명하는 한국어 메타 설명
- Open Graph requirements:
  - 현재는 선택 사항
  - 후속 릴리즈에서 부모 공유용 OG 이미지 추가 가능
- Sitemap/robots requirements:
  - 단일 페이지라 간단한 sitemap으로 충분
  - 검색 인덱싱 차단 요구는 없음
- Structured data needs: 현재 없음

## 7. Integration Rules
- Third-party service: Browser Speech Synthesis
  - Purpose: 영어 단어/표현 발음 듣기
  - Trigger: `발음 듣기` 버튼 클릭
  - Failure fallback: 카드 피드백에 미지원 문구 표시
- Third-party service: Browser Speech Recognition
  - Purpose: 말하기 점검
  - Trigger: `말하기 점검` 버튼 클릭
  - Failure fallback: 미지원/권한/네트워크 오류별 피드백 표시
- Third-party service: Service Worker Cache
  - Purpose: 앱 shell과 데이터 파일 오프라인 유지
  - Trigger: install, activate, fetch
  - Failure fallback: 캐시 미존재 시 기본 `index.html` fallback

## 8. Deployment Preconditions
- Required env vars: 없음
- Seed data or setup tasks:
  - `npm install`
  - 필요 시 `npm run generate:data`
  - `npm run check:data`
- External accounts needed:
  - GitHub 연동 Cloudflare Pages 프로젝트
  - 로컬 데이터 재생성용 원본 자료 접근권

## 9. Open Questions
- Question: 고등 표현·숙어 카테고리를 이번 계획에 포함할지?
  - Owner: 제품 책임자
  - Deadline: 다음 데이터 확장 스프린트 시작 전
- Question: 사용자의 최근 검색 또는 즐겨찾기를 로컬 저장할지?
  - Owner: 제품 책임자 + 프론트엔드 워커
  - Deadline: UI 확장 설계 전
