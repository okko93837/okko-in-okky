import { NextRequest, NextResponse } from 'next/server';

/** POST /api/upload/segment — Replicate SAM3 세그멘테이션 */
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Not implemented', endpoint: '/api/upload/segment' },
    { status: 501 },
  );
}
