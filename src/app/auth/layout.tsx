export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-[#FDFCF8] overflow-hidden">
      {/* Subtle background glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(217,119,6,0.06),transparent_70%)]" />
      {/* Top nav */}
      <div className="relative px-6 py-6 md:px-12 flex items-center justify-between">
        <a
          href="/"
          className="font-serif text-2xl font-semibold text-[#1A1A1A] hover:opacity-70 transition-opacity"
        >
          StudyWith
        </a>
        <a
          href="/"
          className="text-xs text-[#A8A29E] hover:text-[#57534E] transition-colors"
        >
          ← Back to home
        </a>
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}
