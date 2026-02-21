import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
});

const CATEGORIES = [
  { category: 'top', prompt: 'upper body clothing' },
  { category: 'bottom', prompt: 'lower body clothing' },
  { category: 'dress', prompt: 'full body dress or one-piece' },
  { category: 'shoes', prompt: 'footwear' },
] as const;

const MODEL_ID =
  'yodagg/sam3-image-seg:753fe4dbdd890a55e176f19b0603ae1b43c9e7fbd916070df53ffdb2451c7a57';

/** 단일 카테고리 세그멘테이션 + 429 재시도 */
async function segmentOne(imageDataUri: string, category: string, prompt: string) {
  const maxRetries = 3;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const output = (await replicate.run(MODEL_ID, {
        input: { image: imageDataUri, prompt, multimask_output: false, max_masks: 1 },
      })) as {
        visualization?: string;
        pred_scores?: number[];
        pred_polygons?: number[][][];
        pred_boxes?: number[][];
      };

      const resultUrl = output?.visualization;
      if (!resultUrl) return null;

      // 신뢰도가 낮으면 스킵
      const score = output.pred_scores?.[0] ?? 0;
      if (score < 0.3) return null;

      const imgRes = await fetch(resultUrl);
      if (!imgRes.ok) return null;

      const buffer = await imgRes.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      return {
        category,
        imageBase64: base64,
        polygons: output.pred_polygons?.[0]?.[0] ?? [],
        box: output.pred_boxes?.[0] ?? [],
        score,
      };
    } catch (e: unknown) {
      const isRateLimit = e instanceof Error && e.message.includes('429');
      if (isRateLimit && attempt < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, (attempt + 1) * 10000));
        continue;
      }
      throw e;
    }
  }
  return null;
}

const STAGGER_MS = 5000;
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 지연 후 세그멘테이션 실행 */
async function staggeredSegment(
  imageDataUri: string,
  category: string,
  prompt: string,
  delayMs: number,
) {
  if (delayMs > 0) await delay(delayMs);
  return segmentOne(imageDataUri, category, prompt);
}

/** POST /api/upload/segment — Replicate SAM3 세그멘테이션 (5초 간격 병렬) */
export async function POST(request: NextRequest) {
  try {
    const { imageBase64 } = await request.json();

    if (!imageBase64) {
      return NextResponse.json({ error: '이미지가 필요합니다' }, { status: 400 });
    }

    // 클라이언트에서 JPEG로 변환되어 옴 (3채널 RGB 보장)
    const dataUri = `data:image/jpeg;base64,${imageBase64}`;

    // 5초 간격 stagger 병렬 호출: 0s / 5s / 10s에 각각 시작
    const promises = CATEGORIES.map(({ category, prompt }, i) =>
      staggeredSegment(dataUri, category, prompt, i * STAGGER_MS).catch((e) => {
        console.error(`세그멘테이션 실패 (${category}):`, e);
        return null;
      }),
    );

    const results = await Promise.all(promises);
    const segments = results.filter(Boolean) as {
      category: string;
      imageBase64: string;
      polygons: number[];
      box: number[];
      score: number;
    }[];

    if (segments.length === 0) {
      return NextResponse.json(
        { error: '의류를 감지하지 못했습니다. 전신 사진을 다시 업로드해주세요.' },
        { status: 422 },
      );
    }

    return NextResponse.json({ segments });
  } catch (error) {
    console.error('Segment API error:', error);
    return NextResponse.json(
      { error: '세그멘테이션 처리 중 오류가 발생했습니다' },
      { status: 500 },
    );
  }
}
