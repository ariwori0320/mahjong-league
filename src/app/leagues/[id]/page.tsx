import { supabase } from '@/lib/supabase'
import { getUser } from '@/lib/supabase-server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { calcPlayerStats, LeagueRule } from '@/lib/stats'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import CounterInputForm from '@/components/CounterInputForm'
import CopyTokenLink from '@/components/CopyTokenLink'

// ── サーバーアクション ──────────────────────────────────────────

/**
 * カウンターを league_day_counters に日単位で保存する
 */
async function saveCounters(leagueId: string, date: string, formData: FormData) {
  'use server'

  // その日の既存カウンターを削除
  await supabase
    .from('league_day_counters')
    .delete()
    .eq('league_id', leagueId)
    .eq('date', date)

  // FormData のキーは `${player_id}_${counter_type_id}` 形式（UUID_UUID）
  // UUID はハイフンのみ含む（アンダースコアなし）→ split('_') で正確に2分割される
  const inserts: {
    league_id: string
    player_id: string
    counter_type_id: string
    date: string
    count: number
  }[] = []

  for (const [key, value] of formData.entries()) {
    const count = parseInt(value as string) || 0
    if (count <= 0) continue
    const parts = key.split('_')
    if (parts.length !== 2) continue
    const [player_id, counter_type_id] = parts
    inserts.push({ league_id: leagueId, player_id, counter_type_id, date, count })
  }

  if (inserts.length > 0) {
    await supabase.from('league_day_counters').insert(inserts)
  }

  revalidatePath(`/leagues/${leagueId}`)
  redirect(`/leagues/${leagueId}?tab=input&saved=1&date=${date}`)
}

/**
 * 招待リンクのトークンを生成（既存のものは上書き）
 */
async function generateInvite(leagueId: string) {
  'use server'
  // 既存トークンを削除して再生成
  await supabase.from('league_invites').delete().eq('league_id', leagueId)
  await supabase.from('league_invites').insert({ league_id: leagueId })
  revalidatePath(`/leagues/${leagueId}`)
  redirect(`/leagues/${leagueId}?tab=settings`)
}

/**
 * リーグの設定（基本情報 + ポイントルール）を更新する
 */
async function updateLeagueSettings(leagueId: string, formData: FormData) {
  'use server'
  const name = (formData.get('name') as string ?? '').trim()
  if (!name) throw new Error('リーグ名は必須です')

  const toStr = (key: string) => (formData.get(key) as string || null)
  const toInt = (key: string) => {
    const v = (formData.get(key) as string ?? '').trim()
    return v !== '' ? parseInt(v, 10) : null
  }

  const uma_1 = toInt('uma_1')
  const uma_2 = toInt('uma_2')
  const uma_3 = uma_2 !== null ? -uma_2 : null
  const uma_4 = uma_1 !== null ? -uma_1 : null
  const starting_points = toInt('starting_points')
  const return_points = toInt('return_points')

  await supabase
    .from('leagues')
    .update({
      name,
      start_date: toStr('start_date'),
      end_date: toStr('end_date'),
      notes: toStr('notes'),
      uma_1, uma_2, uma_3, uma_4, starting_points, return_points,
    })
    .eq('id', leagueId)

  revalidatePath(`/leagues/${leagueId}`)
  revalidatePath('/leagues')
  redirect(`/leagues/${leagueId}?tab=settings&saved=1`)
}

/**
 * リーグを削除する
 */
async function deleteLeague(leagueId: string) {
  'use server'
  await supabase.from('leagues').delete().eq('id', leagueId)
  revalidatePath('/leagues')
  redirect('/leagues')
}

// ── 定数 ──────────────────────────────────────────────────────

const rankLabel = ['🥇', '🥈', '🥉', '④']

const inputClass =
  'w-full border border-warm-border rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-green-mid focus:ring-1 focus:ring-green-mid transition-colors'

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

  // ── データ取得 ────────────────────────────────────────────

  const { data: league } = await supabase
    .from('leagues')
    .select('*')
    .eq('id', id)
    .single()

  if (!league) notFound()

  // 対局一覧（game_counters は league_day_counters に移行済み）
  const { data: games } = await supabase
    .from('games')
    .select(`
      *,
      game_results(player_id, score, rank, players(id, name))
    `)
    .eq('league_id', id)
    .order('played_at', { ascending: false })

  const { data: counterTypes } = await supabase
    .from('counter_types')
    .select('*')
    .order('created_at')

  // カウンター（日単位）
  const { data: allDayCounters } = await supabase
    .from('league_day_counters')
    .select('player_id, counter_type_id, count, date')
    .eq('league_id', id)

  // ── ポイントルール ──────────────────────────────────────────
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
      }
    : null

  // ── 成績集計：日付フィルター ────────────────────────────────
  const getDate = (g: any) => (g.played_at as string).slice(0, 10)

  const statsGames =
    statsFrom || statsTo
      ? (games ?? []).filter((g) => {
          const d = getDate(g)
          return (!statsFrom || d >= statsFrom) && (!statsTo || d <= statsTo)
        })
      : (games ?? [])

  const statsCounters =
    statsFrom || statsTo
      ? (allDayCounters ?? []).filter((c) => {
          const d = c.date as string
          return (!statsFrom || d >= statsFrom) && (!statsTo || d <= statsTo)
        })
      : (allDayCounters ?? [])

  const playerStats = calcPlayerStats(
    statsGames,
    counterTypes ?? [],
    leagueRule,
    statsCounters
  )

  const tabBase = `/leagues/${id}`

  // ── 対局一覧：日付グループ ──────────────────────────────────
  const gamesByDate: { date: string; dayGames: any[] }[] = []
  const dateMap: Record<string, any[]> = {}
  for (const g of games ?? []) {
    const d = getDate(g)
    if (!dateMap[d]) {
      dateMap[d] = []
      gamesByDate.push({ date: d, dayGames: dateMap[d] })
    }
    dateMap[d].push(g)
  }
  for (const group of gamesByDate) {
    group.dayGames.sort((a, b) =>
      (a.played_at as string).localeCompare(b.played_at as string)
    )
  }

  // ── カウンター入力タブ ──────────────────────────────────────

  // 記録済み日付一覧（降順）
  const counterDates = [
    ...new Set((allDayCounters ?? []).map((c) => c.date as string)),
  ].sort().reverse()

  // デフォルト: 今日の日付
  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10)

  const activeDate = selectedDate ?? counterDates[0] ?? today

  // その日のカウンター（初期値）
  const activeDayCounters = (allDayCounters ?? []).filter(
    (c) => c.date === activeDate
  )
  const inputCounterMap: Record<string, number> = {}
  for (const c of activeDayCounters) {
    inputCounterMap[`${c.player_id}_${c.counter_type_id}`] = c.count
  }

  // プレイヤーリスト：このリーグの全対局参加者（名前順）
  const leaguePlayerMap: Record<
    string,
    { player_id: string; rank: number; players: { name: string } | null }
  > = {}
  for (const game of games ?? []) {
    for (const result of (game.game_results as any[]) ?? []) {
      if (!leaguePlayerMap[result.player_id] && result.players) {
        leaguePlayerMap[result.player_id] = {
          player_id: result.player_id,
          rank: 0,
          players: result.players,
        }
      }
    }
  }
  let inputPlayers = Object.values(leaguePlayerMap).sort((a, b) =>
    (a.players?.name ?? '').localeCompare(b.players?.name ?? '', 'ja')
  )

  // 対局がまだ登録されていない場合は全プレイヤーを表示
  if (inputPlayers.length === 0) {
    const { data: allPlayers } = await supabase
      .from('players')
      .select('id, name')
      .order('name')
    inputPlayers = (allPlayers ?? []).map((p) => ({
      player_id: p.id,
      rank: 0,
      players: { name: p.name },
    }))
  }

  // 招待リンク
  const { data: invite } = await supabase
    .from('league_invites')
    .select('token')
    .eq('league_id', id)
    .maybeSingle()

  const inputAction = saveCounters.bind(null, id, activeDate)
  const settingsAction = updateLeagueSettings.bind(null, id)
  const generateInviteAction = generateInvite.bind(null, id)
  const deleteLeagueAction = deleteLeague.bind(null, id)

  return (
    <div>
      {/* ── ヘッダー ──────────────────────────────────────────── */}
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
            {games?.length ?? 0}戦
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

      {/* ── タブ ─────────────────────────────────────────────── */}
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

      {/* ── 対局一覧タブ ─────────────────────────────────────── */}
      {tab === 'games' && (
        <div>
          <div className="flex justify-end mb-4">
            <Link
              href={`/leagues/${id}/games/new`}
              className="bg-green-deep text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-mid transition-colors shadow-sm"
            >
              ＋ 対局を追加
            </Link>
          </div>

          {!games?.length ? (
            <div className="bg-white rounded-xl border border-warm-border p-10 text-center">
              <p className="text-warm-gray text-sm">対局がまだありません。</p>
            </div>
          ) : (
            <div className="space-y-6">
              {gamesByDate.map(({ date, dayGames }) => (
                <div key={date}>
                  {/* 日付ヘッダー */}
                  <div className="flex items-center gap-3 mb-2 px-1">
                    <h3 className="font-semibold text-green-deep text-sm">
                      {new Date(date + 'T00:00:00').toLocaleDateString('ja-JP', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        weekday: 'short',
                      })}
                    </h3>
                    <span className="text-xs text-warm-gray bg-white border border-warm-border px-2 py-0.5 rounded-full">
                      {dayGames.length}局
                    </span>
                  </div>

                  {/* その日の対局リスト */}
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
                          <span className="text-xs text-green-mid group-hover:text-vermilion transition-colors flex-none">
                            ›
                          </span>
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

      {/* ── 成績集計タブ ─────────────────────────────────────── */}
      {tab === 'stats' && (
        <div>
          {/* 日付フィルター */}
          <div className="bg-white rounded-xl border border-warm-border p-4 mb-5 shadow-sm">
            <form method="GET" action={tabBase}>
              <input type="hidden" name="tab" value="stats" />
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-xs text-warm-gray mb-1">開始日</label>
                  <input
                    type="date"
                    name="from"
                    defaultValue={statsFrom ?? ''}
                    className="border border-warm-border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-green-mid"
                  />
                </div>
                <span className="text-warm-gray pb-2 text-sm">〜</span>
                <div>
                  <label className="block text-xs text-warm-gray mb-1">終了日</label>
                  <input
                    type="date"
                    name="to"
                    defaultValue={statsTo ?? ''}
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
                    <Link
                      href={`${tabBase}?tab=stats`}
                      className="px-4 py-2 border border-warm-border rounded-lg text-sm text-warm-gray hover:bg-cream transition-colors"
                    >
                      全期間
                    </Link>
                  )}
                </div>
              </div>
              {(statsFrom || statsTo) && (
                <p className="text-xs text-green-deep mt-2 font-medium">
                  絞り込み中: {statsFrom ?? '〜'} 〜 {statsTo ?? '現在'}（{statsGames.length}局）
                </p>
              )}
            </form>
          </div>

          {!playerStats.length ? (
            <div className="bg-white rounded-xl border border-warm-border p-10 text-center">
              <p className="text-warm-gray text-sm">
                {statsFrom || statsTo
                  ? '指定期間に対局データがありません。'
                  : 'まだ対局データがありません。'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-warm-border overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-green-deep text-white">
                      <th className="text-left px-4 py-3 font-medium whitespace-nowrap sticky left-0 bg-green-deep">
                        プレイヤー
                      </th>
                      <th className="text-center px-3 py-3 font-medium whitespace-nowrap">対局数</th>
                      <th className="text-center px-3 py-3 font-medium whitespace-nowrap">平均順位</th>
                      <th className="text-center px-3 py-3 font-medium whitespace-nowrap">1位率</th>
                      <th className="text-center px-3 py-3 font-medium whitespace-nowrap">4位率</th>
                      <th className="text-center px-3 py-3 font-medium whitespace-nowrap">平均点</th>
                      {leagueRule && (
                        <th className="text-center px-3 py-3 font-medium whitespace-nowrap border-l border-green-mid/50">
                          ポイント
                        </th>
                      )}
                      {counterTypes?.map((ct) => (
                        <th
                          key={ct.id}
                          className="text-center px-3 py-3 font-medium whitespace-nowrap text-xs border-l border-green-mid/30"
                        >
                          {ct.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {playerStats.map((stat, i) => (
                      <tr
                        key={stat.id}
                        className={`border-t border-cream hover:bg-cream/50 transition-colors ${
                          i === 0 ? 'font-medium' : ''
                        }`}
                      >
                        <td className="px-4 py-3 whitespace-nowrap sticky left-0 bg-white">
                          <Link
                            href={`/players/${stat.id}`}
                            className="text-green-deep hover:text-vermilion hover:underline transition-colors"
                          >
                            {stat.name}
                          </Link>
                        </td>
                        <td className="text-center px-3 py-3 text-warm-gray">{stat.games}</td>
                        <td className="text-center px-3 py-3">
                          <span
                            className={`font-semibold ${
                              stat.avgRank <= 2 ? 'text-green-deep' : 'text-gray-700'
                            }`}
                          >
                            {stat.avgRank.toFixed(2)}
                          </span>
                        </td>
                        <td className="text-center px-3 py-3">
                          <span
                            className={`font-semibold ${
                              stat.topRate >= 30 ? 'text-vermilion' : 'text-gray-700'
                            }`}
                          >
                            {stat.topRate}%
                          </span>
                        </td>
                        <td className="text-center px-3 py-3">
                          <span
                            className={stat.lastRate >= 30 ? 'text-vermilion' : 'text-gray-500'}
                          >
                            {stat.lastRate}%
                          </span>
                        </td>
                        <td className="text-center px-3 py-3 text-gray-700">
                          {stat.avgScore.toLocaleString()}
                        </td>
                        {leagueRule && (
                          <td className="text-center px-3 py-3 border-l border-cream">
                            {stat.totalPoints !== null ? (
                              <span
                                className={`font-bold text-base ${
                                  stat.totalPoints >= 0 ? 'text-green-deep' : 'text-vermilion'
                                }`}
                              >
                                {stat.totalPoints >= 0 ? '+' : ''}
                                {stat.totalPoints.toFixed(1)}
                              </span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                        )}
                        {counterTypes?.map((ct) => (
                          <td key={ct.id} className="text-center px-3 py-3 border-l border-cream">
                            <span
                              className={
                                (stat.counters[ct.id] ?? 0) > 0
                                  ? 'text-gray-800 font-medium'
                                  : 'text-gray-300'
                              }
                            >
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

      {/* ── カウンター入力タブ ───────────────────────────────── */}
      {tab === 'input' && (
        <div>
          {saved && (
            <div className="mb-5 bg-green-light border border-green-mid/30 rounded-xl px-4 py-3 flex items-center gap-2">
              <span className="text-lg">✓</span>
              <span className="text-sm font-medium text-green-deep">カウンターを保存しました</span>
            </div>
          )}

          {/* 日付入力フォーム */}
          <div className="mb-4">
            <form method="GET" action={tabBase} className="flex items-end gap-2">
              <input type="hidden" name="tab" value="input" />
              <div className="flex-1 max-w-xs">
                <label className="block text-xs text-warm-gray mb-1">日付</label>
                <input
                  type="date"
                  name="date"
                  defaultValue={activeDate}
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

          {/* 記録済み日付のクイック選択 */}
          {counterDates.length > 0 && (
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <span className="text-xs text-warm-gray">記録済み:</span>
              {counterDates.slice(0, 8).map((d) => (
                <Link
                  key={d}
                  href={`${tabBase}?tab=input&date=${d}`}
                  className={`flex-none px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                    d === activeDate
                      ? 'bg-green-deep text-white border-green-deep'
                      : 'bg-white border-warm-border text-warm-gray hover:border-green-mid hover:text-green-deep'
                  }`}
                >
                  {new Date(d + 'T00:00:00').toLocaleDateString('ja-JP', {
                    month: 'numeric',
                    day: 'numeric',
                  })}
                </Link>
              ))}
            </div>
          )}

          {/* 現在の日付表示 */}
          <p className="text-sm font-semibold text-green-deep mb-4">
            {new Date(activeDate + 'T00:00:00').toLocaleDateString('ja-JP', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'short',
            })}
          </p>

          {inputPlayers.length === 0 ? (
            <div className="bg-white rounded-xl border border-warm-border p-10 text-center">
              <p className="text-warm-gray text-sm">
                プレイヤーが登録されていません。先に
                <Link href="/players" className="text-green-deep underline mx-1">
                  プレイヤー
                </Link>
                を追加してください。
              </p>
            </div>
          ) : (
            <CounterInputForm
              players={inputPlayers}
              counterTypes={counterTypes ?? []}
              initialValues={inputCounterMap}
              action={inputAction}
            />
          )}
        </div>
      )}

      {/* ── 設定タブ ─────────────────────────────────────────── */}
      {tab === 'settings' && (
        <div>
          {saved && (
            <div className="mb-5 bg-green-light border border-green-mid/30 rounded-xl px-4 py-3 flex items-center gap-2">
              <span className="text-lg">✓</span>
              <span className="text-sm font-medium text-green-deep">設定を保存しました</span>
            </div>
          )}

          <form
            action={settingsAction}
            className="bg-white rounded-xl border border-warm-border p-6 space-y-6 max-w-lg shadow-sm"
          >
            {/* 基本情報 */}
            <div>
              <h2 className="text-base font-semibold text-green-deep mb-4">基本情報</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    リーグ名 <span className="text-vermilion">*</span>
                  </label>
                  <input
                    name="name"
                    required
                    defaultValue={league.name ?? ''}
                    className={inputClass}
                    placeholder="例: 2026年春リーグ"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-warm-gray mb-1">開始日</label>
                    <input
                      name="start_date"
                      type="date"
                      defaultValue={league.start_date ?? ''}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-warm-gray mb-1">終了日</label>
                    <input
                      name="end_date"
                      type="date"
                      defaultValue={league.end_date ?? ''}
                      className={inputClass}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-warm-gray mb-1">備考</label>
                  <textarea
                    name="notes"
                    rows={2}
                    defaultValue={league.notes ?? ''}
                    className={inputClass}
                    placeholder="メモなど"
                  />
                </div>
              </div>
            </div>

            <hr className="border-warm-border" />

            <div>
              <h2 className="text-base font-semibold text-green-deep mb-1">ポイントルール</h2>
              <p className="text-xs text-warm-gray">
                設定すると成績集計にポイントが表示されます。空欄にするとポイント非表示になります。
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">ウマ</label>
              <div className="grid grid-cols-2 gap-3 mb-2">
                <div>
                  <label className="block text-xs text-warm-gray mb-1">1位ウマ</label>
                  <input
                    name="uma_1"
                    type="number"
                    defaultValue={league.uma_1 ?? ''}
                    placeholder="20"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs text-warm-gray mb-1">2位ウマ</label>
                  <input
                    name="uma_2"
                    type="number"
                    defaultValue={league.uma_2 ?? ''}
                    placeholder="10"
                    className={inputClass}
                  />
                </div>
              </div>
              <p className="text-xs text-warm-gray">
                3位・4位は自動でマイナス（例: 1位=20・2位=10 → 3位 −10、4位 −20）
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">点数設定</label>
              <div className="grid grid-cols-2 gap-3 mb-2">
                <div>
                  <label className="block text-xs text-warm-gray mb-1">持ち点</label>
                  <input
                    name="starting_points"
                    type="number"
                    defaultValue={league.starting_points ?? ''}
                    placeholder="25000"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs text-warm-gray mb-1">返し点</label>
                  <input
                    name="return_points"
                    type="number"
                    defaultValue={league.return_points ?? ''}
                    placeholder="30000"
                    className={inputClass}
                  />
                </div>
              </div>
              <p className="text-xs text-warm-gray">
                ポイント計算式: (素点 − 返し点) ÷ 1000 + ウマ
              </p>
            </div>

            {hasRule && (
              <div className="bg-green-light rounded-lg px-4 py-3 text-sm">
                <p className="font-medium text-green-deep mb-1">現在の設定</p>
                <p className="text-xs text-gray-600">
                  ウマ: 1位 +{league.uma_1} / 2位 +{league.uma_2} / 3位 {league.uma_3} / 4位{' '}
                  {league.uma_4}
                </p>
                <p className="text-xs text-gray-600">
                  {league.starting_points?.toLocaleString()}点持ち{' '}
                  {league.return_points?.toLocaleString()}点返し
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                className="bg-green-deep text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-green-mid transition-colors shadow-sm"
              >
                保存する
              </button>
            </div>
          </form>

          {/* 招待リンク */}
          <div className="mt-6 bg-white rounded-xl border border-warm-border p-6 max-w-lg shadow-sm">
            <h2 className="text-base font-semibold text-green-deep mb-1">メンバー招待</h2>
            <p className="text-xs text-warm-gray mb-4">
              招待リンクを共有すると、相手がログイン後にこのリーグのメンバーに自動追加されます。
            </p>

            {invite?.token ? (
              <div className="space-y-3">
                <CopyTokenLink path={`/invite/${invite.token}`} />
                <form action={generateInviteAction}>
                  <button
                    type="submit"
                    className="text-xs text-warm-gray hover:text-vermilion transition-colors underline"
                  >
                    リンクを再生成する
                  </button>
                </form>
              </div>
            ) : (
              <form action={generateInviteAction}>
                <button
                  type="submit"
                  className="bg-green-deep text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-green-mid transition-colors shadow-sm"
                >
                  招待リンクを生成する
                </button>
              </form>
            )}
          </div>
          {/* 削除セクション */}
          <div className="mt-6 max-w-lg">
            <div className="border border-red-200 rounded-xl p-5 bg-red-50">
              <h3 className="text-sm font-semibold text-red-700 mb-1">リーグを削除する</h3>
              <p className="text-xs text-red-600 mb-4">
                削除すると元に戻せません。このリーグの対局・成績・カウンターデータがすべて削除されます。
              </p>
              <form action={deleteLeagueAction}>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                >
                  このリーグを削除する
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
