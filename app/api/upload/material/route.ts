import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

/** POST /api/upload/material — GPT-4o 멀티모달 재질 분석 */
export async function POST(request: NextRequest) {
  try {
    const { imageBase64 } = await request.json();

    if (!imageBase64) {
      return NextResponse.json({ error: '이미지가 필요합니다' }, { status: 400 });
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `당신은 의류 전문가입니다. 의류 이미지를 분석하여 재질과 색상을 판별합니다.
반드시 JSON 형식으로 응답하세요:
{
  "material": "재질을 포함한 의류 설명 (예: 면 소재 캐주얼 셔츠)",
  "color": "주요 색상 (예: 버건디)"
}`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: '이 의류의 재질과 색상을 분석해주세요.',
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
      max_tokens: 200,
    });

    const content = completion.choices[0]?.message?.content;
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
