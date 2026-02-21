# SPEC (기능적 요구사항)

## 인증 플로우

### 원칙
- 로그인 없이도 업로드 → 제품샷 생성까지 전체 파이프라인 사용 가능
- 옷장 저장 시점에 로그인 요구
- 비로그인 데이터는 로그인 시 실계정으로 자동 전환

### 흐름
1. 첫 접속 → Supabase Anonymous Auth → 임시 UUID 발급
2. 업로드/세그멘테이션/제품샷 생성 → 임시 UUID로 임시 보관
3. 옷장 저장 클릭 → 로그인/회원가입 모달 표시
4. 회원가입 완료 → `linkIdentity`로 anonymous → 실계정 전환
5. 임시 보관 데이터가 실계정 소유로 자동 이전

### 상태별 접근 권한
| 기능 | 비로그인 (anonymous) | 로그인 |
|------|---------------------|--------|
| 사진 업로드 | O | O |
| 얼굴 블러 | O | O |
| 세그멘테이션 | O | O |
| 배경 제거 | O | O |
| 재질 파악 + 제품샷 | O | O |
| 옷장 저장 | X → 로그인 유도 | O |
| 옷장 조회 | X | O |
| 미리보기 생성 | X | O |

---

## 공유 타입 정의

### ClothingItem
| 필드 | 타입 | 설명 |
|------|------|------|
| id | string (uuid) | 아이템 고유 ID |
| user_id | string (uuid) | 소유자 ID (auth.users 참조) |
| category | 'top' \| 'bottom' \| 'shoes' | 의류 카테고리 |
| image_url | string | 제품샷 이미지 URL (Supabase Storage) |
| material | string | 재질 텍스트 (예: "면 소재 버건디 셔츠") |
| color | string | 대표 색상 |
| created_at | string (timestamp) | 생성 시각 |

### PresetModel
| 필드 | 타입 | 설명 |
|------|------|------|
| id | string | 모델 고유 ID |
| name | string | 모델명 (예: "남성 슬림") |
| body_type | string | 체형 (마른/보통/큰 체형) |
| image_url | string | 레퍼런스 이미지 경로 (public/) |

### Outfit
| 필드 | 타입 | 설명 |
|------|------|------|
| id | string (uuid) | 코디 고유 ID |
| user_id | string (uuid) | 소유자 ID (auth.users 참조) |
| top_id | string | 선택한 상의 ID |
| bottom_id | string | 선택한 하의 ID |
| shoes_id | string | 선택한 신발 ID |
| preset_model_id | string | 프리셋 모델 ID |
| generated_image_url | string | 착용 이미지 URL |
| created_at | string (timestamp) | 생성 시각 |

---

## 페이지 구성

### / (랜딩)
- 서비스 소개
- 업로드 페이지로 이동 CTA

### /upload (A 담당)
- 전신 사진 1장 업로드 (드래그앤드롭 또는 파일 선택)
- 업로드 후 자동 처리 플로우 실행 + 진행 상태 표시
- 완료 시 옷장으로 이동

### /closet (B 담당)
- 카테고리별(상의/하의/신발) 탭 UI
- Supabase에서 아이템 목록 조회 + 그리드 표시
- 아이템 선택 → 미리보기 페이지로 이동

### /preview (B 담당)
- 선택한 상의/하의/신발 표시
- 프리셋 모델 선택 UI
- 착용 이미지 생성 버튼 → 결과 표시

---

## API Routes

### A 담당

#### POST /api/upload/segment
- **입력**: 얼굴 블러 + 배경 제거된 이미지
- **처리**: Replicate SAM3 호출 → 상의/하의/신발 분리
- **출력**: 세그멘테이션된 이미지 3장

#### POST /api/upload/material
- **입력**: 배경 제거된 의류 이미지
- **처리**: GPT 멀티모달 호출 → 재질/소재 분석
- **출력**: 재질 텍스트 설명

#### POST /api/upload/product-shot
- **입력**: 배경 제거된 의류 이미지 + 재질 텍스트
- **처리**: gpt-image-1.5 호출 → 제품샷 생성
- **출력**: 제품샷 이미지
- **프롬프트 필수 조항**: 색상/패턴/재질/디자인 요소 변경 금지

#### POST /api/upload/save
- **입력**: 제품샷 이미지 + 메타데이터 (category, material, color)
- **처리**: Supabase Storage 업로드 + clothing_items 테이블 INSERT
- **출력**: 저장된 ClothingItem

### B 담당

#### GET /api/closet
- **처리**: Supabase clothing_items 테이블 조회
- **출력**: ClothingItem[]

#### POST /api/preview/generate
- **입력**: top_id, bottom_id, shoes_id, preset_model_id
- **처리**: 아이템 이미지 3장 + 프리셋 모델 이미지로 gpt-image-1.5 호출
- **출력**: 착용 이미지
- **프롬프트 필수 조항**: 색상/패턴/재질/핏 변경 금지

---

## Supabase 스키마

### 테이블: clothing_items
```sql
create table clothing_items (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  category text not null check (category in ('top', 'bottom', 'shoes')),
  image_url text not null,
  material text not null,
  color text not null,
  created_at timestamptz default now()
);

-- RLS: 본인 데이터만 접근
alter table clothing_items enable row level security;
create policy "Users can access own items"
  on clothing_items for all
  using (auth.uid() = user_id);
```

### 테이블: outfits
```sql
create table outfits (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  top_id uuid references clothing_items(id) not null,
  bottom_id uuid references clothing_items(id) not null,
  shoes_id uuid references clothing_items(id) not null,
  preset_model_id text not null,
  generated_image_url text not null,
  created_at timestamptz default now()
);

-- RLS: 본인 데이터만 접근
alter table outfits enable row level security;
create policy "Users can view own outfits"
  on outfits for select using (auth.uid() = user_id);
create policy "Users can insert own outfits"
  on outfits for insert with check (auth.uid() = user_id);
create policy "Users can delete own outfits"
  on outfits for delete using (auth.uid() = user_id);
```

### Storage 버킷
- `clothing-images` — 제품샷 이미지 저장
- `outfit-images` — 착용 이미지 저장

---

## 디렉토리 구조

```
app/
├── page.tsx                          ← 랜딩
├── upload/page.tsx                   ← A 담당
├── closet/page.tsx                   ← B 담당
├── preview/page.tsx                  ← B 담당
├── api/
│   ├── upload/
│   │   ├── segment/route.ts          ← A 담당
│   │   ├── material/route.ts         ← A 담당
│   │   ├── product-shot/route.ts     ← A 담당
│   │   └── save/route.ts             ← A 담당
│   ├── closet/route.ts               ← B 담당
│   └── preview/
│       └── generate/route.ts         ← B 담당
types/
└── index.ts                          ← 공유 타입 (양쪽 약속)
lib/
└── supabase.ts                       ← Supabase 클라이언트 초기화
public/
└── models/                           ← 프리셋 모델 이미지
```
