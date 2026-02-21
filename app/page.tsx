import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">오늘의 코디</h1>
        <p className="mt-4 text-lg text-gray-600">
          전신 사진 한 장으로 나만의 옷장을 만들어보세요
        </p>
      </div>
      <Link
        href="/upload"
        className="rounded-lg bg-black px-6 py-3 text-white transition hover:bg-gray-800"
      >
        시작하기
      </Link>
    </main>
  );
}
