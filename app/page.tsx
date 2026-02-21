import Link from 'next/link';
import ClosetPreview from './components/ClosetPreview';

export default function HomePage() {
  return (
    <main>
      {/* ── 헤더 ── */}
      <div className="px-6 pt-8 pb-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 bg-rose-500 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 className="text-zinc-900 font-bold text-lg">오늘의 코디</h1>
        </div>
        <p className="text-zinc-500 text-sm mt-2">
          사진 한 장으로 나만의 옷장을 만들고,<br />
          AI가 코디를 미리 보여드려요.
        </p>
      </div>

      {/* ── 히어로 ── */}
      <div className="mx-6 rounded-2xl bg-gradient-to-br from-zinc-200 to-zinc-100 p-6 mb-6 relative overflow-hidden">
        <div className="absolute top-4 right-4 w-20 h-20 bg-rose-400/20 rounded-full" />
        <div className="absolute bottom-2 right-8 w-12 h-12 bg-rose-300/20 rounded-full" />
        <p className="text-zinc-800 font-semibold text-base mb-1">전신 사진 1장이면 끝</p>
        <p className="text-zinc-500 text-xs mb-5">AI가 자동으로 분리 · 분석 · 정리</p>
        <Link
          href="/upload"
          className="inline-block bg-rose-500 hover:bg-rose-400 text-white font-semibold text-sm px-6 py-3 rounded-xl shadow-lg shadow-rose-500/25 transition-all"
        >
          사진 업로드하기
        </Link>
      </div>

      {/* ── 이용 방법 ── */}
      <div className="px-6 mb-6">
        <p className="text-zinc-800 font-semibold text-sm mb-3">이렇게 동작해요</p>
        <div className="space-y-3">
          {[
            { num: 1, title: '사진 업로드', desc: '전신이 보이는 사진 1장' },
            { num: 2, title: 'AI 자동 분리', desc: '상의 · 하의 · 신발 분리 + 제품샷' },
            { num: 3, title: '코디 미리보기', desc: '옷장에서 골라서 착용 이미지 확인' },
          ].map((step) => (
            <div key={step.num} className="flex items-start gap-3">
              <div className="w-7 h-7 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                {step.num}
              </div>
              <div>
                <p className="text-zinc-800 text-sm font-medium">{step.title}</p>
                <p className="text-zinc-400 text-xs">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 프라이버시 안내 ── */}
      <div className="px-6 mb-6">
        <div className="flex items-start gap-2">
          <svg className="w-3.5 h-3.5 mt-0.5 shrink-0 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <p className="text-zinc-400 text-xs leading-relaxed">
            사진은 얼굴 모자이크 처리 전까지 서버로 전송되지 않습니다. 얼굴 인식과 모자이크는 모두 기기 내에서 처리됩니다.
          </p>
        </div>
      </div>

      {/* ── 옷장 미리보기 ── */}
      <ClosetPreview />
    </main>
  );
}
