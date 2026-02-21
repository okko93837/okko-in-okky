import { NextRequest, NextResponse } from 'next/server';
import { getGeminiClient } from '@/lib/gemini';

/** POST /api/upload/material — Gemini 멀티모달 재질 분석 */
export async function POST(request: NextRequest) {
  try {
    const { imageBase64 } = await request.json();

    if (!imageBase64) {
      return NextResponse.json({ error: '이미지가 필요합니다' }, { status: 400 });
    }

    const genai = getGeminiClient();

    const response = await genai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `당신은 의류 전문가입니다. 의류 이미지를 분석하여 재질과 색상을 판별합니다.
반드시 아래 JSON 형식으로만 응답하세요:
{
  "material": "재질을 포함한 의류 설명 (예: 면 소재 캐주얼 셔츠)",
  "color": "주요 색상 (예: 버건디)"
}

이 의류의 재질과 색상을 분석해주세요.`,
            },
            {
              inlineData: {
                data: imageBase64,
                mimeType: 'image/png',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['TEXT'],
        responseMimeType: 'application/json',
      },
    });

    const content = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) {
      return NextResponse.json({ error: '분석 결과가 없습니다' }, { status: 500 });
    }

    const result = JSON.parse(content);

    return NextResponse.json({
      material: result.material || '알 수 없음',
      color: result.color || '알 수 없음',
    });
  } catch (error) {
    console.error('Material API error:', error);
    return NextResponse.json(
      { error: '재질 분석 중 오류가 발생했습니다' },
      { status: 500 },
    );
  }
}
