import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

/** GET /api/closet?userId=xxx — 옷장 아이템 목록 조회 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    const supabase = createServerSupabaseClient();

    let query = supabase
      .from('clothing_items')
      .select('*')
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Closet API error:', error);
      return NextResponse.json({ error: '옷장 조회 중 오류가 발생했습니다' }, { status: 500 });
    }

    return NextResponse.json({ items: data ?? [] });
  } catch (error) {
    console.error('Closet API error:', error);
    return NextResponse.json(
      { error: '옷장 조회 중 오류가 발생했습니다' },
      { status: 500 },
    );
  }
}
