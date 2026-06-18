export default function Loading() {
  return (
    <div className="animate-pulse">
      {/* ヘッダー */}
      <div className="mb-8">
        <div className="h-4 w-28 bg-gray-100 rounded mb-3" />
        <div className="h-8 w-40 bg-gray-200 rounded" />
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-warm-border p-4 bg-white">
            <div className="h-3 w-16 bg-gray-100 rounded mb-2" />
            <div className="h-6 w-12 bg-gray-200 rounded" />
          </div>
        ))}
      </div>

      {/* テーブル */}
      <div className="bg-white rounded-xl border border-warm-border overflow-hidden">
        <div className="h-11 bg-gray-100" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-12 border-t border-warm-border" />
        ))}
      </div>
    </div>
  )
}
