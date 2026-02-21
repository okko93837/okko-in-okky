import { NextRequest, NextResponse } from 'next/server';

/** POST /api/upload/save — Supabase Storage + DB 저장 */
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Not implemented', endpoint: '/api/upload/save' },
    { status: 501 },
  );
}
