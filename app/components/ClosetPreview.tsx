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
  const [visible, setVisible] = useState(false);

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
        setVisible(true);
      }
    }

    load();
  }, []);

  if (!visible) return null;

  const filtered = items.filter((i) => i.category === activeCategory);
  const display = filtered.slice(0, 3);
  const emptySlots = Math.max(0, 3 - display.length);

  return (
    <section className="px-6 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-900">내 옷장</h2>
        <Link href="/closet" className="text-xs text-rose-500 font-medium">
          전체보기
        </Link>
      </div>

      <div className="flex gap-2">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition ${
              activeCategory === cat.key
                ? 'bg-zinc-900 text-white'
                : 'bg-zinc-200 text-zinc-600'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {display.map((item) => (
          <div
            key={item.id}
            className="relative aspect-square rounded-xl overflow-hidden bg-zinc-100"
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
        {Array.from({ length: emptySlots }).map((_, i) => (
          <Link
            key={`empty-${i}`}
            href="/upload"
            className="aspect-square rounded-xl border-2 border-dashed border-zinc-300 flex items-center justify-center text-zinc-400"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </Link>
        ))}
      </div>
    </section>
  );
}
