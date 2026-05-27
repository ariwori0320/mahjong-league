'use server'

import { supabase } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

/**
 * カウンターを league_day_counters に日単位で保存する
 */
export async function saveCounters(leagueId: string, date: string, formData: FormData) {
  // その日の既存カウンターを削除
  await supabase
    .from('league_day_counters')
    .delete()
    .eq('league_id', leagueId)
    .eq('date', date)

  // FormData のキーは `${player_id}_${counter_type_id}` 形式（UUID_UUID）
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
export async function generateInvite(leagueId: string) {
  await supabase.from('league_invites').delete().eq('league_id', leagueId)
  await supabase.from('league_invites').insert({ league_id: leagueId })
  revalidatePath(`/leagues/${leagueId}`)
  redirect(`/leagues/${leagueId}?tab=settings`)
}

/**
 * リーグの設定（基本情報 + ポイントルール）を更新する
 */
export async function updateLeagueSettings(leagueId: string, formData: FormData) {
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
 * リーグにプレイヤーを手動追加する
 */
export async function addLeaguePlayer(leagueId: string, formData: FormData) {
  const playerId = formData.get('player_id') as string
  if (!playerId) return
  await supabase
    .from('league_players')
    .upsert({ league_id: leagueId, player_id: playerId })
  revalidatePath(`/leagues/${leagueId}`)
  redirect(`/leagues/${leagueId}?tab=settings`)
}

/**
 * リーグから手動追加プレイヤーを削除する
 */
export async function removeLeaguePlayer(leagueId: string, playerId: string) {
  await supabase
    .from('league_players')
    .delete()
    .eq('league_id', leagueId)
    .eq('player_id', playerId)
  revalidatePath(`/leagues/${leagueId}`)
  redirect(`/leagues/${leagueId}?tab=settings`)
}

/**
 * リーグを削除する
 */
export async function deleteLeague(leagueId: string) {
  await supabase.from('leagues').delete().eq('id', leagueId)
  revalidatePath('/leagues')
  redirect('/leagues')
}
