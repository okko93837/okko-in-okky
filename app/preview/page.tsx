import Link from 'next/link';

export default function PreviewPage() {
  return (
    <main className="pb-6">
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
          <span className="text-sm font-semibold text-zinc-800">코디 미리보기</span>
          <span className="text-xs text-zinc-400">아이템을 조합하고 미리보기를 생성하세요</span>
        </div>
      </header>

      <div className="px-4 pt-4">
        {/* 콘텐츠 영역 */}
      </div>
    </main>
  );
}
