'use client';

import { useReducer, useRef, useCallback, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  pipelineReducer,
  initialPipelineState,
  fileToDataUrl,
  dataUrlToBase64,
  callSegment,
  callMaterial,
  callProductShot,
  callSave,
  removeBackground,
  toJpegDataUrl,
  cropFromImage,
} from '@/lib/pipeline';
import { mosaicFaces } from '@/lib/opencv';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import type { PipelineStep, ProcessedItem, ItemState } from '@/types';

const CATEGORY_LABELS: Record<string, string> = {
  top: '상의',
  bottom: '하의',
  dress: '원피스',
  shoes: '신발',
};

const ITEM_STEP_LABELS: Record<string, string> = {
  pending: '대기 중',
  removing_bg: '배경 제거 중...',
  analyzing_material: '재질 분석 중...',
  generating_product_shot: '제품샷 생성 중...',
  done: '완료',
};

const HEADER_INFO: Record<PipelineStep, { title: string; subtitle: string }> = {
  idle:              { title: '사진 업로드',  subtitle: '전신 사진을 업로드해주세요' },
  uploading:         { title: '사진 처리 중', subtitle: '잠시만 기다려주세요' },
  blurring:          { title: '얼굴 보호 중', subtitle: '기기에서 안전하게 처리하고 있어요' },
  blur_preview:      { title: '익명화 확인',  subtitle: '얼굴이 잘 가려졌나요?' },
  segmenting:        { title: 'AI 분석 중',   subtitle: '의류를 찾고 있어요' },
  segment_review:    { title: '감지 완료',    subtitle: '발견한 의류를 확인하세요' },
  processing_items:  { title: 'AI 처리 중',   subtitle: '아이템을 분석하고 있어요' },
  saving:            { title: '저장 중',      subtitle: '옷장에 저장하고 있어요' },
  complete:          { title: '완료',         subtitle: '옷장에 저장되었어요' },
  error:             { title: '오류 발생',    subtitle: '다시 시도해주세요' },
};

function UploadHeader({ step, onBack }: { step: PipelineStep; onBack: () => void }) {
  const { title, subtitle } = HEADER_INFO[step];
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm px-4 py-3 flex items-center gap-3 border-b border-zinc-100 shrink-0">
      <button
        type="button"
        onClick={onBack}
        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 transition"
        aria-label="뒤로 가기"
      >
        <svg className="w-5 h-5 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <div className="flex flex-col">
        <span className="text-sm font-semibold text-zinc-800">{title}</span>
        <span className="text-xs text-zinc-400">{subtitle}</span>
      </div>
    </header>
  );
}

/** 바운딩 박스 좌표를 화면 픽셀 좌표로 변환 */
function boxToScreenCoords(
  box: number[],
  imgRect: DOMRect,
  origW: number,
  origH: number,
) {
  // object-contain 이므로 실제 이미지 렌더링 영역 계산
  const containerW = imgRect.width;
  const containerH = imgRect.height;
  const scale = Math.min(containerW / origW, containerH / origH);
  const renderedW = origW * scale;
  const renderedH = origH * scale;
  const offsetX = (containerW - renderedW) / 2;
  const offsetY = (containerH - renderedH) / 2;

  const [x1, y1, x2, y2] = box;
  return {
    left: offsetX + x1 * scale,
    top: offsetY + y1 * scale,
    width: (x2 - x1) * scale,
    height: (y2 - y1) * scale,
  };
}

export default function UploadPage() {
  const router = useRouter();
  const [state, dispatch] = useReducer(pipelineReducer, initialPipelineState);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imgRect, setImgRect] = useState<DOMRect | null>(null);
  const [origSize, setOrigSize] = useState({ w: 0, h: 0 });

  // 이미지 렌더링 영역 계산
  const updateImgRect = useCallback(() => {
    if (imgRef.current) {
      setImgRect(imgRef.current.getBoundingClientRect());
    }
  }, []);

  useEffect(() => {
    window.addEventListener('resize', updateImgRect);
    return () => window.removeEventListener('resize', updateImgRect);
  }, [updateImgRect]);

  // segment_review Canvas 폴리곤 렌더링
  useEffect(() => {
    if (
      (state.step !== 'segment_review' && state.step !== 'processing_items') ||
      !canvasRef.current ||
      !imgRef.current ||
      state.items.length === 0
    )
      return;

    const canvas = canvasRef.current;
    const img = imgRef.current;
    const rect = img.getBoundingClientRect();
    const containerRect = img.parentElement?.getBoundingClientRect();
    if (!containerRect) return;

    canvas.width = containerRect.width;
    canvas.height = containerRect.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const scale = Math.min(rect.width / origSize.w, rect.height / origSize.h);
    const renderedW = origSize.w * scale;
    const renderedH = origSize.h * scale;
    const offsetX = (rect.width - renderedW) / 2;
    const offsetY = (rect.height - renderedH) / 2;

    state.items.forEach((item, idx) => {
      if (item.polygons.length < 4) return;

      const isActive = state.step === 'processing_items' && idx === state.currentItemIndex;
      const isDone = item.processStep === 'done';

      ctx.beginPath();
      const px = offsetX + item.polygons[0] * scale;
      const py = offsetY + item.polygons[1] * scale;
      ctx.moveTo(px, py);
      for (let i = 2; i < item.polygons.length; i += 2) {
        const x = offsetX + item.polygons[i] * scale;
        const y = offsetY + item.polygons[i + 1] * scale;
        ctx.lineTo(x, y);
      }
      ctx.closePath();

      // 채우기
      ctx.fillStyle = isDone
        ? 'rgba(34, 197, 94, 0.08)'
        : isActive
          ? 'rgba(244, 63, 94, 0.15)'
          : 'rgba(244, 63, 94, 0.08)';
      ctx.fill();

      // 아웃라인
      ctx.strokeStyle = isDone
        ? 'rgba(34, 197, 94, 0.8)'
        : isActive
          ? 'rgba(244, 63, 94, 1)'
          : 'rgba(244, 63, 94, 0.6)';
      ctx.lineWidth = isActive ? 3 : 2;
      ctx.stroke();
    });
  }, [state.step, state.items, state.currentItemIndex, origSize]);

  // segment_review → processing_items 자동 전환
  useEffect(() => {
    if (state.step !== 'segment_review') return;
    const timer = setTimeout(() => {
      dispatch({ type: 'SET_STEP', step: 'processing_items' });
    }, 2500);
    return () => clearTimeout(timer);
  }, [state.step]);


  // ── 파일 처리 ──
  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return;

    dispatch({ type: 'SET_STEP', step: 'uploading' });

    try {
      const dataUrl = await fileToDataUrl(file);
      dispatch({ type: 'SET_ORIGINAL', dataUrl });
      dispatch({ type: 'SET_STEP', step: 'blurring' });

      const blurred = await mosaicFaces(dataUrl);
      dispatch({ type: 'SET_BLURRED', dataUrl: blurred });
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        message: error instanceof Error ? error.message : '이미지 처리 실패',
        step: 'blurring',
      });
    }
  }, []);

  // ── 블러 확인 후 파이프라인 시작 ──
  const startPipeline = useCallback(async () => {
    if (!state.blurredDataUrl) return;

    try {
      // 세그멘테이션
      dispatch({ type: 'SET_STEP', step: 'segmenting' });
      const jpegDataUrl = await toJpegDataUrl(state.blurredDataUrl);
      const base64 = dataUrlToBase64(jpegDataUrl);
      const segResult = await callSegment(base64);

      // 원본 이미지 크기 가져오기
      const tmpImg = new Image();
      tmpImg.src = state.blurredDataUrl;
      await new Promise<void>((r) => { tmpImg.onload = () => r(); });
      setOrigSize({ w: tmpImg.width, h: tmpImg.height });

      // ItemState 배열 생성 + 크롭
      const items: ItemState[] = await Promise.all(
        segResult.segments.map(async (seg) => {
          const croppedDataUrl = seg.box.length === 4
            ? await cropFromImage(state.blurredDataUrl!, seg.box, seg.polygons)
            : `data:image/png;base64,${seg.imageBase64}`;

          return {
            category: seg.category,
            croppedDataUrl,
            polygons: seg.polygons,
            box: seg.box,
            score: seg.score,
            processStep: 'pending' as const,
          };
        }),
      );

      dispatch({ type: 'SET_ITEMS', items });
      dispatch({ type: 'SET_STEP', step: 'segment_review' });

      // segment_review에서 processing_items로는 useEffect 타이머로 자동 전환
      // processing_items 시작은 아래 useEffect에서 처리

    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        message: error instanceof Error ? error.message : '처리 중 오류가 발생했습니다',
        step: state.step,
      });
    }
  }, [state.blurredDataUrl, state.step]);

  // ── processing_items 단계: 아이템 순차 처리 ──
  useEffect(() => {
    if (state.step !== 'processing_items' || state.items.length === 0) return;

    let cancelled = false;

    const processItems = async () => {
      const processedItems: ProcessedItem[] = [];

      for (let i = 0; i < state.items.length; i++) {
        if (cancelled) return;

        const item = state.items[i];
        dispatch({ type: 'SET_CURRENT_ITEM_INDEX', index: i });

        try {
          // 배경 제거
          dispatch({ type: 'UPDATE_ITEM', index: i, update: { processStep: 'removing_bg' } });
          const noBgDataUrl = await removeBackground(item.croppedDataUrl);
          if (cancelled) return;
          dispatch({ type: 'UPDATE_ITEM', index: i, update: { noBgDataUrl } });

          // 재질 분석
          dispatch({ type: 'UPDATE_ITEM', index: i, update: { processStep: 'analyzing_material' } });
          const noBgBase64 = dataUrlToBase64(noBgDataUrl);
          const materialResult = await callMaterial(noBgBase64);
          if (cancelled) return;
          dispatch({
            type: 'UPDATE_ITEM',
            index: i,
            update: { material: materialResult.material, color: materialResult.color },
          });

          // 제품샷 생성
          dispatch({ type: 'UPDATE_ITEM', index: i, update: { processStep: 'generating_product_shot' } });
          const productResult = await callProductShot(
            noBgBase64,
            materialResult.material,
            materialResult.color,
          );
          if (cancelled) return;
          const productShotDataUrl = `data:image/png;base64,${productResult.imageBase64}`;
          dispatch({
            type: 'UPDATE_ITEM',
            index: i,
            update: { productShotDataUrl, processStep: 'done' },
          });

          const processed: ProcessedItem = {
            category: item.category,
            segmentedDataUrl: item.croppedDataUrl,
            noBgDataUrl,
            material: materialResult.material,
            color: materialResult.color,
            productShotDataUrl,
          };
          processedItems.push(processed);
          dispatch({ type: 'ADD_PROCESSED_ITEM', item: processed });

        } catch (error) {
          if (cancelled) return;
          dispatch({
            type: 'SET_ERROR',
            message: error instanceof Error ? error.message : '아이템 처리 실패',
            step: 'processing_items',
          });
          return;
        }
      }

      if (cancelled) return;

      // 저장
      dispatch({ type: 'SET_STEP', step: 'saving' });
      try {
        const supabase = createBrowserSupabaseClient();
        let userId: string;

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          userId = session.user.id;
        } else {
          const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
          if (anonError || !anonData.user) throw new Error('인증 실패');
          userId = anonData.user.id;
        }

        for (const item of processedItems) {
          await callSave(
            item.category,
            dataUrlToBase64(item.productShotDataUrl),
            item.material,
            item.color,
            userId,
          );
        }

        dispatch({ type: 'SET_STEP', step: 'complete' });
      } catch (error) {
        dispatch({
          type: 'SET_ERROR',
          message: error instanceof Error ? error.message : '저장 실패',
          step: 'saving',
        });
      }
    };

    processItems();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.step === 'processing_items' && state.items.length > 0 ? 'run' : 'skip']);

  // ── 에러에서 재시도 ──
  const retry = useCallback(() => {
    if (state.errorStep === 'blurring' || state.errorStep === 'uploading') {
      dispatch({ type: 'RESET' });
    } else {
      startPipeline();
    }
  }, [state.errorStep, startPipeline]);

  // ── 드래그앤드롭 ──
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  // ── 렌더링 ──

  const goHome = useCallback(() => router.push('/'), [router]);

  // idle: 안내 + 하단 CTA
  if (state.step === 'idle') {
    return (
      <>
      <UploadHeader step={state.step} onBack={goHome} />
      <main
        className="flex-1 flex flex-col"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className={`flex-1 flex flex-col items-center justify-center px-6 transition ${
          isDragging ? 'bg-rose-50' : ''
        }`}>
          <div className="w-16 h-16 bg-zinc-100 rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-zinc-700 mb-1">전신이 보이는 사진 1장이면 충분해요</p>
          <p className="text-xs text-zinc-400 text-center leading-relaxed">
            서버로 보내기 전에 익명화를 먼저 확인할 수 있으니<br />
            부담 갖지 말고 편하게 올려주세요
          </p>

          <div className="mt-8 space-y-2.5 w-full max-w-xs">
            {[
              { num: 1, desc: '상의 · 하의 · 신발 자동 분리' },
              { num: 2, desc: '배경 제거 + 재질 분석' },
              { num: 3, desc: '깔끔한 제품샷으로 옷장 저장' },
            ].map((s) => (
              <div key={s.num} className="flex items-center gap-2.5">
                <div className="w-5 h-5 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                  {s.num}
                </div>
                <p className="text-xs text-zinc-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="shrink-0 px-6 pb-3">
          <div className="flex items-start gap-2">
            <svg className="w-3.5 h-3.5 mt-0.5 shrink-0 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <p className="text-zinc-400 text-xs leading-relaxed">
              얼굴 인식과 모자이크는 기기 내에서 처리되며, 처리 전 사진은 서버로 전송되지 않습니다.
            </p>
          </div>
        </div>

        <label className="shrink-0 w-full bg-rose-500 hover:bg-rose-400 text-white font-semibold py-4 text-center cursor-pointer transition block">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleInputChange}
          />
          사진 선택하기
        </label>
      </main>
      </>
    );
  }

  // uploading / blurring: 풀사이즈 이미지 + 오버레이
  if (state.step === 'uploading' || state.step === 'blurring') {
    return (
      <>
      <UploadHeader step={state.step} onBack={goHome} />
      <main className="flex-1 relative overflow-hidden">
        {state.originalDataUrl && (
          <img
            src={state.originalDataUrl}
            alt="원본"
            className="absolute inset-0 w-full h-full object-contain bg-black"
          />
        )}
        <div className="absolute inset-0 bg-white/70 flex flex-col items-center justify-center">
          <Spinner />
          <p className="mt-3 text-sm text-zinc-600 font-medium">
            얼굴을 보호하고 있어요...
          </p>
        </div>
      </main>
      </>
    );
  }

  // blur_preview: 풀사이즈 블러 결과 + 하단 CTA
  if (state.step === 'blur_preview') {
    return (
      <>
      <UploadHeader step={state.step} onBack={goHome} />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 relative">
          {state.blurredDataUrl && (
            <img
              src={state.blurredDataUrl}
              alt="블러 처리됨"
              className="absolute inset-0 w-full h-full object-contain bg-black"
            />
          )}
          <div className="absolute bottom-3 left-0 right-0 text-center">
            <p className="text-xs text-white/80 drop-shadow">
              얼굴이 올바르게 가려졌는지 확인해주세요
            </p>
          </div>
        </div>

        <div className="shrink-0 flex w-full">
          <button
            type="button"
            onClick={() => dispatch({ type: 'RESET' })}
            className="flex-1 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 font-medium py-4 transition"
          >
            다시 선택
          </button>
          <button
            type="button"
            onClick={startPipeline}
            className="flex-1 bg-rose-500 hover:bg-rose-400 text-white font-semibold py-4 transition"
          >
            확인
          </button>
        </div>
      </main>
      </>
    );
  }

  // segmenting: 세그멘테이션 진행 중
  if (state.step === 'segmenting') {
    return (
      <>
      <UploadHeader step={state.step} onBack={goHome} />
      <main className="flex-1 relative overflow-hidden">
        {state.blurredDataUrl && (
          <img
            src={state.blurredDataUrl}
            alt="분석 중"
            className="absolute inset-0 w-full h-full object-contain bg-black opacity-50"
          />
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl px-8 py-6 shadow-xl text-center">
            <Spinner />
            <p className="mt-3 text-sm font-medium text-zinc-700">의류를 찾고 있어요...</p>
            <p className="mt-1 text-xs text-zinc-400">AI가 사진 속 옷을 분석하고 있습니다</p>
          </div>
        </div>
      </main>
      </>
    );
  }

  // segment_review + processing_items: 모자이크 이미지 위 오버레이
  if (state.step === 'segment_review' || state.step === 'processing_items') {
    return (
      <>
      <UploadHeader step={state.step} onBack={goHome} />
      <main className="flex-1 relative overflow-hidden bg-black">
        {/* 모자이크 이미지 */}
        {state.blurredDataUrl && (
          <img
            ref={imgRef}
            src={state.blurredDataUrl}
            alt="감지 결과"
            className="absolute inset-0 w-full h-full object-contain"
            onLoad={() => {
              updateImgRect();
              // 원본 크기 갱신
              if (imgRef.current) {
                setOrigSize({
                  w: imgRef.current.naturalWidth,
                  h: imgRef.current.naturalHeight,
                });
              }
            }}
          />
        )}

        {/* Canvas 오버레이: 폴리곤 렌더링 */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />

        {/* 바운딩 박스 오버레이 */}
        {imgRef.current && origSize.w > 0 && state.items.map((item, idx) => {
          if (item.box.length !== 4) return null;

          const rect = imgRef.current!.getBoundingClientRect();
          const parentRect = imgRef.current!.parentElement?.getBoundingClientRect();
          if (!parentRect) return null;

          const coords = boxToScreenCoords(item.box, rect, origSize.w, origSize.h);
          // 부모(main)로부터의 상대 위치 계산
          const relLeft = coords.left + (rect.left - parentRect.left);
          const relTop = coords.top + (rect.top - parentRect.top);

          const isActive = state.step === 'processing_items' && idx === state.currentItemIndex;
          const isDone = item.processStep === 'done';
          const isProcessing = state.step === 'processing_items' && item.processStep !== 'pending' && !isDone;

          return (
            <div key={`overlay-${idx}`}>
              {/* 카테고리 라벨 배지 — 바운딩 박스 상단 */}
              <div
                className={`absolute z-10 ${
                  state.step === 'segment_review' ? 'animate-wiggle' : ''
                }`}
                style={{
                  left: relLeft,
                  top: relTop - 28,
                  minWidth: coords.width,
                }}
              >
                <span className={`inline-block px-2 py-1 rounded-md text-xs font-semibold shadow-sm ${
                  isDone
                    ? 'bg-green-500 text-white'
                    : isActive
                      ? 'bg-rose-500 text-white'
                      : 'bg-white/90 text-zinc-700'
                }`}>
                  {CATEGORY_LABELS[item.category] || item.category}
                  {isDone && ' ✓'}
                </span>
              </div>

              {/* 처리 중 상태 오버레이 */}
              {isProcessing && (
                <div
                  className="absolute z-10 flex items-center justify-center"
                  style={{
                    left: relLeft,
                    top: relTop,
                    width: coords.width,
                    height: coords.height,
                  }}
                >
                  <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2 flex items-center gap-2">
                    <Spinner size="sm" />
                    <span className="text-xs text-white font-medium">
                      {ITEM_STEP_LABELS[item.processStep]}
                    </span>
                  </div>
                </div>
              )}

              {/* 재질/색상 칩 — 바운딩 박스 하단 */}
              {item.material && item.color && (
                <div
                  className="absolute z-10 flex gap-1.5 animate-slide-in"
                  style={{
                    left: relLeft,
                    top: relTop + coords.height + 4,
                  }}
                >
                  <span className="bg-white/90 backdrop-blur-sm text-zinc-700 text-xs px-2 py-1 rounded-md shadow-sm">
                    {item.material}
                  </span>
                  <span className="bg-white/90 backdrop-blur-sm text-zinc-700 text-xs px-2 py-1 rounded-md shadow-sm">
                    {item.color}
                  </span>
                </div>
              )}

              {/* 제품샷 썸네일 — 완료 시 바운딩 박스 위 */}
              {item.productShotDataUrl && (
                <div
                  className="absolute z-10 animate-fade-scale"
                  style={{
                    left: relLeft,
                    top: relTop,
                    width: coords.width,
                    height: coords.height,
                  }}
                >
                  <img
                    src={item.productShotDataUrl}
                    alt={`${CATEGORY_LABELS[item.category]} 제품샷`}
                    className="w-full h-full object-contain rounded-lg shadow-lg"
                  />
                </div>
              )}
            </div>
          );
        })}

        {/* 하단 진행 바 (processing_items) */}
        {state.step === 'processing_items' && (
          <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm px-4 py-3">
            <div className="flex items-center gap-3">
              <Spinner size="sm" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-white font-medium">
                    아이템 처리 중 ({state.items.filter(i => i.processStep === 'done').length}/{state.items.length})
                  </span>
                </div>
                <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rose-400 rounded-full transition-all duration-500"
                    style={{
                      width: `${(state.items.filter(i => i.processStep === 'done').length / state.items.length) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      </>
    );
  }

  // saving
  if (state.step === 'saving') {
    return (
      <>
      <UploadHeader step={state.step} onBack={goHome} />
      <main className="flex-1 relative overflow-hidden">
        {state.blurredDataUrl && (
          <img
            src={state.blurredDataUrl}
            alt="저장 중"
            className="absolute inset-0 w-full h-full object-contain bg-black opacity-40"
          />
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl px-8 py-6 shadow-xl text-center">
            <Spinner />
            <p className="mt-3 text-sm font-medium text-zinc-700">옷장에 저장하고 있어요...</p>
          </div>
        </div>
      </main>
      </>
    );
  }

  // complete: 완료 — 제품샷 그리드
  if (state.step === 'complete') {
    return (
      <>
      <UploadHeader step={state.step} onBack={goHome} />
      <main className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-zinc-800">
              옷장에 저장되었어요!
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              {state.processedItems.length}개의 아이템이 분석되었습니다
            </p>
          </div>

          {/* 제품샷 그리드 */}
          <div className="grid grid-cols-2 gap-3">
            {state.items
              .filter((item) => item.productShotDataUrl)
              .map((item, idx) => (
                <div key={idx} className="animate-fade-scale bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="aspect-square bg-zinc-50">
                    <img
                      src={item.productShotDataUrl!}
                      alt={`${CATEGORY_LABELS[item.category]} 제품샷`}
                      className="w-full h-full object-contain p-2"
                    />
                  </div>
                  <div className="px-3 py-2 space-y-1">
                    <p className="text-xs font-semibold text-zinc-700">
                      {CATEGORY_LABELS[item.category]}
                    </p>
                    <div className="flex gap-1 flex-wrap">
                      {item.material && (
                        <span className="text-xs bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded">
                          {item.material}
                        </span>
                      )}
                      {item.color && (
                        <span className="text-xs bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded">
                          {item.color}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div className="shrink-0 flex w-full">
          <button
            type="button"
            onClick={() => dispatch({ type: 'RESET' })}
            className="flex-1 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 font-medium py-4 transition"
          >
            사진 더 올리기
          </button>
          <button
            type="button"
            onClick={() => router.push('/closet')}
            className="flex-1 bg-rose-500 hover:bg-rose-400 text-white font-semibold py-4 transition"
          >
            옷장으로 이동
          </button>
        </div>
      </main>
      </>
    );
  }

  // error: 에러
  if (state.step === 'error') {
    return (
      <>
      <UploadHeader step={state.step} onBack={goHome} />
      <main className="flex-1 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-sm text-red-700 font-medium">
            {state.errorMessage || '알 수 없는 오류'}
          </p>
        </div>

        <div className="shrink-0 flex w-full">
          <button
            type="button"
            onClick={() => dispatch({ type: 'RESET' })}
            className="flex-1 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 font-medium py-4 transition"
          >
            처음부터
          </button>
          <button
            type="button"
            onClick={retry}
            className="flex-1 bg-rose-500 hover:bg-rose-400 text-white font-semibold py-4 transition"
          >
            다시 시도
          </button>
        </div>
      </main>
      </>
    );
  }

  return null;
}

// ── Spinner 컴포넌트 ──

function Spinner({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const sizeClass = size === 'sm' ? 'w-4 h-4' : 'w-6 h-6';
  return (
    <svg
      className={`${sizeClass} animate-spin text-rose-500`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
