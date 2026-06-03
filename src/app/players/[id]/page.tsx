import { createAuthClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createAuthClient()

  const { data: player } = await supabase
    .from('players')
    .select('*')
    .eq('id', id)
    .single()

  if (!player) notFound()

  // このプレイヤーの全対局結果
  const { data: results } = await supabase
    .from('game_results')
    .select(`
      score, rank,
      games(id, played_at, league_id, leagues(id, name))
    `)
    .eq('player_id', id)
    .order('games(played_at)', { ascending: false })

  // このプレイヤーの全カウンター
  const { data: counters } = await supabase
    .from('game_counters')
    .select(`
      count, counter_type_id,
      games(league_id)
    `)
    .eq('player_id', id)

  const { data: counterTypes } = await supabase
    .from('counter_types')
    .select('*')
    .order('created_at')

  const allResults = (results ?? []) as any[]
  const allCounters = (counters ?? []) as any[]
  const ctList = (counterTypes ?? []) as any[]

  // 全体集計
  const totalGames = allResults.length
  const totalScore = allResults.reduce((s, r) => s + r.score, 0)
  const avgScore = totalGames > 0 ? Math.round(totalScore / totalGames) : 0
  const avgRank = totalGames > 0
    ? Math.round(allResults.reduce((s, r) => s + r.rank, 0) / totalGames * 100) / 100
    : 0
  const topCount = allResults.filter((r) => r.rank === 1).length
  const lastCount = allResults.filter((r) => r.rank === 4).length
  const topRate = totalGames > 0 ? Math.round((topCount / totalGames) * 100) : 0
  const lastRate = totalGames > 0 ? Math.round((lastCount / totalGames) * 100) : 0

  // カウンター合計
  const counterTotals: Record<string, number> = {}
  for (const c of allCounters) {
    counterTotals[c.counter_type_id] = (counterTotals[c.counter_type_id] ?? 0) + c.count
  }

  // リーグ別集計
  const leagueMap: Record<string, {
    leagueId: string
    leagueName: string
    games: number
    totalScore: number
    avgRank: number
    topCount: number
    lastCount: number
    counters: Record<string, number>
    rankSum: number
  }> = {}

  for (const r of allResults) {
    const g = r.games as any
    if (!g?.leagues) continue
    const lid = g.leagues.id
    if (!leagueMap[lid]) {
      leagueMap[lid] = {
        leagueId: lid,
        leagueName: g.leagues.name,
        games: 0,
        totalScore: 0,
        avgRank: 0,
        rankSum: 0,
        topCount: 0,
        lastCount: 0,
        counters: Object.fromEntries(ctList.map((ct: any) => [ct.id, 0])),
      }
    }
    const ls = leagueMap[lid]
    ls.games++
    ls.totalScore += r.score
    ls.rankSum += r.rank
    if (r.rank === 1) ls.topCount++
    if (r.rank === 4) ls.lastCount++
  }

  for (const c of allCounters) {
    const leagueId = (c.games as any)?.league_id
    if (leagueId && leagueMap[leagueId]) {
      leagueMap[leagueId].counters[c.counter_type_id] =
        (leagueMap[leagueId].counters[c.counter_type_id] ?? 0) + c.count
    }
  }

  const leagueStats = Object.values(leagueMap).map((ls) => ({
    ...ls,
    avgRank: ls.games > 0 ? Math.round((ls.rankSum / ls.games) * 100) / 100 : 0,
    avgScore: ls.games > 0 ? Math.round(ls.totalScore / ls.games) : 0,
    topRate: ls.games > 0 ? Math.round((ls.topCount / ls.games) * 100) : 0,
    lastRate: ls.games > 0 ? Math.round((ls.lastCount / ls.games) * 100) : 0,
  }))

  return (
    <div>
      {/* ヘッダー */}
      <div className="mb-8">
        <Link href="/players" className="text-sm text-warm-gray hover:text-green-deep transition-colors">
          ← プレイヤー一覧
        </Link>
        <h1 className="text-2xl font-bold text-green-deep mt-2">{player.name}</h1>
        <p className="text-sm text-warm-gray mt-1">通算成績</p>
      </div>

      {totalGames === 0 ? (
        <div className="bg-white rounded-xl border border-warm-border p-10 text-center">
          <p className="text-warm-gray text-sm">まだ対局データがありません。</p>
        </div>
      ) : (
        <>
          {/* サマリーカード */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { label: '対局数', value: `${totalGames}戦` },
              { label: '平均順位', value: avgRank.toFixed(2) },
              { label: '1位率', value: `${topRate}%`, highlight: topRate >= 30 },
              { label: '4位率', value: `${lastRate}%`, danger: lastRate >= 30 },
              { label: '平均点', value: avgScore.toLocaleString() },
              { label: '総得点', value: totalScore.toLocaleString() },
            ].map((item) => (
              <div key={item.label} className="bg-white rounded-xl border border-warm-border p-4 text-center shadow-sm">
                <div className="text-xs text-warm-gray mb-1">{item.label}</div>
                <div className={`text-lg font-bold ${
                  item.highlight ? 'text-vermilion' :
                  item.danger ? 'text-vermilion' :
                  'text-green-deep'
                }`}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          {/* カウンター合計 */}
          {ctList.length > 0 && (
            <div className="mb-8">
              <h2 className="font-semibold text-green-deep mb-3">カウンター合計</h2>
              <div className="bg-white rounded-xl border border-warm-border overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-green-light">
                        {ctList.map((ct: any) => (
                          <th key={ct.id} className="text-center px-3 py-2 text-xs font-medium text-green-deep whitespace-nowrap">
                            {ct.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        {ctList.map((ct: any) => (
                          <td key={ct.id} className="text-center px-3 py-3">
                            <span className={`font-semibold ${(counterTotals[ct.id] ?? 0) > 0 ? 'text-gray-800' : 'text-gray-300'}`}>
                              {counterTotals[ct.id] ?? 0}
                            </span>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* リーグ別成績 */}
          <div>
            <h2 className="font-semibold text-green-deep mb-3">リーグ別成績</h2>
            <div className="bg-white rounded-xl border border-warm-border overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-green-deep text-white">
                      <th className="text-left px-4 py-3 font-medium whitespace-nowrap">リーグ</th>
                      <th className="text-center px-3 py-3 font-medium whitespace-nowrap">対局数</th>
                      <th className="text-center px-3 py-3 font-medium whitespace-nowrap">平均順位</th>
                      <th className="text-center px-3 py-3 font-medium whitespace-nowrap">1位率</th>
                      <th className="text-center px-3 py-3 font-medium whitespace-nowrap">4位率</th>
                      <th className="text-center px-3 py-3 font-medium whitespace-nowrap">平均点</th>
                      {ctList.map((ct: any) => (
                        <th key={ct.id} className="text-center px-3 py-3 font-medium whitespace-nowrap text-xs border-l border-green-mid/30">
                          {ct.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {leagueStats.map((ls, i) => (
                      <tr key={ls.leagueId} className={`border-t border-cream ${i % 2 === 1 ? 'bg-cream/30' : ''} hover:bg-cream/50 transition-colors`}>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Link href={`/leagues/${ls.leagueId}?tab=stats`} className="text-green-deep hover:text-vermilion hover:underline transition-colors font-medium">
                            {ls.leagueName}
                          </Link>
                        </td>
                        <td className="text-center px-3 py-3 text-warm-gray">{ls.games}</td>
                        <td className="text-center px-3 py-3">
                          <span className={`font-semibold ${ls.avgRank <= 2 ? 'text-green-deep' : 'text-gray-700'}`}>
                            {ls.avgRank.toFixed(2)}
                          </span>
                        </td>
                        <td className="text-center px-3 py-3">
                          <span className={`font-semibold ${ls.topRate >= 30 ? 'text-vermilion' : 'text-gray-700'}`}>
                            {ls.topRate}%
                          </span>
                        </td>
                        <td className="text-center px-3 py-3">
                          <span className={ls.lastRate >= 30 ? 'text-vermilion' : 'text-gray-500'}>
                            {ls.lastRate}%
                          </span>
                        </td>
                        <td className="text-center px-3 py-3 text-gray-700">{ls.avgScore.toLocaleString()}</td>
                        {ctList.map((ct: any) => (
                          <td key={ct.id} className="text-center px-3 py-3 border-l border-cream">
                            <span className={`${(ls.counters[ct.id] ?? 0) > 0 ? 'text-gray-800 font-medium' : 'text-gray-300'}`}>
                              {ls.counters[ct.id] ?? 0}
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
