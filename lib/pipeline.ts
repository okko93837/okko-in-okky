/**
 * 파이프라인 오케스트레이터
 * - useReducer 기반 상태 머신
 * - API 호출 래퍼 + 클라이언트 처리 함수
 */

import type {
  PipelineState,
  PipelineStep,
  SegmentResponse,
  MaterialResponse,
  ProductShotResponse,
  SaveResponse,
  ClothingCategory,
  ProcessedItem,
  ItemState,
} from '@/types';

// ── Actions ──

type PipelineAction =
  | { type: 'SET_STEP'; step: PipelineStep }
  | { type: 'SET_ORIGINAL'; dataUrl: string }
  | { type: 'SET_BLURRED'; dataUrl: string }
  | { type: 'SET_ITEMS'; items: ItemState[] }
  | { type: 'UPDATE_ITEM'; index: number; update: Partial<ItemState> }
  | { type: 'SET_CURRENT_ITEM_INDEX'; index: number }
  | { type: 'ADD_PROCESSED_ITEM'; item: ProcessedItem }
  | { type: 'SET_ERROR'; message: string; step: PipelineStep }
  | { type: 'RESET' };

// ── Initial State ──

export const initialPipelineState: PipelineState = {
  step: 'idle',
  originalDataUrl: null,
  blurredDataUrl: null,
  items: [],
  processedItems: [],
  currentItemIndex: 0,
  errorMessage: null,
  errorStep: null,
};

// ── Reducer ──

export function pipelineReducer(
  state: PipelineState,
  action: PipelineAction,
): PipelineState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, step: action.step, errorMessage: null };
    case 'SET_ORIGINAL':
      return { ...state, originalDataUrl: action.dataUrl };
    case 'SET_BLURRED':
      return { ...state, blurredDataUrl: action.dataUrl, step: 'blur_preview' };
    case 'SET_ITEMS':
      return { ...state, items: action.items };
    case 'UPDATE_ITEM': {
      const items = [...state.items];
      items[action.index] = { ...items[action.index], ...action.update };
      return { ...state, items };
    }
    case 'SET_CURRENT_ITEM_INDEX':
      return { ...state, currentItemIndex: action.index };
    case 'ADD_PROCESSED_ITEM':
      return {
        ...state,
        processedItems: [...state.processedItems, action.item],
      };
    case 'SET_ERROR':
      return {
        ...state,
        step: 'error',
        errorMessage: action.message,
        errorStep: action.step,
      };
    case 'RESET':
      return initialPipelineState;
    default:
      return state;
  }
}

// ── 유틸리티 ──

/** data URL에서 base64 부분만 추출 */
export function dataUrlToBase64(dataUrl: string): string {
  return dataUrl.split(',')[1];
}

/** PNG data URL → JPEG data URL (RGBA→RGB, 모델 호환용) */
export async function toJpegDataUrl(pngDataUrl: string): Promise<string> {
  const img = new Image();
  img.src = pngDataUrl;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
  });
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.9);
}

/** Blob → data URL */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** File → data URL */
export function fileToDataUrl(file: File): Promise<string> {
  return blobToDataUrl(file);
}

/** 폴리곤 마스크로 의류 영역만 추출 (바운딩 박스 + 폴리곤 클리핑) */
export async function cropFromImage(
  imageDataUrl: string,
  box: number[],
  polygons: number[],
): Promise<string> {
  const img = new Image();
  img.src = imageDataUrl;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
  });

  const [x1, y1, x2, y2] = box;
  const w = x2 - x1;
  const h = y2 - y1;

  // 10% 패딩
  const padX = w * 0.1;
  const padY = h * 0.1;

  const sx = Math.max(0, x1 - padX);
  const sy = Math.max(0, y1 - padY);
  const sw = Math.min(img.width - sx, w + padX * 2);
  const sh = Math.min(img.height - sy, h + padY * 2);

  const canvas = document.createElement('canvas');
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext('2d')!;

  // 폴리곤이 있으면 클리핑 패스로 사용
  if (polygons.length >= 6) {
    ctx.beginPath();
    ctx.moveTo(polygons[0] - sx, polygons[1] - sy);
    for (let i = 2; i < polygons.length; i += 2) {
      ctx.lineTo(polygons[i] - sx, polygons[i + 1] - sy);
    }
    ctx.closePath();
    ctx.clip();
  }

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

  return canvas.toDataURL('image/png');
}

// ── API 호출 래퍼 ──

/** SAM3 세그멘테이션 호출 */
export async function callSegment(imageBase64: string): Promise<SegmentResponse> {
  const res = await fetch('/api/upload/segment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64 }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '세그멘테이션 실패' }));
    throw new Error(err.error || '세그멘테이션 실패');
  }
  return res.json();
}

/** 재질 분석 호출 */
export async function callMaterial(imageBase64: string): Promise<MaterialResponse> {
  const res = await fetch('/api/upload/material', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64 }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '재질 분석 실패' }));
    throw new Error(err.error || '재질 분석 실패');
  }
  return res.json();
}

/** 제품샷 생성 호출 */
export async function callProductShot(
  imageBase64: string,
  material: string,
  color: string,
): Promise<ProductShotResponse> {
  const res = await fetch('/api/upload/product-shot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64, material, color }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '제품샷 생성 실패' }));
    throw new Error(err.error || '제품샷 생성 실패');
  }
  return res.json();
}

/** Supabase 저장 호출 */
export async function callSave(
  category: ClothingCategory,
  imageBase64: string,
  material: string,
  color: string,
  userId: string,
): Promise<SaveResponse> {
  const res = await fetch('/api/upload/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category, imageBase64, material, color, userId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '저장 실패' }));
    throw new Error(err.error || '저장 실패');
  }
  return res.json();
}

// ── 클라이언트 처리 ──

/** @imgly/background-removal 동적 임포트 + 배경 제거 */
export async function removeBackground(imageDataUrl: string): Promise<string> {
  const { removeBackground: removeBg } = await import('@imgly/background-removal');
  const blob = await removeBg(imageDataUrl, {
    output: { format: 'image/png' },
  });
  return blobToDataUrl(blob);
}
