import { NextRequest, NextResponse } from 'next/server';
import { getGeminiClient } from '@/lib/gemini';
import { buildTryonPrompt } from '@/lib/tryon-prompt';
import type { PreviewGenerateRequest } from '@/types';

async function urlToBase64(url: string): Promise<{ data: string; mimeType: string }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`이미지 다운로드 실패: ${url} (${response.status})`);
  }
  const contentType = response.headers.get('content-type') ?? 'image/png';
  const mimeType = contentType.split(';')[0].trim();
  const arrayBuffer = await response.arrayBuffer();
  const data = Buffer.from(arrayBuffer).toString('base64');
  return { data, mimeType };
}

/** POST /api/preview/generate — Gemini 가상 착용 이미지 생성 */
export async function POST(request: NextRequest) {
  try {
    const body: PreviewGenerateRequest = await request.json();
    const { modelImageUrl, topImageUrl, bottomImageUrl, shoesImageUrl, styleOptions } = body;

    if (!modelImageUrl || !topImageUrl || !bottomImageUrl || !shoesImageUrl) {
      return NextResponse.json(
        { error: '모델, 상의, 하의, 신발 이미지가 모두 필요합니다' },
        { status: 400 },
      );
    }

    // 4개 이미지를 병렬로 다운로드
    const [modelImg, topImg, bottomImg, shoesImg] = await Promise.all([
      urlToBase64(modelImageUrl),
      urlToBase64(topImageUrl),
      urlToBase64(bottomImageUrl),
      urlToBase64(shoesImageUrl),
    ]);

    const prompt = buildTryonPrompt(styleOptions);
    const genai = getGeminiClient();

    const response = await genai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            { inlineData: { data: modelImg.data, mimeType: modelImg.mimeType } },
            { inlineData: { data: topImg.data, mimeType: topImg.mimeType } },
            { inlineData: { data: bottomImg.data, mimeType: bottomImg.mimeType } },
            { inlineData: { data: shoesImg.data, mimeType: shoesImg.mimeType } },
          ],
        },
      ],
      config: {
        responseModalities: ['IMAGE', 'TEXT'],
      },
    });

    const parts = response.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find(
      (p) => p.inlineData?.mimeType?.startsWith('image/'),
    );

    if (!imagePart?.inlineData?.data) {
      const textPart = parts.find((p) => p.text);
      console.error('미리보기 이미지 응답 없음. 텍스트:', textPart?.text ?? '(없음)');
      return NextResponse.json({ error: '착용 이미지 생성 실패' }, { status: 500 });
    }

    return NextResponse.json({ imageBase64: imagePart.inlineData.data });
  } catch (error) {
    console.error('Preview generate API error:', error);
    return NextResponse.json(
      { error: '착용 이미지 생성 중 오류가 발생했습니다' },
      { status: 500 },
    );
  }
}
