import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

/** POST /api/upload/save — Supabase Storage + DB 저장 */
export async function POST(request: NextRequest) {
  try {
    const { category, imageBase64, material, color, userId } = await request.json();

    if (!category || !imageBase64 || !userId) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다' },
        { status: 400 },
      );
    }

    const supabase = createServerSupabaseClient();
    const fileId = crypto.randomUUID();
    const filePath = `clothing-images/${category}/${fileId}.png`;

    // base64 → Buffer
    const buffer = Buffer.from(imageBase64, 'base64');

    // Storage 업로드
    const { error: uploadError } = await supabase.storage
      .from('clothing-images')
      .upload(filePath, buffer, {
        contentType: 'image/png',
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json(
        { error: '이미지 업로드 실패' },
        { status: 500 },
      );
    }

    // Public URL 획득
    const { data: publicUrlData } = supabase.storage
      .from('clothing-images')
      .getPublicUrl(filePath);

    const imageUrl = publicUrlData.publicUrl;

    // DB INSERT
    const { data: item, error: insertError } = await supabase
      .from('clothing_items')
      .insert({
        id: crypto.randomUUID(),
        user_id: userId,
        category,
        image_url: imageUrl,
        material: material || '알 수 없음',
        color: color || '알 수 없음',
      })
      .select()
      .single();

    if (insertError) {
      console.error('DB insert error:', insertError);
      return NextResponse.json(
        { error: '데이터 저장 실패' },
        { status: 500 },
      );
    }

    return NextResponse.json({ item });
  } catch (error) {
    console.error('Save API error:', error);
    return NextResponse.json(
      { error: '저장 중 오류가 발생했습니다' },
      { status: 500 },
    );
  }
}
