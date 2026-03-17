export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#FDFCF8]">
      <div className="px-6 py-6 md:px-12">
        <a
          href="/"
          className="font-serif text-2xl font-semibold text-[#1A1A1A] hover:opacity-70 transition-opacity"
        >
          StudyWith
        </a>
      </div>
      {children}
    </div>
  );
}
