import { NextRequest, NextResponse } from 'next/server';

/** POST /api/upload/material — GPT 멀티모달 재질 분석 */
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Not implemented', endpoint: '/api/upload/material' },
    { status: 501 },
  );
}
