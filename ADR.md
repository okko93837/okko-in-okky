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
| DB | 미정 (로컬 or Supabase) | - |

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

### 근거

- **단일 스택**: Next.js로 프론트/백엔드 통합 → 해커톤 4시간 내 개발 효율 극대화
- **클라이언트 처리**: 얼굴 블러 + 배경 제거를 브라우저에서 처리 → 서버 부하 감소, 프라이버시 강화
- **@imgly/background-removal**: rembg의 Python 의존성 제거 → Next.js만으로 완결
- **API Routes**: 외부 API 키를 서버 측에서 안전하게 관리

### 필요 API 키

- **OpenAI** — gpt-image-1.5 (제품샷 + 착용 이미지)
- **Replicate** — SAM3 세그멘테이션
- **멀티모달 LLM** — 재질 파악 (모델 미정)
