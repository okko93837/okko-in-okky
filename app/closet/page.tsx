'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import type { ClothingCategory, ClothingItem } from '@/types';

const categories: { key: ClothingCategory; label: string }[] = [
  { key: 'top', label: '상의' },
  { key: 'bottom', label: '하의' },
  { key: 'shoes', label: '신발' },
];

export default function ClosetPage() {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<ClothingCategory>('top');
  const [loading, setLoading] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();

    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }
      setHasSession(true);

      const { data } = await supabase
        .from('clothing_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (data) setItems(data as ClothingItem[]);
      setLoading(false);
    }

    load();
  }, []);

  const filtered = items.filter((i) => i.category === activeCategory);
  const counts: Record<ClothingCategory, number> = {
    top: items.filter((i) => i.category === 'top').length,
    bottom: items.filter((i) => i.category === 'bottom').length,
    shoes: items.filter((i) => i.category === 'shoes').length,
    dress: items.filter((i) => i.category === 'dress').length,
  };

  return (
    <main className="pb-6">
      {/* 헤더 */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm px-4 py-3 flex items-center gap-3 border-b border-zinc-100 shrink-0">
        <Link
          href="/"
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 transition"
          aria-label="홈으로"
        >
          <svg className="w-5 h-5 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-zinc-800">내 옷장</span>
          <span className="text-xs text-zinc-400">저장된 아이템을 확인하세요</span>
        </div>
      </header>

      <div className="px-4 pt-4">
      {/* 카테고리 탭 */}
      <div className="flex gap-2 mb-4">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`text-xs font-medium px-4 py-1.5 rounded-full transition ${
              activeCategory === cat.key
                ? 'bg-zinc-900 text-white'
                : 'bg-zinc-200 text-zinc-600'
            }`}
          >
            {cat.label} {counts[cat.key] > 0 && `${counts[cat.key]}`}
          </button>
        ))}
      </div>

      {/* 로딩 */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-zinc-300 border-t-rose-500 rounded-full animate-spin" />
        </div>
      )}

      {/* 비로그인 */}
      {!loading && !hasSession && (
        <div className="text-center py-20">
          <svg className="w-10 h-10 mx-auto text-zinc-300 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="12" y1="3" x2="12" y2="21" />
            <path d="M9 8h-1" />
            <path d="M16 8h-1" />
          </svg>
          <p className="text-zinc-500 text-sm">사진을 업로드하면 옷장이 만들어져요</p>
          <Link
            href="/upload"
            className="inline-block mt-4 bg-rose-500 hover:bg-rose-400 text-white text-sm font-semibold px-6 py-2.5 rounded-xl shadow-lg shadow-rose-500/25 transition"
          >
            사진 업로드하기
          </Link>
        </div>
      )}

      {/* 빈 옷장 */}
      {!loading && hasSession && items.length === 0 && (
        <div className="text-center py-20">
          <svg className="w-10 h-10 mx-auto text-zinc-300 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="12" y1="3" x2="12" y2="21" />
            <path d="M9 8h-1" />
            <path d="M16 8h-1" />
          </svg>
          <p className="text-zinc-500 text-sm">아직 저장된 옷이 없어요</p>
          <Link
            href="/upload"
            className="inline-block mt-4 bg-rose-500 hover:bg-rose-400 text-white text-sm font-semibold px-6 py-2.5 rounded-xl shadow-lg shadow-rose-500/25 transition"
          >
            첫 번째 옷 등록하기
          </Link>
        </div>
      )}

      {/* 해당 카테고리 빈 상태 */}
      {!loading && hasSession && items.length > 0 && filtered.length === 0 && (
        <div className="text-center py-16">
          <p className="text-zinc-400 text-sm">
            이 카테고리에 저장된 옷이 없어요
          </p>
          <Link
            href="/upload"
            className="inline-block mt-3 text-rose-500 text-sm font-medium"
          >
            옷 추가하기
          </Link>
        </div>
      )}

      {/* 아이템 그리드 */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {filtered.map((item) => (
            <div key={item.id} className="group">
              <div className="relative aspect-square bg-zinc-200 rounded-xl overflow-hidden">
                <Image
                  src={item.image_url}
                  alt={item.material}
                  fill
                  sizes="(max-width: 768px) 33vw, 120px"
                  className="object-cover"
                />
              </div>
              <p className="text-zinc-500 text-xs mt-1 truncate">{item.material}</p>
            </div>
          ))}
        </div>
      )}
      </div>
    </main>
  );
}
