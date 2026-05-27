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
        {[80, 64, 120, 64].map((w, i) => (
          <div key={i} className="h-10 bg-gray-100 rounded-t-lg" style={{ width: w }} />
        ))}
      </div>

      {/* コンテンツ（対局一覧スケルトン） */}
      <div className="space-y-6">
        {[1, 2].map((i) => (
          <div key={i}>
            <div className="h-5 w-40 bg-gray-100 rounded mb-2 mx-1" />
            <div className="bg-white rounded-xl border border-warm-border overflow-hidden shadow-sm">
              {[1, 2].map((j) => (
                <div
                  key={j}
                  className={`h-16 flex items-center px-3 gap-3 ${
                    j > 1 ? 'border-t border-warm-border' : ''
                  }`}
                >
                  <div className="h-4 w-8 bg-gray-100 rounded" />
                  <div className="grid grid-cols-4 gap-1.5 flex-1">
                    {[1, 2, 3, 4].map((k) => (
                      <div key={k} className="h-12 bg-gray-100 rounded-lg" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
