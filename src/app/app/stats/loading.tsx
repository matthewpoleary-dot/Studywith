export default function Loading() {
  return (
    <div className="w-full max-w-2xl mx-auto px-6 md:px-10 py-10 md:py-16 animate-pulse">
      {/* Heading */}
      <div className="mb-8">
        <div className="h-9 w-40 bg-[#E7E5E4] rounded-xl mb-3" />
        <div className="h-4 w-52 bg-[#E7E5E4] rounded-lg" />
      </div>
      {/* Streak + goal cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="h-28 bg-[#E7E5E4] rounded-2xl" />
        <div className="h-28 bg-[#E7E5E4] rounded-2xl" />
      </div>
      {/* Count cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-[#E7E5E4] rounded-2xl" />
        ))}
      </div>
      {/* Session list */}
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 bg-[#E7E5E4] rounded-xl" />
        ))}
      </div>
    </div>
  );
}
