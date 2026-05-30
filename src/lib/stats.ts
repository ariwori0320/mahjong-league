export type CounterType = {
  id: string
  name: string
}

export type LeagueRule = {
  uma: [number, number, number, number]
  startingPoints: number
  returnPoints: number
  tieRule: 'split' | 'order'
}

export type PlayerStat = {
  id: string
  name: string
  games: number
  totalScore: number
  avgScore: number
  avgRank: number
  topCount: number
  secondCount: number
  thirdCount: number
  lastCount: number
  topRate: number
  secondRate: number
  thirdRate: number
  lastRate: number
  totalPoints: number | null
  avgPoints: number | null
  counters: Record<string, number> // counterTypeId → 合計回数
}

/**
 * ゲーム一覧とカウンター一覧からプレイヤー別集計を計算する
 *
 * @param games         game_results(player_id, score, rank, players(id,name)) を含む対局一覧
 * @param counterTypes  カウンタータイプ一覧
 * @param rule          ポイントルール（なければ null）
 * @param dayCounters   league_day_counters レコード一覧（player_id, counter_type_id, count）
 */
export function calcPlayerStats(
  games: any[],
  counterTypes: CounterType[],
  rule?: LeagueRule | null,
  dayCounters?: any[]
): PlayerStat[] {
  const map: Record<string, PlayerStat> = {}

  // ── スコア・順位集計 ──────────────────────────────────────
  for (const game of games) {
    for (const result of game.game_results ?? []) {
      const player = result.players
      if (!player) continue

      if (!map[player.id]) {
        map[player.id] = {
          id: player.id,
          name: player.name,
          games: 0,
          totalScore: 0,
          avgScore: 0,
          avgRank: 0,
          topCount: 0,
          secondCount: 0,
          thirdCount: 0,
          lastCount: 0,
          topRate: 0,
          secondRate: 0,
          thirdRate: 0,
          lastRate: 0,
          totalPoints: rule ? 0 : null,
          avgPoints: rule ? 0 : null,
          counters: Object.fromEntries(counterTypes.map((ct) => [ct.id, 0])),
        }
      }

      const s = map[player.id]
      const prevRankTotal = s.avgRank * s.games
      s.games++
      s.totalScore += result.score
      s.avgRank = (prevRankTotal + result.rank) / s.games
      if (result.rank === 1) s.topCount++
      if (result.rank === 2) s.secondCount++
      if (result.rank === 3) s.thirdCount++
      if (result.rank === 4) s.lastCount++

      // ポイント計算: (素点 - 返し点) / 1000 + ウマ + オカ(1位のみ)
      // オカ = (返し点 - 持ち点) × 4 / 1000 を1位に加算してゼロサムを保つ
      // 按分モード: 同点プレイヤーのウマ・オカを均等に分配する
      if (rule && s.totalPoints !== null) {
        const okaFull = (rule.returnPoints - rule.startingPoints) * 4 / 1000
        let umaValue: number
        let okaValue: number

        if (rule.tieRule === 'split') {
          // 同点グループを特定してウマ・オカを按分
          const tiedGroup = (game.game_results as any[]).filter(
            (r) => r.score === result.score
          )
          const tiedCount = tiedGroup.length
          const tiedRanks = tiedGroup.map((r: any) => r.rank as number)
          const umaSum = tiedRanks.reduce(
            (sum: number, r: number) => sum + rule.uma[r - 1],
            0
          )
          umaValue = umaSum / tiedCount
          // タイグループに1位が含まれていればオカも按分
          okaValue = tiedRanks.includes(1) ? okaFull / tiedCount : 0
        } else {
          // 入力順（従来の動作）
          umaValue = rule.uma[result.rank - 1]
          okaValue = result.rank === 1 ? okaFull : 0
        }

        const chip = (result.score - rule.returnPoints) / 1000 + umaValue + okaValue
        s.totalPoints += chip
      }
    }
  }

  // ── カウンター集計（league_day_counters ベース） ──────────
  for (const c of dayCounters ?? []) {
    if (map[c.player_id]) {
      map[c.player_id].counters[c.counter_type_id] =
        (map[c.player_id].counters[c.counter_type_id] ?? 0) + c.count
    }
  }

  return Object.values(map)
    .map((s) => ({
      ...s,
      avgScore: s.games > 0 ? Math.round(s.totalScore / s.games) : 0,
      avgRank: Math.round(s.avgRank * 100) / 100,
      topRate: s.games > 0 ? Math.round((s.topCount / s.games) * 100) : 0,
      secondRate: s.games > 0 ? Math.round((s.secondCount / s.games) * 100) : 0,
      thirdRate: s.games > 0 ? Math.round((s.thirdCount / s.games) * 100) : 0,
      lastRate: s.games > 0 ? Math.round((s.lastCount / s.games) * 100) : 0,
      totalPoints: s.totalPoints !== null ? Math.round(s.totalPoints * 10) / 10 : null,
      avgPoints:
        s.totalPoints !== null && s.games > 0
          ? Math.round((s.totalPoints / s.games) * 10) / 10
          : null,
    }))
    .sort((a, b) => {
      if (rule && a.totalPoints !== null && b.totalPoints !== null) {
        return b.totalPoints - a.totalPoints
      }
      return a.avgRank - b.avgRank
    })
}
