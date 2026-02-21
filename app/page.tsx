import Link from 'next/link';
import ClosetPreview from './components/ClosetPreview';

export default function HomePage() {
  return (
    <main className="bg-zinc-50 space-y-4 pb-6">
      {/* ── 섹션 A: 헤더 ── */}
      <header className="px-6 pt-8 space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-rose-500 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-zinc-900">오늘의 코디</h1>
        </div>
        <p className="text-sm text-zinc-500">
          사진 한 장으로 나만의 옷장을 만들고, AI가 코디를 미리 보여드려요.
        </p>
      </header>

      {/* ── 섹션 B: 히어로 카드 + 프라이버시 배지 ── */}
      <section className="px-6 space-y-3">
        <div className="relative bg-gradient-to-br from-zinc-200 to-zinc-100 rounded-2xl p-6 overflow-hidden">
          <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-rose-500/10" />
          <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-rose-500/20" />
          <div className="relative space-y-4">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-zinc-900">전신 사진 1장이면 끝</h2>
              <p className="text-xs text-zinc-500">
                AI가 옷을 자동으로 분리하고 제품샷으로 만들어드려요
              </p>
            </div>
            <Link
              href="/upload"
              className="flex w-full items-center justify-center rounded-xl bg-rose-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-500/25 transition hover:bg-rose-400"
            >
              사진 업로드하기
            </Link>
          </div>
        </div>

        <div className="flex items-start gap-3 bg-white border border-zinc-200 rounded-xl p-3">
          <svg className="w-4 h-4 mt-0.5 shrink-0 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <p className="text-xs text-zinc-500 leading-relaxed">
            업로드된 사진은 얼굴 모자이크 처리가 완료되기 전까지 서버로 전송되지 않습니다. 얼굴 인식과 모자이크는 모두 기기 내에서 처리됩니다.
          </p>
        </div>
      </section>

      {/* ── 섹션 C: 이용 방법 (3스텝) ── */}
      <section className="px-6 space-y-3">
        <h2 className="text-sm font-semibold text-zinc-900">이용 방법</h2>
        <div className="space-y-2">
          {[
            { num: 1, title: '사진 업로드', desc: '전신이 보이는 사진 1장' },
            { num: 2, title: 'AI 자동 분리', desc: '상의 · 하의 · 신발 분리 + 제품샷' },
            { num: 3, title: '코디 미리보기', desc: '옷장에서 골라서 착용 이미지 확인' },
          ].map((step) => (
            <div
              key={step.num}
              className="flex items-center gap-3 bg-white border border-zinc-200 rounded-xl px-4 py-3"
            >
              <span className="flex items-center justify-center w-7 h-7 bg-rose-100 text-rose-600 rounded-full text-xs font-bold shrink-0">
                {step.num}
              </span>
              <div>
                <p className="text-sm font-medium text-zinc-900">{step.title}</p>
                <p className="text-xs text-zinc-500">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 섹션 D: 한계 고지 배너 ── */}
      <section className="px-6">
        <div className="bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 space-y-2">
          <h3 className="text-xs font-semibold text-zinc-700">알아두세요</h3>
          <ul className="space-y-1">
            {[
              '옷의 앞면만 인식 가능, 뒷면 미지원',
              '레이어드 코디는 하나의 옷으로 인식',
              '같은 옷 중복 업로드 시 중복 등록 가능',
            ].map((text) => (
              <li key={text} className="flex items-start gap-2 text-xs text-zinc-500">
                <span className="mt-1.5 w-1 h-1 rounded-full bg-zinc-400 shrink-0" />
                {text}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── 섹션 E: 옷장 미리보기 ── */}
      <ClosetPreview />
    </main>
  );
}
