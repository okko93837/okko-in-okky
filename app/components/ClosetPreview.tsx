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

export default function ClosetPreview() {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<ClothingCategory>('top');

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();

    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data } = await supabase
        .from('clothing_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (data && data.length > 0) {
        setItems(data as ClothingItem[]);
      }
    }

    load();
  }, []);

  const filtered = items.filter((i) => i.category === activeCategory);
  const display = filtered.slice(0, 6);
  const emptySlots = Math.max(0, 6 - display.length);

  return (
    <div className="px-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-zinc-800 font-semibold text-sm">내 옷장</p>
        <Link href="/closet" className="text-rose-500 text-xs font-medium">
          전체보기
        </Link>
      </div>

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
            {cat.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 mb-6">
        {display.map((item) => (
          <div
            key={item.id}
            className="relative aspect-square bg-zinc-200 rounded-xl overflow-hidden"
          >
            <Image
              src={item.image_url}
              alt={item.material}
              fill
              sizes="(max-width: 448px) 33vw, 120px"
              className="object-cover"
            />
          </div>
        ))}
        {Array.from({ length: emptySlots }).map((_, i) =>
          i === emptySlots - 1 ? (
            <Link
              key={`empty-${i}`}
              href="/upload"
              className="aspect-square bg-zinc-100 rounded-xl border-2 border-dashed border-zinc-300 flex items-center justify-center text-zinc-400"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M12 5v14M5 12h14" />
              </svg>
            </Link>
          ) : (
            <div
              key={`empty-${i}`}
              className="aspect-square bg-zinc-200 rounded-xl"
            />
          )
        )}
      </div>
    </div>
  );
}
