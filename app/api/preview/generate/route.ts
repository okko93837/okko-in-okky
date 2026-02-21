import { NextRequest, NextResponse } from 'next/server';

/** POST /api/preview/generate — gpt-image-1.5 착용 이미지 생성 */
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Not implemented', endpoint: '/api/preview/generate' },
    { status: 501 },
  );
}
