'use client'

import { getSupabaseBrowser } from '@/lib/supabase-browser'
import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { calcPlayerStats, type LeagueRule } from '@/lib/stats'
import CounterInputForm from '@/components/CounterInputForm'
import CopyTokenLink from '@/components/CopyTokenLink'
import {
  saveCounters,
  generateInvite,
  updateLeagueSettings,
  deleteLeague,
  addLeaguePlayer,
  removeLeaguePlayer,
} from './actions'

// ── 定数 ──────────────────────────────────────────────────────

const rankLabel = ['🥇', '🥈', '🥉', '④']

const inputClass =
  'w-full border border-warm-border rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-green-mid focus:ring-1 focus:ring-green-mid transition-colors'

// ── スケルトン ────────────────────────────────────────────────

function TabSkeleton({ tab }: { tab: string }) {
  if (tab === 'stats') {
    return (
      <div className="animate-pulse">
        <div className="h-[76px] bg-white rounded-xl border border-warm-border mb-5" />
        <div className="bg-white rounded-xl border border-warm-border overflow-hidden shadow-sm">
          <div className="h-11 bg-gray-100" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 border-t border-warm-border flex items-center px-4 gap-6">
              <div className="h-4 w-20 bg-gray-100 rounded" />
              <div className="h-4 w-6 bg-gray-100 rounded ml-auto" />
              {[1, 2, 3, 4, 5, 6].map((j) => (
                <div key={j} className="h-4 w-10 bg-gray-100 rounded" />
              ))}
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
  return (
    <div className="animate-pulse space-y-6">
      {[1, 2].map((i) => (
        <div key={i}>
          <div className="h-5 w-40 bg-gray-100 rounded mb-2 mx-1" />
          <div className="bg-white rounded-xl border border-warm-border overflow-hidden shadow-sm">
            {[1, 2].map((j) => (
              <div
                key={j}
                className={`h-16 flex items-center px-3 gap-3 ${j > 1 ? 'border-t border-warm-border' : ''}`}
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

// ── 型 ────────────────────────────────────────────────────────

type FullData = {
  games: any[]
  counterTypes: any[]
  allDayCounters: any[]
  leaguePlayersRows: any[]
  allPlayers: any[]
  invite: any
}

// ── メインコンポーネント ──────────────────────────────────────

export default function LeagueTabContent({
  id,
  league,
  hasRule,
  initialTab = 'games',
  initialSelectedDate,
  initialStatsFrom,
  initialStatsTo,
  initialSaved = false,
}: {
  id: string
  league: any
  hasRule: boolean
  initialTab?: string
  initialSelectedDate?: string
  initialStatsFrom?: string
  initialStatsTo?: string
  initialSaved?: boolean
}) {
  const tabBase = `/leagues/${id}`
  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10)

  // タブ（即時切り替え）
  const [activeTab, setActiveTab] = useState(initialTab)

  // データ
  const [loading, setLoading] = useState(true)
  const [d, setD] = useState<FullData | null>(null)

  // 成績フィルター
  const [statsFrom, setStatsFrom] = useState(initialStatsFrom ?? '')
  const [statsTo, setStatsTo] = useState(initialStatsTo ?? '')
  const [statsFromInput, setStatsFromInput] = useState(initialStatsFrom ?? '')
  const [statsToInput, setStatsToInput] = useState(initialStatsTo ?? '')

  // カウンター入力の日付
  const [selectedDate, setSelectedDate] = useState(initialSelectedDate ?? today)
  const [selectedDateInput, setSelectedDateInput] = useState(initialSelectedDate ?? today)

  // 保存バナー
  const [savedType, setSavedType] = useState<'counter' | 'settings' | null>(() => {
    if (!initialSaved) return null
    if (initialTab === 'input') return 'counter'
    if (initialTab === 'settings') return 'settings'
    return null
  })

  // 保存バナーを3秒後に消す
  useEffect(() => {
    if (!savedType) return
    const t = setTimeout(() => setSavedType(null), 3000)
    return () => clearTimeout(t)
  }, [savedType])

  // ブラウザから直接 Supabase へクエリ（サーバー経由なし）
  const fetchAll = useCallback(async () => {
    setLoading(true)
    const supabase = getSupabaseBrowser()
    const [g, ct, dc, lp, p, inv] = await Promise.all([
      supabase
        .from('games')
        .select('*, game_results(player_id, score, rank, players(id, name))')
        .eq('league_id', id)
        .order('played_at', { ascending: false }),
      supabase.from('counter_types').select('*').order('created_at'),
      supabase
        .from('league_day_counters')
        .select('player_id, counter_type_id, count, date')
        .eq('league_id', id),
      supabase.from('league_players').select('player_id, players(id, name)').eq('league_id', id),
      supabase.from('players').select('id, name').order('name'),
      supabase.from('league_invites').select('token').eq('league_id', id).maybeSingle(),
    ])
    setD({
      games: g.data ?? [],
      counterTypes: ct.data ?? [],
      allDayCounters: dc.data ?? [],
      leaguePlayersRows: lp.data ?? [],
      allPlayers: p.data ?? [],
      invite: inv.data,
    })
    setLoading(false)
  }, [id])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  // ポイントルール
  const leagueRule = useMemo<LeagueRule | null>(() => {
    if (!hasRule) return null
    return {
      uma: [league.uma_1, league.uma_2, league.uma_3, league.uma_4],
      startingPoints: league.starting_points,
      returnPoints: league.return_points,
      tieRule: (league.tie_rule ?? 'order') as 'split' | 'order',
    }
  }, [league, hasRule])

  // ── タブバー（ローディング中も表示）─────────────────────────
  const tabBar = (
    <div className="flex gap-1 mb-6 border-b border-warm-border overflow-x-auto">
      {[
        { key: 'games', label: '対局一覧' },
        { key: 'stats', label: '成績集計' },
        { key: 'input', label: '🎲 カウンター入力' },
        { key: 'settings', label: '⚙️ 設定' },
      ].map(({ key, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => setActiveTab(key)}
          className={`flex-none px-4 py-3 text-sm font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap ${
            activeTab === key
              ? 'border-green-deep text-green-deep bg-white'
              : 'border-transparent text-warm-gray hover:text-green-deep'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )

  if (loading || !d) {
    return (
      <>
        {tabBar}
        <TabSkeleton tab={activeTab} />
      </>
    )
  }

  // ── データ展開 ────────────────────────────────────────────
  const { games, counterTypes, allDayCounters, leaguePlayersRows, allPlayers, invite } = d

  const getDate = (g: any) => (g.played_at as string).slice(0, 10)

  // 成績フィルター（クライアント側で即時フィルタリング）
  const statsGames =
    statsFrom || statsTo
      ? games.filter((g) => {
          const date = getDate(g)
          return (!statsFrom || date >= statsFrom) && (!statsTo || date <= statsTo)
        })
      : games
  const statsCounters =
    statsFrom || statsTo
      ? allDayCounters.filter((c) => {
          const date = c.date as string
          return (!statsFrom || date >= statsFrom) && (!statsTo || date <= statsTo)
        })
      : allDayCounters

  const playerStats = calcPlayerStats(statsGames, counterTypes, leagueRule, statsCounters)

  // 対局一覧グループ
  const gamesByDate: { date: string; dayGames: any[] }[] = []
  const dateMap: Record<string, any[]> = {}
  for (const g of games) {
    const date = getDate(g)
    if (!dateMap[date]) {
      dateMap[date] = []
      gamesByDate.push({ date, dayGames: dateMap[date] })
    }
    dateMap[date].push(g)
  }
  for (const group of gamesByDate) {
    group.dayGames.sort((a, b) =>
      (a.played_at as string).localeCompare(b.played_at as string)
    )
  }

  // カウンター入力
  const counterDates = [
    ...new Set(allDayCounters.map((c) => c.date as string)),
  ].sort().reverse()

  const activeDayCounters = allDayCounters.filter((c) => c.date === selectedDate)
  const inputCounterMap: Record<string, number> = {}
  for (const c of activeDayCounters) {
    inputCounterMap[`${c.player_id}_${c.counter_type_id}`] = c.count
  }

  // プレイヤーリスト
  const leaguePlayerMap: Record<
    string,
    { player_id: string; rank: number; players: { name: string } | null; fromGame: boolean }
  > = {}
  for (const game of games) {
    for (const result of (game.game_results as any[]) ?? []) {
      if (result.players) {
        leaguePlayerMap[result.player_id] = {
          player_id: result.player_id,
          rank: 0,
          players: result.players,
          fromGame: true,
        }
      }
    }
  }
  for (const row of leaguePlayersRows) {
    if (!leaguePlayerMap[row.player_id]) {
      leaguePlayerMap[row.player_id] = {
        player_id: row.player_id,
        rank: 0,
        players: (row.players as any) ?? null,
        fromGame: false,
      }
    }
  }
  const inputPlayers = Object.values(leaguePlayerMap).sort((a, b) =>
    (a.players?.name ?? '').localeCompare(b.players?.name ?? '', 'ja')
  )
  const manualPlayerIds = new Set(leaguePlayersRows.map((r) => r.player_id))
  const addablePlayers = allPlayers.filter((p) => !leaguePlayerMap[p.id])

  // サーバーアクションのバインド
  const inputAction = saveCounters.bind(null, id, selectedDate)
  const settingsAction = updateLeagueSettings.bind(null, id)
  const generateInviteAction = generateInvite.bind(null, id)
  const deleteLeagueAction = deleteLeague.bind(null, id)
  const addLeaguePlayerAction = addLeaguePlayer.bind(null, id)

  // ── 描画 ─────────────────────────────────────────────────
  return (
    <>
      {tabBar}

      {/* ── 対局一覧 ──────────────────────────────────────── */}
      {activeTab === 'games' && (
        <div>
          <div className="flex justify-end mb-4">
            <Link
              href={`/leagues/${id}/games/new`}
              className="bg-green-deep text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-mid transition-colors shadow-sm"
            >
              ＋ 対局を追加
            </Link>
          </div>
          {!games.length ? (
            <div className="bg-white rounded-xl border border-warm-border p-10 text-center">
              <p className="text-warm-gray text-sm">対局がまだありません。</p>
            </div>
          ) : (
            <div className="space-y-6">
              {gamesByDate.map(({ date, dayGames }) => (
                <div key={date}>
                  <div className="flex items-center gap-3 mb-2 px-1">
                    <h3 className="font-semibold text-green-deep text-sm">
                      {new Date(date + 'T00:00:00').toLocaleDateString('ja-JP', {
                        year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
                      })}
                    </h3>
                    <span className="text-xs text-warm-gray bg-white border border-warm-border px-2 py-0.5 rounded-full">
                      {dayGames.length}局
                    </span>
                  </div>
                  <div className="bg-white rounded-xl border border-warm-border overflow-hidden shadow-sm">
                    {dayGames.map((game, gameIndex) => (
                      <Link
                        key={game.id}
                        href={`/games/${game.id}`}
                        className={`block p-3 hover:bg-green-light/50 transition-colors group ${
                          gameIndex > 0 ? 'border-t border-warm-border' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-warm-gray flex-none w-8 text-center">
                            第{gameIndex + 1}局
                          </span>
                          <div className="grid grid-cols-4 gap-1.5 flex-1">
                            {(game.game_results as any[])
                              ?.sort((a: any, b: any) => a.rank - b.rank)
                              .map((result: any, i: number) => (
                                <div
                                  key={result.player_id}
                                  className="text-center bg-green-light rounded-lg py-1.5 px-1"
                                >
                                  <div className="text-sm leading-none">{rankLabel[i]}</div>
                                  <div className="text-xs font-semibold text-gray-800 mt-0.5 truncate">
                                    {result.players?.name}
                                  </div>
                                  <div className="text-xs text-warm-gray mt-0.5">
                                    {result.score.toLocaleString()}
                                  </div>
                                </div>
                              ))}
                          </div>
                          <span className="text-xs text-green-mid group-hover:text-vermilion transition-colors flex-none">›</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 成績集計 ──────────────────────────────────────── */}
      {activeTab === 'stats' && (
        <div>
          <div className="bg-white rounded-xl border border-warm-border p-4 mb-5 shadow-sm">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                setStatsFrom(statsFromInput)
                setStatsTo(statsToInput)
              }}
            >
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-xs text-warm-gray mb-1">開始日</label>
                  <input
                    type="date"
                    value={statsFromInput}
                    onChange={(e) => setStatsFromInput(e.target.value)}
                    className="border border-warm-border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-green-mid"
                  />
                </div>
                <span className="text-warm-gray pb-2 text-sm">〜</span>
                <div>
                  <label className="block text-xs text-warm-gray mb-1">終了日</label>
                  <input
                    type="date"
                    value={statsToInput}
                    onChange={(e) => setStatsToInput(e.target.value)}
                    className="border border-warm-border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-green-mid"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-deep text-white rounded-lg text-sm font-medium hover:bg-green-mid transition-colors"
                  >
                    絞り込む
                  </button>
                  {(statsFrom || statsTo) && (
                    <button
                      type="button"
                      onClick={() => {
                        setStatsFrom(''); setStatsTo('')
                        setStatsFromInput(''); setStatsToInput('')
                      }}
                      className="px-4 py-2 border border-warm-border rounded-lg text-sm text-warm-gray hover:bg-cream transition-colors"
                    >
                      全期間
                    </button>
                  )}
                </div>
              </div>
              {(statsFrom || statsTo) && (
                <p className="text-xs text-green-deep mt-2 font-medium">
                  絞り込み中: {statsFrom || '〜'} 〜 {statsTo || '現在'}（{statsGames.length}局）
                </p>
              )}
            </form>
          </div>

          {!playerStats.length ? (
            <div className="bg-white rounded-xl border border-warm-border p-10 text-center">
              <p className="text-warm-gray text-sm">
                {statsFrom || statsTo ? '指定期間に対局データがありません。' : 'まだ対局データがありません。'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-warm-border overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-green-deep text-white">
                      <th className="text-left px-4 py-3 font-medium whitespace-nowrap sticky left-0 bg-green-deep">プレイヤー</th>
                      <th className="text-center px-3 py-3 font-medium whitespace-nowrap">対局数</th>
                      <th className="text-center px-3 py-3 font-medium whitespace-nowrap">平均順位</th>
                      <th className="text-center px-3 py-3 font-medium whitespace-nowrap">1位率</th>
                      <th className="text-center px-3 py-3 font-medium whitespace-nowrap">2位率</th>
                      <th className="text-center px-3 py-3 font-medium whitespace-nowrap">3位率</th>
                      <th className="text-center px-3 py-3 font-medium whitespace-nowrap">4位率</th>
                      <th className="text-center px-3 py-3 font-medium whitespace-nowrap">平均点</th>
                      {leagueRule && (
                        <th className="text-center px-3 py-3 font-medium whitespace-nowrap border-l border-green-mid/50">ポイント</th>
                      )}
                      {counterTypes.map((ct) => (
                        <th key={ct.id} className="text-center px-3 py-3 font-medium whitespace-nowrap text-xs border-l border-green-mid/30">
                          {ct.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {playerStats.map((stat, i) => (
                      <tr key={stat.id} className={`border-t border-cream hover:bg-cream/50 transition-colors ${i === 0 ? 'font-medium' : ''}`}>
                        <td className="px-4 py-3 whitespace-nowrap sticky left-0 bg-white">
                          <Link href={`/players/${stat.id}`} className="text-green-deep hover:text-vermilion hover:underline transition-colors">
                            {stat.name}
                          </Link>
                        </td>
                        <td className="text-center px-3 py-3 text-warm-gray">{stat.games}</td>
                        <td className="text-center px-3 py-3">
                          <span className={`font-semibold ${stat.avgRank <= 2 ? 'text-green-deep' : 'text-gray-700'}`}>
                            {stat.avgRank.toFixed(2)}
                          </span>
                        </td>
                        <td className="text-center px-3 py-3">
                          <span className={`font-semibold ${stat.topRate >= 30 ? 'text-vermilion' : 'text-gray-700'}`}>
                            {stat.topRate}%
                          </span>
                        </td>
                        <td className="text-center px-3 py-3">
                          <span className="text-gray-600">{stat.secondRate}%</span>
                        </td>
                        <td className="text-center px-3 py-3">
                          <span className="text-gray-500">{stat.thirdRate}%</span>
                        </td>
                        <td className="text-center px-3 py-3">
                          <span className={stat.lastRate >= 30 ? 'text-vermilion' : 'text-gray-500'}>
                            {stat.lastRate}%
                          </span>
                        </td>
                        <td className="text-center px-3 py-3 text-gray-700">
                          {stat.avgScore.toLocaleString()}
                        </td>
                        {leagueRule && (
                          <td className="text-center px-3 py-3 border-l border-cream">
                            {stat.totalPoints !== null ? (
                              <span className={`font-bold text-base ${stat.totalPoints >= 0 ? 'text-green-deep' : 'text-vermilion'}`}>
                                {stat.totalPoints >= 0 ? '+' : ''}{stat.totalPoints.toFixed(1)}
                              </span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                        )}
                        {counterTypes.map((ct) => (
                          <td key={ct.id} className="text-center px-3 py-3 border-l border-cream">
                            <span className={(stat.counters[ct.id] ?? 0) > 0 ? 'text-gray-800 font-medium' : 'text-gray-300'}>
                              {stat.counters[ct.id] ?? 0}
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── カウンター入力 ─────────────────────────────────── */}
      {activeTab === 'input' && (
        <div>
          {savedType === 'counter' && (
            <div className="mb-5 bg-green-light border border-green-mid/30 rounded-xl px-4 py-3 flex items-center gap-2">
              <span className="text-lg">✓</span>
              <span className="text-sm font-medium text-green-deep">カウンターを保存しました</span>
            </div>
          )}
          <div className="mb-4">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                setSelectedDate(selectedDateInput)
              }}
              className="flex items-end gap-2"
            >
              <div className="flex-1 max-w-xs">
                <label className="block text-xs text-warm-gray mb-1">日付</label>
                <input
                  type="date"
                  value={selectedDateInput}
                  onChange={(e) => setSelectedDateInput(e.target.value)}
                  className={inputClass}
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2.5 bg-green-deep text-white rounded-lg text-sm font-medium hover:bg-green-mid transition-colors"
              >
                表示
              </button>
            </form>
          </div>
          {counterDates.length > 0 && (
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <span className="text-xs text-warm-gray">記録済み:</span>
              {counterDates.slice(0, 8).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => { setSelectedDate(d); setSelectedDateInput(d) }}
                  className={`flex-none px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                    d === selectedDate
                      ? 'bg-green-deep text-white border-green-deep'
                      : 'bg-white border-warm-border text-warm-gray hover:border-green-mid hover:text-green-deep'
                  }`}
                >
                  {new Date(d + 'T00:00:00').toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
                </button>
              ))}
            </div>
          )}
          <p className="text-sm font-semibold text-green-deep mb-4">
            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('ja-JP', {
              year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
            })}
          </p>
          {inputPlayers.length === 0 ? (
            <div className="bg-white rounded-xl border border-warm-border p-10 text-center">
              <p className="text-warm-gray text-sm">対局を登録するとプレイヤーが表示されます。</p>
              <Link href={`/leagues/${id}/games/new`} className="inline-block mt-3 text-sm text-green-deep underline">
                対局を追加する →
              </Link>
            </div>
          ) : (
            <CounterInputForm
              players={inputPlayers}
              counterTypes={counterTypes}
              initialValues={inputCounterMap}
              action={inputAction}
            />
          )}
        </div>
      )}

      {/* ── 設定 ──────────────────────────────────────────── */}
      {activeTab === 'settings' && (
        <div>
          {savedType === 'settings' && (
            <div className="mb-5 bg-green-light border border-green-mid/30 rounded-xl px-4 py-3 flex items-center gap-2">
              <span className="text-lg">✓</span>
              <span className="text-sm font-medium text-green-deep">設定を保存しました</span>
            </div>
          )}
          <form action={settingsAction} className="bg-white rounded-xl border border-warm-border p-6 space-y-6 max-w-lg shadow-sm">
            <div>
              <h2 className="text-base font-semibold text-green-deep mb-4">基本情報</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    リーグ名 <span className="text-vermilion">*</span>
                  </label>
                  <input name="name" required defaultValue={league.name ?? ''} className={inputClass} placeholder="例: 2026年春リーグ" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-warm-gray mb-1">開始日</label>
                    <input name="start_date" type="date" defaultValue={league.start_date ?? ''} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs text-warm-gray mb-1">終了日</label>
                    <input name="end_date" type="date" defaultValue={league.end_date ?? ''} className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-warm-gray mb-1">備考</label>
                  <textarea name="notes" rows={2} defaultValue={league.notes ?? ''} className={inputClass} placeholder="メモなど" />
                </div>
              </div>
            </div>
            <hr className="border-warm-border" />
            <div>
              <h2 className="text-base font-semibold text-green-deep mb-1">ポイントルール</h2>
              <p className="text-xs text-warm-gray">設定すると成績集計にポイントが表示されます。空欄にするとポイント非表示になります。</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">ウマ</label>
              <div className="grid grid-cols-2 gap-3 mb-2">
                <div>
                  <label className="block text-xs text-warm-gray mb-1">1位ウマ</label>
                  <input name="uma_1" type="number" defaultValue={league.uma_1 ?? ''} placeholder="20" className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs text-warm-gray mb-1">2位ウマ</label>
                  <input name="uma_2" type="number" defaultValue={league.uma_2 ?? ''} placeholder="10" className={inputClass} />
                </div>
              </div>
              <p className="text-xs text-warm-gray">3位・4位は自動でマイナス（例: 1位=20・2位=10 → 3位 −10、4位 −20）</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">点数設定</label>
              <div className="grid grid-cols-2 gap-3 mb-2">
                <div>
                  <label className="block text-xs text-warm-gray mb-1">持ち点</label>
                  <input name="starting_points" type="number" defaultValue={league.starting_points ?? ''} placeholder="25000" className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs text-warm-gray mb-1">返し点</label>
                  <input name="return_points" type="number" defaultValue={league.return_points ?? ''} placeholder="30000" className={inputClass} />
                </div>
              </div>
              <p className="text-xs text-warm-gray">ポイント計算式: (素点 − 返し点) ÷ 1000 + ウマ + オカ(1位)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">同着のウマ処理</label>
              <select name="tie_rule" defaultValue={league.tie_rule ?? 'order'} className={inputClass}>
                <option value="order">入力順（上の欄を優先）</option>
                <option value="split">按分（ウマ・オカを均等に分ける）</option>
              </select>
              <p className="text-xs text-warm-gray mt-1.5">同点プレイヤーが複数いた場合の順位点の扱いを設定します</p>
            </div>
            {hasRule && (
              <div className="bg-green-light rounded-lg px-4 py-3 text-sm">
                <p className="font-medium text-green-deep mb-1">現在の設定</p>
                <p className="text-xs text-gray-600">ウマ: 1位 +{league.uma_1} / 2位 +{league.uma_2} / 3位 {league.uma_3} / 4位 {league.uma_4}</p>
                <p className="text-xs text-gray-600">{league.starting_points?.toLocaleString()}点持ち {league.return_points?.toLocaleString()}点返し</p>
                <p className="text-xs text-gray-600">同着処理: {league.tie_rule === 'split' ? '按分' : '入力順'}</p>
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <button type="submit" className="bg-green-deep text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-green-mid transition-colors shadow-sm">
                保存する
              </button>
            </div>
          </form>

          <div className="mt-6 bg-white rounded-xl border border-warm-border p-6 max-w-lg shadow-sm">
            <h2 className="text-base font-semibold text-green-deep mb-1">プレイヤー</h2>
            <p className="text-xs text-warm-gray mb-4">対局に登録されると自動追加されます。対局前でも手動で追加できます。</p>
            {inputPlayers.length > 0 ? (
              <ul className="space-y-2 mb-5">
                {inputPlayers.map((p) => {
                  const removeAction = removeLeaguePlayer.bind(null, id, p.player_id)
                  return (
                    <li key={p.player_id} className="flex items-center justify-between gap-2 py-1.5 border-b border-cream last:border-0">
                      <span className="text-sm text-gray-800">{p.players?.name}</span>
                      <div className="flex items-center gap-2 flex-none">
                        {p.fromGame ? (
                          <span className="text-xs text-warm-gray bg-cream border border-warm-border px-2 py-0.5 rounded-full">対局あり</span>
                        ) : (
                          <>
                            <span className="text-xs text-green-deep bg-green-light border border-green-mid/30 px-2 py-0.5 rounded-full">手動追加</span>
                            <form action={removeAction}>
                              <button type="submit" className="text-xs text-red-500 hover:text-red-700 transition-colors">削除</button>
                            </form>
                          </>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="text-xs text-warm-gray mb-4">まだプレイヤーがいません。</p>
            )}
            {addablePlayers.length > 0 && (
              <form action={addLeaguePlayerAction} className="flex gap-2">
                <select name="player_id" required className="flex-1 border border-warm-border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-green-mid">
                  <option value="">プレイヤーを選択</option>
                  {addablePlayers.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <button type="submit" className="flex-none bg-green-deep text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-mid transition-colors">追加</button>
              </form>
            )}
          </div>

          <div className="mt-6 bg-white rounded-xl border border-warm-border p-6 max-w-lg shadow-sm">
            <h2 className="text-base font-semibold text-green-deep mb-1">メンバー招待</h2>
            <p className="text-xs text-warm-gray mb-4">招待リンクを共有すると、相手がログイン後にこのリーグのメンバーに自動追加されます。</p>
            {invite?.token ? (
              <div className="space-y-3">
                <CopyTokenLink path={`/invite/${invite.token}`} />
                <form action={generateInviteAction}>
                  <button type="submit" className="text-xs text-warm-gray hover:text-vermilion transition-colors underline">リンクを再生成する</button>
                </form>
              </div>
            ) : (
              <form action={generateInviteAction}>
                <button type="submit" className="bg-green-deep text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-green-mid transition-colors shadow-sm">
                  招待リンクを生成する
                </button>
              </form>
            )}
          </div>

          <div className="mt-6 max-w-lg">
            <div className="border border-red-200 rounded-xl p-5 bg-red-50">
              <h3 className="text-sm font-semibold text-red-700 mb-1">リーグを削除する</h3>
              <p className="text-xs text-red-600 mb-4">削除すると元に戻せません。このリーグの対局・成績・カウンターデータがすべて削除されます。</p>
              <form action={deleteLeagueAction}>
                <button type="submit" className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors">
                  このリーグを削除する
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
