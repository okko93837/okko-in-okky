import { NextRequest, NextResponse } from 'next/server';
import OpenAI, { toFile } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

/** POST /api/upload/product-shot — gpt-image-1 제품샷 생성 */
export async function POST(request: NextRequest) {
  try {
    const { imageBase64, material, color } = await request.json();

    if (!imageBase64) {
      return NextResponse.json({ error: '이미지가 필요합니다' }, { status: 400 });
    }

    const buffer = Buffer.from(imageBase64, 'base64');
    const file = await toFile(buffer, 'clothing.png', { type: 'image/png' });

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

    const response = await openai.images.edit({
      model: 'gpt-image-1',
      image: file,
      prompt,
      size: '1024x1024',
      quality: 'high',
    });

    const resultBase64 = response.data?.[0]?.b64_json;
    if (!resultBase64) {
      return NextResponse.json({ error: '제품샷 생성 실패' }, { status: 500 });
    }

    return NextResponse.json({ imageBase64: resultBase64 });
  } catch (error) {
    console.error('Product-shot API error:', error);
    return NextResponse.json(
      { error: '제품샷 생성 중 오류가 발생했습니다' },
      { status: 500 },
    );
  }
}
