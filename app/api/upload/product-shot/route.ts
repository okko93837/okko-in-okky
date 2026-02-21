import { NextRequest, NextResponse } from 'next/server';

/** POST /api/upload/product-shot — gpt-image-1.5 제품샷 생성 */
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Not implemented', endpoint: '/api/upload/product-shot' },
    { status: 501 },
  );
}
