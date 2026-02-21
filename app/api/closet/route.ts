import { NextResponse } from 'next/server';

/** GET /api/closet — 옷장 아이템 목록 조회 */
export async function GET() {
  return NextResponse.json(
    { error: 'Not implemented', endpoint: '/api/closet' },
    { status: 501 },
  );
}
