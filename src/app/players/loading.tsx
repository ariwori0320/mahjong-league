export default function Loading() {
  return (
    <div className="animate-pulse">
      {/* ヘッダー */}
      <div className="mb-8">
        <div className="h-7 w-44 bg-gray-200 rounded mb-2" />
        <div className="h-4 w-60 bg-gray-100 rounded" />
      </div>

      {/* 追加フォーム */}
      <div className="bg-white rounded-xl border border-warm-border p-5 max-w-lg mb-6">
        <div className="h-5 w-36 bg-gray-100 rounded mb-3" />
        <div className="h-11 bg-gray-100 rounded-lg" />
      </div>

      {/* リスト */}
      <div className="bg-white rounded-xl border border-warm-border max-w-lg overflow-hidden">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={`flex items-center gap-3 px-5 py-3 ${i > 1 ? 'border-t border-cream' : ''}`}>
            <div className="w-7 h-7 bg-gray-100 rounded-full" />
            <div className="h-4 w-32 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
