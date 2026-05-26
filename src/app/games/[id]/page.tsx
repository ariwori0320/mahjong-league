import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { notFound } from 'next/navigation'

const rankMedal = ['🥇', '🥈', '🥉', '']
const rankBg = [
  'bg-yellow-50 border-yellow-200',
  'bg-gray-50 border-gray-200',
  'bg-orange-50 border-orange-200',
  'bg-white border-warm-border',
]

export default async function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data: game } = await supabase
    .from('games')
    .select(`
      *,
      leagues(id, name),
      game_results(*, players(id, name))
    `)
    .eq('id', id)
    .single()

  if (!game) notFound()

  const league = game.leagues as any
  const results = (game.game_results as any[])?.sort((a, b) => a.rank - b.rank)
  const gameDate = (game.played_at as string).slice(0, 10)

  return (
    <div>
      {/* ヘッダー */}
      <div className="mb-8">
        <Link
          href={`/leagues/${league?.id}`}
          className="text-sm text-warm-gray hover:text-green-deep transition-colors"
        >
          ← {league?.name}
        </Link>
        <div className="flex items-start justify-between mt-2">
          <div>
            <h1 className="text-2xl font-bold text-green-deep">
              {new Date(game.played_at).toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'short',
              })}
            </h1>
            {game.location && (
              <span className="inline-block text-xs text-warm-gray bg-white border border-warm-border px-2 py-0.5 rounded-full mt-1">
                📍 {game.location}
              </span>
            )}
          </div>
          <Link
            href={`/games/${id}/edit`}
            className="flex-none text-sm border border-warm-border rounded-lg px-3 py-2 text-warm-gray hover:border-green-mid hover:text-green-deep transition-colors"
          >
            編集
          </Link>
        </div>
      </div>

      {/* 対局結果 */}
      <div className="mb-6">
        <h2 className="font-semibold text-green-deep mb-3">対局結果</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {results?.map((result, i) => (
            <div key={result.id} className={`rounded-xl border p-4 text-center ${rankBg[i]}`}>
              <div className="text-2xl mb-1">
                {rankMedal[i] || (
                  <span className="text-gray-400 font-bold text-xl">4</span>
                )}
              </div>
              <div className="font-semibold text-gray-900 text-sm">{result.players?.name}</div>
              <div className="text-lg font-bold text-green-deep mt-1">
                {result.score.toLocaleString()}
              </div>
              <div className="text-xs text-warm-gray">点</div>
            </div>
          ))}
        </div>
      </div>

      {/* カウンター入力へのリンク */}
      {league && (
        <div className="bg-green-light rounded-xl border border-green-mid/30 p-4 mb-6">
          <p className="text-sm text-green-deep font-medium mb-1">カウンター入力</p>
          <p className="text-xs text-warm-gray mb-3">
            この日のカウンターはリーグページから入力できます。
          </p>
          <Link
            href={`/leagues/${league.id}?tab=input&date=${gameDate}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-deep text-white text-sm font-medium rounded-lg hover:bg-green-mid transition-colors"
          >
            🎲 カウンター入力へ →
          </Link>
        </div>
      )}

      {/* メモ */}
      {game.notes && (
        <div className="bg-white rounded-xl border border-warm-border p-4 text-sm text-gray-600">
          <span className="font-medium text-warm-gray">メモ　</span>
          {game.notes}
        </div>
      )}
    </div>
  )
}
