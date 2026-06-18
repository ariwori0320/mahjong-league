export default function Loading() {
  return (
    <div className="animate-pulse">
      {/* ヘッダー */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <div className="h-7 w-40 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-56 bg-gray-100 rounded" />
        </div>
        <div className="h-10 w-28 bg-gray-200 rounded-lg" />
      </div>

      {/* リーグカード */}
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 bg-white rounded-xl border border-warm-border px-5 py-4">
            <div className="w-1.5 h-12 bg-gray-200 rounded-full" />
            <div className="flex-1">
              <div className="h-4 w-44 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-32 bg-gray-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
