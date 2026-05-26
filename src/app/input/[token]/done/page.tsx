import Link from 'next/link'

export default function DonePage() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-20 h-20 rounded-full bg-green-light flex items-center justify-center mb-5">
        <span className="text-4xl">✓</span>
      </div>
      <h1 className="text-xl font-bold text-green-deep mb-2">保存しました</h1>
      <p className="text-warm-gray text-sm mb-6">カウンターの入力が完了しました。</p>
      <Link
        href="/leagues"
        className="text-sm text-green-mid hover:text-green-deep font-medium transition-colors"
      >
        ← リーグ一覧へ戻る
      </Link>
    </div>
  )
}
