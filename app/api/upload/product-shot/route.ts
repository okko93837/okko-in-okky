import { NextRequest, NextResponse } from 'next/server';
import { getGeminiClient } from '@/lib/gemini';

/** POST /api/upload/product-shot — Gemini 제품샷 생성 */
export async function POST(request: NextRequest) {
  try {
    const { imageBase64, material, color } = await request.json();

    if (!imageBase64) {
      return NextResponse.json({ error: '이미지가 필요합니다' }, { status: 400 });
    }

    const genai = getGeminiClient();

    const prompt = `이 의류 아이템의 깔끔한 제품 사진을 생성해주세요.
배경: 순수 흰색
조명: 스튜디오 조명, 부드러운 그림자
구도: 의류를 평평하게 펼쳐 놓은 플랫레이(flat-lay) 구도
이 의류의 정보: ${color} 색상, ${material}

[절대 금지 사항]
- 원본 의류의 색상을 변경하지 마세요
- 원본 의류의 패턴을 변경하지 마세요
- 원본 의류의 재질감을 변경하지 마세요
- 원본 의류의 디자인을 변경하지 마세요
- 의류 외의 다른 물체를 추가하지 마세요`;

    const response = await genai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
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
        responseModalities: ['IMAGE', 'TEXT'],
      },
    });

    const parts = response.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find(
      (p) => p.inlineData?.mimeType?.startsWith('image/'),
    );

    if (!imagePart?.inlineData?.data) {
      return NextResponse.json({ error: '제품샷 생성 실패' }, { status: 500 });
    }

    return NextResponse.json({ imageBase64: imagePart.inlineData.data });
  } catch (error) {
    console.error('Product-shot API error:', error);
    return NextResponse.json(
      { error: '제품샷 생성 중 오류가 발생했습니다' },
      { status: 500 },
    );
  }
}
