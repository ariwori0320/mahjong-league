import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import CounterInputForm from '@/components/CounterInputForm'

async function saveCounters(gameId: string, token: string, formData: FormData) {
  'use server'

  const { data: results } = await supabase
    .from('game_results')
    .select('player_id')
    .eq('game_id', gameId)

  const { data: counterTypes } = await supabase
    .from('counter_types')
    .select('id')

  await supabase.from('game_counters').delete().eq('game_id', gameId)

  const inserts: { game_id: string; player_id: string; counter_type_id: string; count: number }[] = []
  for (const result of results ?? []) {
    for (const ct of counterTypes ?? []) {
      const key = `${result.player_id}_${ct.id}`
      const count = parseInt(formData.get(key) as string) || 0
      if (count > 0) {
        inserts.push({ game_id: gameId, player_id: result.player_id, counter_type_id: ct.id, count })
      }
    }
  }

  if (inserts.length > 0) {
    await supabase.from('game_counters').insert(inserts)
  }

  revalidatePath(`/input/${token}`)
  redirect(`/input/${token}/done`)
}

export default async function InputPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const { data: tokenRow } = await supabase
    .from('game_tokens')
    .select(`
      *,
      games(
        *,
        leagues(name),
        game_results(*, players(name))
      )
    `)
    .eq('token', token)
    .single()

  if (!tokenRow) notFound()

  const game = tokenRow.games as any
  const players = [...(game.game_results ?? [])].sort((a: any, b: any) => a.rank - b.rank)

  const { data: counterTypes } = await supabase
    .from('counter_types')
    .select('*')
    .order('created_at')

  const { data: existing } = await supabase
    .from('game_counters')
    .select('*')
    .eq('game_id', game.id)

  const counterMap: Record<string, number> = {}
  existing?.forEach((c) => {
    counterMap[`${c.player_id}_${c.counter_type_id}`] = c.count
  })

  const action = saveCounters.bind(null, game.id, token)

  return (
    <div>
      {/* ヘッダー */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-green-deep">カウンター入力</h1>
        <p className="text-sm text-warm-gray mt-1">
          {game.leagues?.name} ·{' '}
          {new Date(game.played_at).toLocaleDateString('ja-JP', {
            year: 'numeric', month: 'long', day: 'numeric',
          })}
        </p>
      </div>

      <CounterInputForm
        players={players}
        counterTypes={counterTypes ?? []}
        initialValues={counterMap}
        action={action}
      />
    </div>
  )
}
