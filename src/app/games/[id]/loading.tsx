export default function Loading() {
  return (
    <div className="animate-pulse">
      {/* ヘッダー */}
      <div className="mb-8">
        <div className="h-4 w-24 bg-gray-100 rounded mb-3" />
        <div className="flex items-start justify-between">
          <div className="h-8 w-52 bg-gray-200 rounded" />
          <div className="h-9 w-14 bg-gray-100 rounded-lg" />
        </div>
      </div>

      {/* 対局結果 */}
      <div className="mb-6">
        <div className="h-5 w-24 bg-gray-100 rounded mb-3" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border border-warm-border p-4 bg-white">
              <div className="h-7 w-7 bg-gray-100 rounded-full mx-auto mb-2" />
              <div className="h-4 w-16 bg-gray-200 rounded mx-auto mb-2" />
              <div className="h-5 w-14 bg-gray-100 rounded mx-auto" />
            </div>
          ))}
        </div>
      </div>

      <div className="h-20 bg-gray-100 rounded-xl" />
    </div>
  )
}
