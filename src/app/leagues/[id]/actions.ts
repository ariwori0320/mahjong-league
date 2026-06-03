'use server'

import { createAuthClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function saveCounters(leagueId: string, date: string, formData: FormData) {
  const supabase = await createAuthClient()

  await supabase
    .from('league_day_counters')
    .delete()
    .eq('league_id', leagueId)
    .eq('date', date)

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

export async function generateInvite(leagueId: string) {
  const supabase = await createAuthClient()
  await supabase.from('league_invites').delete().eq('league_id', leagueId)
  await supabase.from('league_invites').insert({ league_id: leagueId })
  revalidatePath(`/leagues/${leagueId}`)
  redirect(`/leagues/${leagueId}?tab=settings`)
}

export async function updateLeagueSettings(leagueId: string, formData: FormData) {
  const supabase = await createAuthClient()
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
  const tie_rule = (formData.get('tie_rule') as string) === 'split' ? 'split' : 'order'

  await supabase
    .from('leagues')
    .update({
      name,
      start_date: toStr('start_date'),
      end_date: toStr('end_date'),
      notes: toStr('notes'),
      uma_1, uma_2, uma_3, uma_4, starting_points, return_points,
      tie_rule,
    })
    .eq('id', leagueId)

  revalidatePath(`/leagues/${leagueId}`)
  revalidatePath('/leagues')
  redirect(`/leagues/${leagueId}?tab=settings&saved=1`)
}

export async function addLeaguePlayer(leagueId: string, formData: FormData) {
  const supabase = await createAuthClient()
  const playerId = formData.get('player_id') as string
  if (!playerId) return
  await supabase
    .from('league_players')
    .upsert({ league_id: leagueId, player_id: playerId })
  revalidatePath(`/leagues/${leagueId}`)
  redirect(`/leagues/${leagueId}?tab=settings`)
}

export async function removeLeaguePlayer(leagueId: string, playerId: string) {
  const supabase = await createAuthClient()
  await supabase
    .from('league_players')
    .delete()
    .eq('league_id', leagueId)
    .eq('player_id', playerId)
  revalidatePath(`/leagues/${leagueId}`)
  redirect(`/leagues/${leagueId}?tab=settings`)
}

export async function hideCounterType(leagueId: string, counterId: string) {
  const supabase = await createAuthClient()
  await supabase
    .from('league_counter_type_hidden')
    .upsert({ league_id: leagueId, counter_type_id: counterId })
  revalidatePath(`/leagues/${leagueId}`)
  redirect(`/leagues/${leagueId}?tab=settings`)
}

export async function showCounterType(leagueId: string, counterId: string) {
  const supabase = await createAuthClient()
  await supabase
    .from('league_counter_type_hidden')
    .delete()
    .eq('league_id', leagueId)
    .eq('counter_type_id', counterId)
  revalidatePath(`/leagues/${leagueId}`)
  redirect(`/leagues/${leagueId}?tab=settings`)
}

export async function addCounterType(leagueId: string, formData: FormData) {
  const supabase = await createAuthClient()
  const name = (formData.get('name') as string ?? '').trim()
  const category = (formData.get('category') as string) === '運' ? '運' : '基本'
  if (!name) return
  await supabase.from('counter_types').insert({ name, league_id: leagueId, category })
  revalidatePath(`/leagues/${leagueId}`)
  redirect(`/leagues/${leagueId}?tab=settings`)
}

export async function deleteCounterType(leagueId: string, counterId: string) {
  const supabase = await createAuthClient()
  await supabase
    .from('counter_types')
    .delete()
    .eq('id', counterId)
    .eq('league_id', leagueId) // 自リーグのもののみ削除可
  revalidatePath(`/leagues/${leagueId}`)
  redirect(`/leagues/${leagueId}?tab=settings`)
}

export async function deleteLeague(leagueId: string) {
  const supabase = await createAuthClient()
  await supabase.from('leagues').delete().eq('id', leagueId)
  revalidatePath('/leagues')
  redirect('/leagues')
}
