import { createAdminClient } from '@/lib/supabase-admin'
import { getUser } from '@/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  // service_role クライアント（RLS バイパス）。
  // 招待される人はまだメンバーではなく、通常クライアントでは
  // RLS により league_invites / league_members を読み書きできないため、
  // トークン照合とメンバー追加はここで行う。
  const admin = createAdminClient()

  // 招待トークンを検索
  const { data: invite } = await admin
    .from('league_invites')
    .select('league_id')
    .eq('token', token)
    .maybeSingle()

  if (!invite) notFound()

  const user = await getUser()

  // 未ログイン → ログイン後にこのページへ戻る
  if (!user) {
    redirect(`/login?next=/invite/${token}`)
  }

  // 既にメンバーか確認
  const { data: existing } = await admin
    .from('league_members')
    .select('league_id')
    .eq('league_id', invite.league_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!existing) {
    // メンバーとして追加（以降はメンバーとして閲覧・編集できる）
    await admin.from('league_members').insert({
      league_id: invite.league_id,
      user_id: user.id,
      role: 'member',
    })
  }

  // リーグページへリダイレクト
  redirect(`/leagues/${invite.league_id}`)
}
