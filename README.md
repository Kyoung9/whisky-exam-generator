
# 요건정리

## AI 예상문제 생성 및 PDF 출력 웹 애플리케이션

## 1. 서비스 개요

본 서비스는 위스キーエキスパート 시험의 과거문제를 기반으로, AI가 출제 경향을 분석하고 예상문제를 생성하는 웹 애플리케이션이다.

사용자는 생성된 문제를 선택, 수정, 삭제, 추가, 재정렬할 수 있으며, 특정 문제와 유사한 문제를 만들거나 특정 테마의 문제를 추가 생성할 수 있다. 최종적으로 선택한 문제를 PDF 문제집 형태로 다운로드할 수 있다.

본 애플리케이션은 Vercel에 배포하는 것을 전제로 하며, 과거문제 PDF는 사용자가 업로드하는 방식이 아니라 개발자가 리포지토리에 미리 포함한다.

---

## 2. 전제 조건

### 2.1 과거문제 파일

과거문제 PDF는 리포지토리에 포함한다.

예상 파일 예시:

```txt
public/past-exams/
├─ we-2021.pdf
├─ we-2022.pdf
├─ we-2023.pdf
└─ we-2024.pdf
```

다만 현재 과거문제 PDF는 텍스트 PDF가 아니라 스캔 이미지 기반 PDF에 가깝다. 실제로 업로드된 2021〜2024년도 시험 파일은 텍스트 파싱이 되지 않고, 페이지 이미지로만 확인되는 형태이다. 따라서 앱 실행 중에 PDF에서 직접 텍스트를 추출하는 방식은 적합하지 않다.    

### 2.2 과거문제 데이터 관리 방식

PDF 원본은 보관용 또는 참고용으로 리포지토리에 넣는다.
실제 AI 문제 생성에는 PDF를 직접 사용하지 않고, 사전에 OCR 또는 수작업으로 정리한 JSON 데이터를 사용한다.

예상 구조:

```txt
src/data/exams/
├─ we-2021.json
├─ we-2022.json
├─ we-2023.json
└─ we-2024.json
```

---

## 3. 주요 기능

## 3.1 과거문제 데이터 선택 기능

사용자는 예상문제 생성에 사용할 과거문제 연도를 선택할 수 있다.

### 기능

```txt
- 2021년도 선택
- 2022년도 선택
- 2023년도 선택
- 2024년도 선택
- 전체 선택
```

### 목적

선택한 연도 데이터만 AI에게 전달하여, 특정 연도 또는 전체 경향을 기반으로 예상문제를 생성할 수 있도록 한다.

---

## 3.2 카테고리 선택 기능

사용자는 문제를 생성할 카테고리를 선택할 수 있다.

### 카테고리 예시

```txt
- Scotch Whisky
- Irish Whiskey
- American Whiskey
- Canadian Whisky
- Japanese Whisky
- World Whisky
```

올려준 과거문제에서도 위와 같은 카테고리 구성이 반복적으로 나타난다. 예를 들어 2024년도 문제는 Scotch Whisky, Irish Whiskey, American Whiskey, Canadian Whisky, Japanese Whisky 등의 섹션으로 구성되어 있다. 

---

## 3.3 문제 유형 선택 기능

사용자는 생성할 문제 유형을 선택할 수 있다.

### 문제 유형 예시

```txt
- 객관식 문제
- 정오 판단 문제
- 지도 기반 문제
- 연표 문제
- 매칭 문제
- 표 기반 문제
- 특정 설명에 해당하는 용어 선택 문제
```

과거문제에는 지도에서 증류소 위치를 고르는 문제, 연표의 빈칸을 채우는 문제, 증류소와 소유회사를 매칭하는 문제, 설명문 중 올바른 내용을 고르는 문제가 포함되어 있다. 

---

## 3.4 예상문제 생성 기능

사용자가 선택한 조건을 기반으로 AI가 예상문제를 생성한다.

### 입력 조건

```txt
- 사용할 과거문제 연도
- 카테고리
- 문제 유형
- 생성할 문제 수
- 난이도
- 해설 포함 여부
```

### 출력 결과

AI는 다음 정보를 포함한 문제 데이터를 생성한다.

```txt
- 문제문
- 선택지
- 정답
- 해설
- 카테고리
- 테마
- 난이도
- 문제 유형
```

---

## 3.5 생성된 문제 목록 표시 기능

생성된 문제는 카드 형태로 표시한다.

### 문제 카드에 표시할 정보

```txt
- 문제 번호
- 카테고리
- 테마
- 문제 유형
- 난이도
- 문제문
- 선택지
- 정답
- 해설
- PDF 포함 여부
```

---

## 3.6 문제 선택 기능

사용자는 PDF에 포함할 문제를 선택할 수 있다.

### 기능

```txt
- 개별 문제 선택
- 전체 선택
- 전체 선택 해제
- 선택한 문제만 PDF 출력
```

---

## 3.7 문제 수정 기능

AI가 생성한 문제는 사용자가 직접 수정할 수 있어야 한다.

### 수정 가능 항목

```txt
- 문제문
- 선택지
- 정답
- 해설
- 카테고리
- 테마
- 난이도
```

AI가 생성한 정답이나 해설이 항상 정확하다고 보장할 수 없기 때문에, 수정 기능은 필수이다.

---

## 3.8 문제 삭제 기능

사용자는 불필요한 문제를 삭제할 수 있다.

### 기능

```txt
- 개별 문제 삭제
- 선택한 문제 일괄 삭제
```

---

## 3.9 문제 추가 기능

사용자는 문제를 직접 추가할 수 있다.

### 기능

```txt
- 빈 문제 카드 추가
- 문제문 직접 입력
- 선택지 직접 입력
- 정답 및 해설 입력
```

---

## 3.10 문제 순서 변경 기능

사용자는 생성된 문제의 순서를 변경할 수 있다.

### 기능

```txt
- 위로 이동
- 아래로 이동
- 드래그 앤 드롭 정렬
```

PDF 출력 시 사용자가 정한 순서를 그대로 반영한다.

---

## 3.11 선택한 문제와 유사한 문제 생성 기능

사용자는 특정 문제를 선택한 뒤, 해당 문제와 유사한 문제를 추가 생성할 수 있다.

### 예시

```txt
- 이 문제와 비슷한 문제 3개 생성
- 같은 테마로 문제 생성
- 같은 난이도로 문제 생성
- 같은 문제 유형으로 문제 생성
```

### 동작 방식

선택한 문제의 다음 정보를 AI에게 전달한다.

```txt
- 문제문
- 선택지
- 정답
- 해설
- 테마
- 난이도
- 문제 유형
```

AI는 기존 문제를 그대로 복사하지 않고, 같은 출제 의도와 형식의 새로운 문제를 생성한다.

---

## 3.12 특정 테마 문제 추가 생성 기능

사용자는 특정 테마를 입력하거나 선택하여 해당 테마의 문제를 추가 생성할 수 있다.

### 예시

```txt
- スコッチの蒸留所所在地 문제 5개 생성
- ジャパニーズウイスキーの歴史 문제 3개 생성
- アイリッシュウイスキーの定義 문제 5개 생성
- バーボンの製法 문제 5개 생성
```

---

## 3.13 PDF 미리보기 기능

PDF 다운로드 전에 문제집 형태를 미리 확인할 수 있어야 한다.

### 미리보기 항목

```txt
- 문제 번호
- 문제문
- 선택지
- 정답 포함 여부
- 해설 포함 여부
- 페이지 구성
```

---

## 3.14 PDF 다운로드 기능

사용자는 최종 선택한 문제를 PDF로 다운로드할 수 있다.

### PDF 출력 옵션

```txt
- 문제만 출력
- 문제 + 정답 출력
- 문제 + 정답 + 해설 출력
- 선택한 문제만 출력
- 전체 문제 출력
- 카테고리별 정렬
- 사용자 지정 순서 유지
```

### PDF 제목 예시

```txt
ウイスキーエキスパート 予想問題集
```

---

# 4. 데이터 구조

## 4.1 과거문제 데이터

```ts
export type PastExamQuestion = {
  id: string;
  year: number;
  number: number;
  category:
    | "Scotch Whisky"
    | "Irish Whiskey"
    | "American Whiskey"
    | "Canadian Whisky"
    | "Japanese Whisky"
    | "World Whisky";

  type:
    | "multiple_choice"
    | "true_false_count"
    | "map"
    | "timeline"
    | "matching"
    | "table"
    | "image_based";

  theme: string;
  body: string;
  choices?: string[];
  answer?: string;
  explanation?: string;
  difficulty: "easy" | "medium" | "hard";
};
```

## 4.2 생성 문제 데이터

```ts
export type GeneratedQuestion = {
  id: string;
  body: string;
  type:
    | "multiple_choice"
    | "true_false_count"
    | "map"
    | "timeline"
    | "matching"
    | "table"
    | "image_based";

  category: string;
  theme: string;
  choices?: string[];
  answer?: string;
  explanation?: string;
  difficulty: "easy" | "medium" | "hard";
  selected: boolean;
  sourceQuestionId?: string;
};
```

---

# 5. 화면 요건

## 5.1 메인 화면

### 표시内容

```txt
- 앱 제목
- 설명文
- 과거문제 연도 선택
- 카테고리 선택
- 문제 유형 선택
- 생성 문제 수 선택
- 난이도 선택
- 예상문제 생성 버튼
```

---

## 5.2 문제 편집 화면

### 표시内容

```txt
- 생성된 문제 목록
- 문제 카드
- 수정 버튼
- 삭제 버튼
- 유사문제 생성 버튼
- PDF 포함 체크박스
- 순서 변경 버튼
- 테마별 추가 생성 버튼
```

---

## 5.3 PDF 설정 화면

### 표시内容

```txt
- PDF 제목 입력
- 정답 포함 여부
- 해설 포함 여부
- 선택한 문제만 출력 여부
- PDF 미리보기
- PDF 다운로드 버튼
```

---

# 6. 기술 요건

## 6.1 프론트엔드

```txt
- Next.js
- React
- TypeScript
- Tailwind CSS
```

## 6.2 AI

```txt
- OpenAI API
- JSON形式で問題生成
- 過去問題データをもとに傾向分析
```

## 6.3 PDF 생성

```txt
- @react-pdf/renderer
```

PDF는 서버에서 생성하기보다 브라우저에서 생성하는 방식이 Vercel 배포에 적합하다.

## 6.4 정렬 기능

```txt
- dnd-kit
```

## 6.5 저장 방식

MVP에서는 DB를 사용하지 않는다.

```txt
- React state
- localStorage
```

추후 필요하면 다음을 검토한다.

```txt
- Supabase
- Vercel Postgres
```

---

# 7. 비기능 요건

## 7.1 Vercel 배포 가능성

앱은 Vercel에 배포 가능해야 한다.

### 주의점

```txt
- Vercel에서 매번 PDF OCR을 실행하지 않는다.
- 과거문제는 사전에 JSON화한다.
- AI 호출은 API Route에서 처리한다.
- PDF 생성은 브라우저에서 처리한다.
```

---

## 7.2 성능 요건

```txt
- 과거문제 JSON은 정적 데이터로 관리한다.
- AI에게 전달하는 데이터는 필요한 범위로 제한한다.
- 전체 PDF 이미지를 매번 AI에게 보내지 않는다.
```

---

## 7.3 정확성 요건

AI 생성 결과는 사용자가 반드시 확인할 수 있어야 한다.

```txt
- 문제 수정 가능
- 정답 수정 가능
- 해설 수정 가능
- 문제 삭제 가능
- PDF 출력 전 미리보기 가능
```

화면 내에는 다음 문구를 표시한다.

```txt
AIが生成した問題・解答・解説は必ず確認してください。
```

---

# 8. MVP 범위

처음 버전에서는 아래 기능까지만 구현한다.

```txt
1. 과거문제 JSON 데이터 불러오기
2. 연도 선택
3. 카테고리 선택
4. 문제 수 선택
5. AI 예상문제 생성
6. 생성된 문제 목록 표시
7. 문제 수정
8. 문제 삭제
9. 문제 선택
10. 문제 순서 변경
11. 선택한 문제와 유사한 문제 생성
12. 특정 테마 문제 추가 생성
13. PDF 다운로드
```

---

# 9. MVP에서 제외할 기능

초기 버전에서는 아래 기능은 제외한다.

```txt
- 사용자의 PDF 업로드
- 앱 내 OCR
- 로그인 기능
- DB 저장
- 결제 기능
- 사용자별 문제집 저장
- 이미지 기반 지도 문제 자동 생성
- 문제 정답 자동 검증
```

특히 앱 내 OCR은 Vercel 서버리스 환경에서 무거워질 수 있으므로, MVP에서는 제외하는 것이 좋다.

---

# 10. 추천 프로젝트 구조

```txt
src/
├─ app/
│  ├─ page.tsx
│  ├─ layout.tsx
│  └─ api/
│     ├─ generate-questions/
│     │  └─ route.ts
│     ├─ generate-similar/
│     │  └─ route.ts
│     └─ generate-theme/
│        └─ route.ts
│
├─ components/
│  ├─ ExamSelector.tsx
│  ├─ GenerateForm.tsx
│  ├─ QuestionCard.tsx
│  ├─ QuestionEditor.tsx
│  ├─ QuestionList.tsx
│  ├─ SimilarQuestionButton.tsx
│  ├─ ThemeGenerateForm.tsx
│  └─ PdfDownloadButton.tsx
│
├─ data/
│  └─ exams/
│     ├─ we-2021.json
│     ├─ we-2022.json
│     ├─ we-2023.json
│     └─ we-2024.json
│
├─ lib/
│  ├─ openai.ts
│  ├─ prompts.ts
│  ├─ question-schema.ts
│  └─ pdf/
│     └─ QuestionPdf.tsx
│
├─ types/
│  └─ question.ts
│
public/
└─ past-exams/
   ├─ we-2021.pdf
   ├─ we-2022.pdf
   ├─ we-2023.pdf
   └─ we-2024.pdf
```

---

# 11. 개발 우선순위

## Phase 1: 기본 생성 기능

```txt
- 과거문제 JSON 준비
- 연도/카테고리 선택
- AI 문제 생성
- 문제 카드 표시
```

## Phase 2: 편집 기능

```txt
- 문제 수정
- 문제 삭제
- 문제 선택
- 순서 변경
```

## Phase 3: 추가 생성 기능

```txt
- 선택 문제 기반 유사문제 생성
- 특정 테마 문제 추가 생성
```

## Phase 4: PDF 기능

```txt
- PDF 미리보기
- PDF 다운로드
- 정답/해설 포함 옵션
```

---

# 12. 최종 정의

이 애플리케이션은 다음과 같이 정의할 수 있다.

> 위스キーエキスパート 시험의 과거문제 데이터를 기반으로 AI가 예상문제를 생성하고, 사용자가 문제를 선택·수정·삭제·추가·재정렬한 뒤, 최종 문제집을 PDF로 다운로드할 수 있는 Vercel 배포형 웹 애플리케이션이다.
> 과거문제 PDF는 리포지토리에 포함하지만, 실제 문제 생성에는 사전에 구조화한 JSON 데이터를 사용한다.

---

# 13. 실행 방법

## 13.1 환경변수 설정

```bash
cp .env.local.example .env.local
# .env.local 에서 OPENAI_API_KEY 와/또는 GEMINI_API_KEY 를 설정한다
# 문제 생성 API 는 OpenAI 를 우선 사용하고, 실패하거나 키가 없으면 Gemini 로 폴백한다
# 텍스트 모델: 기본 gpt-5-mini (OPENAI_MODEL), Gemini 는 기본 gemini-2.0-flash (GEMINI_MODEL)
```

## 13.2 의존성 설치 & 실행

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # 본번 빌드
npm run lint     # ESLint
```

## 13.3 과거문제 데이터 입력

스캔 이미지 PDF (`public/past-exams/{2021..2024}.pdf`) 를 OpenAI Vision 으로 OCR 하여 `src/data/exams/we-{year}.json` 으로 변환하는 일회성 스크립트를 제공한다 (`scripts/build-exam-json.mjs`).

스크립트는 PDF 전체를 슬라이딩 윈도우 (window=3, stride=2 → 1페이지 겹침) 로 훑으면서, **각 페이지가 표지/문제/정답·해설 중 어느 것인지 모델이 자동 판별**해 한 번에 `questions` 와 `answers` 를 동시 추출한다. 마지막에 `(number, subNumber)` 기준으로 정답·해설을 자동 머지한다.

많은 시험집은 **마지막 페이지에 정답 일람표**가 인쇄되어 있다. `--answer-pages F[-T]` 를 지정하면 다음 순서로 동작한다:

1. 지정된 정답 페이지를 **먼저** 전용 프롬프트로 OCR (`answers-FFF-TTT.json` 캐시).
2. 그 결과에서 sub-question 그룹 (예: `67-a`, `67-b`) 을 자동 도출하여 **sub-map** 을 만든다.
3. 외부 hint 파일 (`scripts/exam-hints/<year>.json`, 있는 경우) 과 union 으로 합쳐 **effective sub-map** 을 확정.
4. effective sub-map 을 문제 OCR 의 system prompt 에 주입하여, 각 윈도우에서 sub-question 을 정확히 분리해 추출.
5. 결과를 머지하고, sub-map 과 비교해 누락·잉여 경고를 출력.

이 흐름 덕분에 답지가 ground truth 가 되며, 사용자가 수동 hint 파일을 유지하지 않아도 정답 페이지만 잘 OCR 되면 자연스럽게 sub-question 이 분리된다.

```bash
# 단일 연도 전체 (자동 판별 + 자동 머지)
npm run build:exam-json -- --year 2024

# 정답 일람이 마지막 페이지에 있는 경우 (가장 일반적, 권장)
npm run build:exam-json -- --year 2024 --answer-pages last

# 페이지 번호를 직접 지정해도 됨
npm run build:exam-json -- --year 2024 --answer-pages 23

# 정답이 여러 페이지에 걸쳐 있으면 범위 지정
npm run build:exam-json -- --year 2023 --answer-pages 24-26

# 4 개 모두
npm run build:exam-json -- --all --answer-pages last

# 특정 페이지만 (디버깅)
npm run build:exam-json -- --year 2024 --pages 1-7

# API 호출 없이 페이지 렌더링만 확인
npm run build:exam-json -- --year 2024 --dry-run

# 캐시 무시 재실행
npm run build:exam-json -- --year 2024 --force

# 윈도우 사이즈/이동량 오버라이드
npm run build:exam-json -- --year 2024 --window 4 --stride 3
```

### 내부 동작

- `pdfjs-dist` + `@napi-rs/canvas` 로 PDF 페이지 → PNG 렌더링 (`scale=2`)
- 페이지 PNG: `.cache/exams/{year}/page-NNN.png`
- 윈도우별 OpenAI 응답: `.cache/exams/{year}/range-FFF-TTT.json` (`{ version, questions, answers }`)
- 정답 일람 응답: `.cache/exams/{year}/answers-FFF-TTT.json` (`{ version, answers }`)
- 캐시 덕분에 재실행 시 미처리 윈도우만 새로 호출
- 동일 `(number, subNumber)` 가 중복 추출되면 본문(question) / 해설(answer) 이 더 풍부한 쪽을 채택
- 선택지 prefix(`①`, `1.`, `a.`, `(1)` 등) 는 후처리에서 자동 제거
- `answer` / `explanation` 은 `(number, subNumber)` 매칭으로 question 객체에 머지. 매칭 실패한 answer 는 콘솔에 경고로 표시
- sub-map 검증: hint/도출된 sub 와 결과를 비교해 누락·잉여 경고 (`[hint] missing ...`)
- 외부 hint 파일 (`scripts/exam-hints/<year>.json`) 은 다음 필드를 지원한다:
  - `totalNumbers: 75` (옵션) — 답지 OCR 이 실패해도 1..N 의 main number 가 결과에 보장된다
  - `subMap: { "67": ["a","b"], ... }` — sub-question 그룹을 강제 분리
  - `answerOverrides: { "44": "② または ③", "67-a": "..." }` — OCR 결과를 무시하고 정답을 강제로 덮어쓰는 ground truth 보정. Q44 같이 「② または ③」 식 복수정답 또는 OCR 이 자꾸 틀리는 항목에 사용

### 요건

- `.env.local` 에 `OPENAI_API_KEY` 설정
- vision 가능 모델 (`OPENAI_VISION_MODEL`, 기본 `gpt-5`)
- README §7.1 에 따라 오프라인 일회성 처리. 앱 실행 중에는 OCR 하지 않는다.

JSON 이 빈 배열이어도 앱은 동작하지만, AI 는 일반 지식만으로 문제를 생성하므로 시험 경향 반영이 약해진다. AI Vision 결과는 100% 정확하지 않으므로 생성된 JSON 은 반드시 사람이 검수하기를 권장한다 (특히 `category` / `difficulty` 는 모델 추정값).

## 13.4 PDF 출력에 대한 메모

PDF 는 브라우저에서 `@react-pdf/renderer` 로 생성되며, 일본어 표시를 위해 jsDelivr CDN 의 Noto Sans JP TTF 를 동적으로 등록한다. 따라서 PDF 미리보기 / 다운로드 시 인터넷 접속이 필요하다.

## 13.5 Vercel 배포

```bash
vercel
# 환경변수 OPENAI_API_KEY / GEMINI_API_KEY (와 필요 시 OPENAI_MODEL, GEMINI_MODEL) 를 Vercel 프로젝트 측에서 설정한다
```

PDF 생성은 클라이언트, AI 호출만 서버 사이드 (Node ランタイム) 의 API Route 에서 처리한다.
