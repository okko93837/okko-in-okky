# ADR (Architecture Decision Records)

## ADR-001: 기술 스택 결정

**상태**: 확정
**일자**: 2026-02-21

### 결정

Next.js 단일 스택으로 프론트엔드 + 백엔드(API Routes)를 통합 구성한다.
Python 서버 없이 클라이언트 WASM + 서버리스 API로 전체 파이프라인을 처리한다.

### 스택 구성

| 구성 요소 | 기술 | 실행 위치 |
|-----------|------|----------|
| 프레임워크 | Next.js (App Router) | 풀스택 |
| 얼굴 블러 | OpenCV.js + YuNet ONNX | 클라이언트 |
| 배경 제거 | @imgly/background-removal | 클라이언트 |
| 세그멘테이션 | Replicate SAM3 API | API Route |
| 재질 파악 | 멀티모달 LLM (미정) | API Route |
| 제품샷 생성 | OpenAI gpt-image-1.5 | API Route |
| 착용 이미지 생성 | OpenAI gpt-image-1.5 | API Route |
| 프리셋 모델 | AI 사전 생성 정적 에셋 | public/ |
| DB / Storage | Supabase (PostgreSQL + Storage) | 클라우드 |
| 스타일링 | Tailwind CSS | 클라이언트 |

### 파이프라인 흐름

```
[클라이언트]                          [API Routes]
사진 업로드                                │
    ↓                                     │
얼굴 블러 (OpenCV.js)                      │
    ↓                                     │
    ├──────── 블러 처리된 이미지 전송 ──────→│
    │                          SAM3 세그멘테이션 (Replicate)
    │                                     ↓
    │                          상의/하의/신발 이미지 3장 반환
    ↓                                     │
배경 제거 (@imgly)  ←─────────────────────┘
    ↓
    ├──────── 배경 제거된 이미지 전송 ──────→│
    │                          재질 파악 (LLM)
    │                                     ↓
    │                          제품샷 생성 (gpt-image-1.5)
    │                                     ↓
    │                          옷장 저장
    ↓                                     │
옷장 UI  ←────────────────────────────────┘
    ↓
아이템 선택 + 모델 선택 ──────────────────→│
    │                          착용 이미지 생성 (gpt-image-1.5)
    ↓                                     │
미리보기 출력  ←──────────────────────────┘
```

---

## ADR-002: 인증 전략

**상태**: 확정
**일자**: 2026-02-21

### 결정

Supabase Anonymous Auth로 비로그인 사용자에게 임시 UUID를 발급한다.
옷장 저장 시점에 로그인을 요구하고, `linkIdentity`로 anonymous → 실계정 전환 시 데이터를 자동 이전한다.

### 근거

- **진입 장벽 최소화**: 로그인 없이 핵심 기능(업로드 → 제품샷) 체험 가능
- **데이터 연속성**: anonymous UUID → 실계정 전환 시 데이터 유실 없음
- **Supabase 통합**: Auth + RLS + Storage가 같은 SDK로 동작

---

### ADR-001 근거

- **단일 스택**: Next.js로 프론트/백엔드 통합 → 해커톤 4시간 내 개발 효율 극대화
- **클라이언트 처리**: 얼굴 블러 + 배경 제거를 브라우저에서 처리 → 서버 부하 감소, 프라이버시 강화
- **@imgly/background-removal**: rembg의 Python 의존성 제거 → Next.js만으로 완결
- **API Routes**: 외부 API 키를 서버 측에서 안전하게 관리

### 필요 API 키

- **OpenAI** — gpt-image-1.5 (제품샷 + 착용 이미지)
- **Replicate** — SAM3 세그멘테이션
- **Supabase** — DB(PostgreSQL) + 이미지 Storage (프로젝트: eijtajtngderojuvxdon)

---

## ADR-003: 디자인 시스템 (컬러 + 레이아웃)

**상태**: 확정
**일자**: 2026-02-21

### 결정

Mono Black + Rose 컬러 스킴을 채택한다. 모바일 퍼스트로 디자인하며, Tailwind CSS 기본 팔레트만 사용한다.

### 근거

- **의류 이미지 중립성**: Zinc 계열의 무채색 배경이 어떤 색상의 옷이든 자연스럽게 돋보이게 함
- **Rose 액센트**: CTA 버튼과 선택 상태에 시선 유도 효과가 뚜렷함
- **하이패션 레퍼런스**: SSENSE, Net-a-Porter 등 패션 서비스와 톤 일치
- **모바일 퍼스트**: 375px 기준 설계 → 데스크탑 확장

### 컬러 팔레트

| 역할 | Tailwind 클래스 | Hex | 용도 |
|------|-----------------|-----|------|
| Surface | `bg-zinc-50` | #fafafa | 페이지 배경 |
| Card | `bg-white` | #ffffff | 카드, 모달 배경 |
| Border | `border-zinc-200` | #e4e4e7 | 구분선, 카드 테두리 |
| Text Primary | `text-zinc-900` | #18181b | 제목, 본문 |
| Text Secondary | `text-zinc-500` | #71717a | 부제, 설명 |
| Text Muted | `text-zinc-400` | #a1a1aa | 힌트, 비활성 |
| Accent | `bg-rose-500` | #f43f5e | CTA 버튼, 강조 |
| Accent Hover | `hover:bg-rose-400` | #fb7185 | 버튼 호버 |
| Accent Light | `bg-rose-100` | #ffe4e6 | 뱃지, 스텝 아이콘 배경 |
| Accent Text | `text-rose-500` | #f43f5e | 링크, 활성 탭 |
| Active Tab BG | `bg-zinc-900` | #18181b | 선택된 탭 |
| Active Tab Text | `text-white` | #ffffff | 선택된 탭 텍스트 |
| Inactive Tab BG | `bg-zinc-200` | #e4e4e7 | 미선택 탭 |
| Inactive Tab Text | `text-zinc-600` | #52525b | 미선택 탭 텍스트 |
| Selection Border | `border-rose-400` | #fb7185 | 선택된 아이템 테두리 |
| Nav Active | `text-rose-500` | #f43f5e | 활성 네비 아이콘 + 텍스트 |
| Nav Inactive | `text-zinc-400` | #a1a1aa | 비활성 네비 |
| Shadow | `shadow-rose-500/25` | - | CTA 버튼 글로우 |

### 컴포넌트 패턴

```
/* 페이지 배경 */
<main className="bg-zinc-50 min-h-screen">

/* 카드 */
<div className="bg-white border border-zinc-200 rounded-xl">

/* CTA 버튼 */
<button className="bg-rose-500 hover:bg-rose-400 text-white font-semibold
  px-6 py-3 rounded-xl shadow-lg shadow-rose-500/25">

/* 보조 버튼 */
<button className="bg-zinc-200 hover:bg-zinc-300 text-zinc-800
  font-medium px-4 py-2 rounded-lg">

/* 탭 (활성) */
<span className="bg-zinc-900 text-white text-xs font-medium px-4 py-1.5 rounded-full">

/* 탭 (비활성) */
<span className="bg-zinc-200 text-zinc-600 text-xs font-medium px-4 py-1.5 rounded-full">

/* 스텝 번호 */
<div className="w-7 h-7 bg-rose-100 text-rose-600 rounded-full
  flex items-center justify-center text-xs font-bold">

/* 선택된 아이템 */
<div className="border-2 border-rose-400 rounded-xl relative">

/* 하단 네비게이션 */
<nav className="sticky bottom-0 bg-white border-t border-zinc-200
  px-6 py-3 flex justify-around">

/* 히어로 카드 */
<div className="bg-gradient-to-br from-zinc-200 to-zinc-100
  rounded-2xl p-6 relative overflow-hidden">
```

### 타이포그래피

| 용도 | 클래스 |
|------|--------|
| 서비스명 | `text-lg font-bold text-zinc-900` |
| 섹션 제목 | `text-sm font-semibold text-zinc-800` |
| 본문 | `text-sm text-zinc-500` |
| 캡션 | `text-xs text-zinc-400` |
| 버튼 텍스트 | `text-sm font-semibold text-white` |
| 링크 | `text-xs font-medium text-rose-500` |
| 네비 텍스트 | `text-[10px]` |

### 레이아웃 원칙

- **모바일 퍼스트**: 375px 기준 → `sm:` `md:` `lg:`로 확장
- **컨텐츠 패딩**: `px-6` (24px) 기본
- **카드 간격**: `gap-2` (8px) 그리드, `space-y-3` 리스트
- **라운딩**: 카드 `rounded-xl`, 버튼 `rounded-xl`, 탭 `rounded-full`
- **하단 네비**: `sticky bottom-0`으로 항상 고정
