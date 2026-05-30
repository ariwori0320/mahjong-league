import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { LeagueRule } from '@/lib/stats'
import LeagueTabContent from './TabContent'

// ── Suspense フォールバック（タブ切り替え時のスケルトン） ─────

function TabSkeleton({ tab }: { tab: string }) {
  if (tab === 'stats') {
    return (
      <div className="animate-pulse">
        <div className="h-[76px] bg-white rounded-xl border border-warm-border mb-5" />
        <div className="bg-white rounded-xl border border-warm-border overflow-hidden shadow-sm">
          <div className="h-11 bg-gray-100" />
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-12 border-t border-warm-border flex items-center px-4 gap-6"
            >
              <div className="h-4 w-20 bg-gray-100 rounded" />
              <div className="h-4 w-6 bg-gray-100 rounded ml-auto" />
              <div className="h-4 w-10 bg-gray-100 rounded" />
              <div className="h-4 w-10 bg-gray-100 rounded" />
              <div className="h-4 w-10 bg-gray-100 rounded" />
              <div className="h-4 w-10 bg-gray-100 rounded" />
              <div className="h-4 w-10 bg-gray-100 rounded" />
              <div className="h-4 w-12 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (tab === 'settings') {
    return (
      <div className="animate-pulse">
        <div className="bg-white rounded-xl border border-warm-border p-6 max-w-lg space-y-5 shadow-sm">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-10 bg-gray-100 rounded-lg" />
          ))}
          <div className="h-10 w-24 bg-gray-200 rounded-lg" />
        </div>
      </div>
    )
  }

  // games / input
  return (
    <div className="animate-pulse space-y-6">
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
  )
}

// ── ページ ────────────────────────────────────────────────────

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
  const {
    tab = 'games',
    date: selectedDate,
    saved,
    from: statsFrom,
    to: statsTo,
  } = await searchParams

  // ── ヘッダー用に最小限のデータを並列取得（高速） ────────────
  const [{ data: league }, { count: gameCount }] = await Promise.all([
    supabase.from('leagues').select('*').eq('id', id).single(),
    supabase
      .from('games')
      .select('id', { count: 'exact', head: true })
      .eq('league_id', id),
  ])

  if (!league) notFound()

  const tabBase = `/leagues/${id}`

  const hasRule =
    league.uma_1 != null &&
    league.uma_2 != null &&
    league.return_points != null &&
    league.starting_points != null

  const leagueRule: LeagueRule | null = hasRule
    ? {
        uma: [league.uma_1, league.uma_2, league.uma_3, league.uma_4] as [
          number,
          number,
          number,
          number,
        ],
        startingPoints: league.starting_points,
        returnPoints: league.return_points,
        tieRule: (league.tie_rule ?? 'order') as 'split' | 'order',
      }
    : null

  return (
    <div>
      {/* ── ヘッダー（即時表示） ──────────────────────────────── */}
      <div className="mb-6">
        <Link
          href="/leagues"
          className="text-sm text-warm-gray hover:text-green-deep transition-colors"
        >
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

      {/* ── タブ（即時表示） ─────────────────────────────────── */}
      <div className="flex gap-1 mb-6 border-b border-warm-border overflow-x-auto">
        {[
          { key: 'games', label: '対局一覧', href: tabBase },
          { key: 'stats', label: '成績集計', href: `${tabBase}?tab=stats` },
          { key: 'input', label: '🎲 カウンター入力', href: `${tabBase}?tab=input` },
          { key: 'settings', label: '⚙️ 設定', href: `${tabBase}?tab=settings` },
        ].map(({ key, label, href }) => (
          <Link
            key={key}
            href={href}
            className={`flex-none px-4 py-3 text-sm font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap ${
              tab === key
                ? 'border-green-deep text-green-deep bg-white'
                : 'border-transparent text-warm-gray hover:text-green-deep'
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* ── タブコンテンツ（Suspense でストリーミング） ──────── */}
      {/* タブをクリックすると即座にスケルトンが表示され、データ読み込み後にコンテンツが現れる */}
      <Suspense fallback={<TabSkeleton tab={tab} />}>
        <LeagueTabContent
          id={id}
          tab={tab}
          league={league}
          hasRule={hasRule}
          leagueRule={leagueRule}
          selectedDate={selectedDate}
          saved={saved}
          statsFrom={statsFrom}
          statsTo={statsTo}
        />
      </Suspense>
    </div>
  )
}
