export default function Loading() {
  return (
    <div className="w-full max-w-2xl mx-auto px-6 md:px-10 py-10 md:py-16 animate-pulse">
      {/* Heading */}
      <div className="mb-8">
        <div className="h-9 w-72 bg-[#E7E5E4] rounded-xl mb-3" />
        <div className="h-4 w-56 bg-[#E7E5E4] rounded-lg" />
      </div>
      {/* CTA button */}
      <div className="h-12 w-40 bg-[#E7E5E4] rounded-lg mb-10" />
      {/* Session cards */}
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-[#E7E5E4] rounded-xl" />
        ))}
      </div>
    </div>
  );
}
