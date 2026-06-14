import type { createAuthClient } from './supabase-server'

type Client = Awaited<ReturnType<typeof createAuthClient>>

export type RosterPlayer = { id: string; name: string }

/**
 * リーグに登録されているメンバーを取得する。
 * 設定タブの「プレイヤー」一覧と同じ顔ぶれ＝
 *   手動で追加したメンバー（league_players）＋ そのリーグの過去対局に出たプレイヤー。
 * 対局の追加・編集ではここで返したメンバーだけを選べるようにする。
 */
export async function getLeaguePlayers(
  supabase: Client,
  leagueId: string
): Promise<RosterPlayer[]> {
  const [{ data: leaguePlayers }, { data: gameRows }] = await Promise.all([
    supabase
      .from('league_players')
      .select('player_id, players(id, name)')
      .eq('league_id', leagueId),
    supabase
      .from('games')
      .select('game_results(player_id, players(id, name))')
      .eq('league_id', leagueId),
  ])

  const map = new Map<string, RosterPlayer>()
  for (const row of gameRows ?? []) {
    for (const r of ((row.game_results as any[]) ?? [])) {
      const p = r.players
      if (p) map.set(r.player_id, { id: p.id, name: p.name })
    }
  }
  for (const row of leaguePlayers ?? []) {
    const p = row.players as any
    if (p && !map.has(row.player_id)) map.set(row.player_id, { id: p.id, name: p.name })
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'ja'))
}
