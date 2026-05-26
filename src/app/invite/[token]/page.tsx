import { supabase } from '@/lib/supabase'
import { getUser } from '@/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  // 招待トークンを検索
  const { data: invite } = await supabase
    .from('league_invites')
    .select('league_id, leagues(name)')
    .eq('token', token)
    .single()

  if (!invite) notFound()

  const league = invite.leagues as any
  const user = await getUser()

  // 未ログイン → ログイン後にこのページへ戻る
  if (!user) {
    redirect(`/login?next=/invite/${token}`)
  }

  // 既にメンバーか確認
  const { data: existing } = await supabase
    .from('league_members')
    .select('league_id')
    .eq('league_id', invite.league_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!existing) {
    // メンバーとして追加
    await supabase.from('league_members').insert({
      league_id: invite.league_id,
      user_id: user.id,
      role: 'member',
    })
  }

  // リーグページへリダイレクト
  redirect(`/leagues/${invite.league_id}`)
}
