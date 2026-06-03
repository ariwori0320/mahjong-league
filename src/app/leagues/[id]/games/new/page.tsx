import { createAuthClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import NewGameForm from '@/components/NewGameForm'

async function createGame(leagueId: string, formData: FormData) {
  'use server'
  const supabase = await createAuthClient()
  const played_at = formData.get('played_at') as string
  const location = (formData.get('location') as string) || null
  const notes = (formData.get('notes') as string) || null

  // 同じプレイヤーが重複していないか確認
  const playerIds = [1, 2, 3, 4].map((i) => formData.get(`player_${i}`) as string)
  if (new Set(playerIds).size !== 4) {
    throw new Error('同じプレイヤーが複数選択されています。4人異なるプレイヤーを選択してください。')
  }

  const { data: game, error } = await supabase
    .from('games')
    .insert({ league_id: leagueId, played_at, location, notes })
    .select()
    .single()

  if (error || !game) {
    throw new Error('対局の保存に失敗しました。もう一度お試しください。')
  }

  // 点数で並べ替えて順位を自動計算（入力値は100の位までなので×100）
  const results = playerIds.map((player_id, idx) => ({
    game_id: game.id,
    player_id,
    score: parseInt(formData.get(`score_${idx + 1}`) as string) * 100,
    rank: 0,
  }))

  results.sort((a, b) => b.score - a.score)
  results.forEach((r, i) => { r.rank = i + 1 })

  await supabase.from('game_results').insert(results)

  revalidatePath(`/leagues/${leagueId}`)
  redirect(`/games/${game.id}`)
}

export default async function NewGamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createAuthClient()
  const { data: league } = await supabase
    .from('leagues')
    .select('*')
    .eq('id', id)
    .single()

  if (!league) notFound()

  const { data: players } = await supabase
    .from('players')
    .select('id, name')
    .order('name')

  const action = createGame.bind(null, id)

  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10)

  return (
    <div>
      <div className="mb-8">
        <Link href={`/leagues/${id}`} className="text-sm text-warm-gray hover:text-green-deep transition-colors">
          ← {league.name}
        </Link>
        <h1 className="text-2xl font-bold text-green-deep mt-2">対局を追加</h1>
      </div>

      {(players?.length ?? 0) < 4 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 text-sm text-yellow-800">
          対局を追加するには先に4人以上のプレイヤーを登録してください。
          <Link href="/players" className="text-green-deep underline ml-1 font-medium">プレイヤー管理へ →</Link>
        </div>
      ) : (
        <NewGameForm
          players={players ?? []}
          action={action}
          defaultDate={today}
          leagueId={id}
        />
      )}
    </div>
  )
}
