import { createAuthClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import LeagueTabContent from './TabContent'

export default async function LeaguePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{
    tab?: string
    date?: string
    saved?: string
    from?: string
    to?: string
  }>
}) {
  const { id } = await params
  const { tab = 'games', date, saved, from, to } = await searchParams

  // 最小限: リーグ情報 + 対局数のみ（2クエリ並列）
  const supabase = await createAuthClient()
  const [{ data: league }, { count: gameCount }] = await Promise.all([
    supabase.from('leagues').select('*').eq('id', id).single(),
    supabase.from('games').select('id', { count: 'exact', head: true }).eq('league_id', id),
  ])

  if (!league) notFound()

  const hasRule =
    league.uma_1 != null &&
    league.uma_2 != null &&
    league.return_points != null &&
    league.starting_points != null

  return (
    <div>
      {/* ヘッダー（サーバーで即時描画） */}
      <div className="mb-6">
        <Link href="/leagues" className="text-sm text-warm-gray hover:text-green-deep transition-colors">
          ← リーグ一覧
        </Link>
        <h1 className="text-2xl font-bold text-green-deep mt-2">{league.name}</h1>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          {league.start_date && (
            <span className="text-xs text-warm-gray bg-white border border-warm-border px-2 py-0.5 rounded-full">
              {league.start_date} 〜 {league.end_date ?? '終了日未定'}
            </span>
          )}
          <span className="text-xs text-warm-gray bg-white border border-warm-border px-2 py-0.5 rounded-full">
            {gameCount ?? 0}戦
          </span>
          {hasRule && (
            <span className="text-xs text-green-deep bg-green-light border border-green-mid/30 px-2 py-0.5 rounded-full">
              ウマ {league.uma_1}/{league.uma_2} · {league.starting_points?.toLocaleString()}点持ち
              {league.return_points?.toLocaleString()}点返し
            </span>
          )}
        </div>
        {league.notes && <p className="text-sm text-gray-500 mt-2">{league.notes}</p>}
      </div>

      {/* タブ + コンテンツ: ブラウザ側でデータ取得・タブ切り替え */}
      <LeagueTabContent
        id={id}
        league={league}
        hasRule={hasRule}
        initialTab={tab}
        initialSelectedDate={date}
        initialStatsFrom={from}
        initialStatsTo={to}
        initialSaved={!!saved}
      />
    </div>
  )
}
