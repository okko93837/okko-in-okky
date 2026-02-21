import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="text-center">
        <h1 className="text-lg font-bold text-zinc-900">오늘의 코디</h1>
        <p className="mt-3 text-sm text-zinc-500">
          전신 사진 한 장으로 나만의 옷장을 만들어보세요
        </p>
      </div>
      <div className="mt-8 w-full">
        <Link
          href="/upload"
          className="flex w-full items-center justify-center rounded-xl bg-rose-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-500/25 transition hover:bg-rose-400"
        >
          시작하기
        </Link>
      </div>
    </main>
  );
}
