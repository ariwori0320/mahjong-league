export default function Loading() {
  return (
    <div className="animate-pulse">
      {/* ヘッダー */}
      <div className="mb-6">
        <div className="h-4 w-16 bg-gray-200 rounded mb-3" />
        <div className="h-8 w-52 bg-gray-200 rounded mb-2" />
        <div className="flex gap-2">
          <div className="h-5 w-24 bg-gray-100 rounded-full" />
          <div className="h-5 w-16 bg-gray-100 rounded-full" />
        </div>
      </div>

      {/* タブ */}
      <div className="flex gap-1 mb-6 border-b border-warm-border">
        {[80, 64, 96, 48].map((w, i) => (
          <div key={i} className={`h-10 bg-gray-100 rounded-t-lg`} style={{ width: w }} />
        ))}
      </div>

      {/* コンテンツ */}
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-white rounded-xl border border-warm-border" />
        ))}
      </div>
    </div>
  )
}
