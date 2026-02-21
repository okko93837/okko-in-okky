'use client';

export default function UploadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-dvh">
      {children}

      {/* BottomNav 숨김 + 부모 컨테이너 패딩 제거 */}
      <style>{`
        nav[aria-label="주요 메뉴"] { display: none !important; }
        body > div:first-child { padding-bottom: 0 !important; }
      `}</style>
    </div>
  );
}
