export default function Loading() {
  return (
    <div className="w-full flex flex-col gap-6 p-6 animate-pulse mt-4 max-w-7xl mx-auto">
      {/* Header skeleton */}
      <div className="flex justify-between items-center mb-4">
        <div className="w-1/3 h-8 bg-surface-800 rounded-md"></div>
        <div className="w-24 h-8 bg-surface-800 rounded-md"></div>
      </div>
      
      {/* Cards grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-48 bg-surface-900 rounded-2xl border border-white/5 flex flex-col p-6 gap-4">
            <div className="w-1/2 h-6 bg-surface-800 rounded"></div>
            <div className="w-3/4 h-4 bg-surface-800 rounded mt-2"></div>
            <div className="w-full h-12 bg-surface-800 rounded mt-auto"></div>
          </div>
        ))}
      </div>
    </div>
  )
}
