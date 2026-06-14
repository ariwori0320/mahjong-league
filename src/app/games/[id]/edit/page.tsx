import { createAuthClient } from '@/lib/supabase-server'
import { getLeaguePlayers } from '@/lib/league-players'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import NewGameForm from '@/components/NewGameForm'

async function updateGame(gameId: string, leagueId: string, formData: FormData) {
  'use server'
  const supabase = await createAuthClient()
  const played_at = formData.get('played_at') as string
  const location = (formData.get('location') as string) || null
  const notes = (formData.get('notes') as string) || null

  const playerIds = [1, 2, 3, 4].map((i) => formData.get(`player_${i}`) as string)
  if (new Set(playerIds).size !== 4) {
    throw new Error('同じプレイヤーが複数選択されています。4人異なるプレイヤーを選択してください。')
  }

  await supabase
    .from('games')
    .update({ played_at, location, notes })
    .eq('id', gameId)

  await supabase.from('game_results').delete().eq('game_id', gameId)

  const results = playerIds.map((player_id, idx) => ({
    game_id: gameId,
    player_id,
    score: parseInt(formData.get(`score_${idx + 1}`) as string) * 100,
    rank: 0,
  }))
  results.sort((a, b) => b.score - a.score)
  results.forEach((r, i) => { r.rank = i + 1 })

  await supabase.from('game_results').insert(results)

  revalidatePath(`/games/${gameId}`)
  revalidatePath(`/leagues/${leagueId}`)
  redirect(`/games/${gameId}`)
}

async function deleteGame(gameId: string, leagueId: string) {
  'use server'
  const supabase = await createAuthClient()
  await supabase.from('games').delete().eq('id', gameId)
  revalidatePath(`/leagues/${leagueId}`)
  redirect(`/leagues/${leagueId}`)
}

export default async function EditGamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createAuthClient()

  const { data: game } = await supabase
    .from('games')
    .select(`*, leagues(id, name), game_results(player_id, score, rank, players(id, name))`)
    .eq('id', id)
    .single()

  if (!game) notFound()

  const league = game.leagues as any
  const results = (game.game_results as any[])?.sort((a, b) => a.rank - b.rank)

  // このリーグに登録されたメンバーだけを選択肢にする
  const players = await getLeaguePlayers(supabase, league?.id)

  const gameDate = (game.played_at as string).slice(0, 10)
  const initialPlayerIds = results?.map((r: any) => r.player_id) ?? []
  const initialScores = results?.map((r: any) => String(r.score / 100)) ?? []

  const editAction = updateGame.bind(null, id, league?.id)
  const deleteAction = deleteGame.bind(null, id, league?.id)

  return (
    <div>
      <div className="mb-8">
        <Link
          href={`/games/${id}`}
          className="text-sm text-warm-gray hover:text-green-deep transition-colors"
        >
          ← 対局詳細
        </Link>
        <h1 className="text-2xl font-bold text-green-deep mt-2">対局を編集</h1>
      </div>

      <NewGameForm
        players={players}
        action={editAction}
        defaultDate={gameDate}
        leagueId={league?.id}
        initialPlayerIds={initialPlayerIds}
        initialScores={initialScores}
        initialLocation={game.location ?? ''}
        initialNotes={game.notes ?? ''}
      />

      {/* 削除セクション */}
      <div className="mt-8 max-w-lg">
        <div className="border border-red-200 rounded-xl p-5 bg-red-50">
          <h3 className="text-sm font-semibold text-red-700 mb-1">対局を削除する</h3>
          <p className="text-xs text-red-600 mb-4">
            削除すると元に戻せません。この対局の結果データもすべて削除されます。
          </p>
          <form action={deleteAction}>
            <button
              type="submit"
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
            >
              この対局を削除する
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
