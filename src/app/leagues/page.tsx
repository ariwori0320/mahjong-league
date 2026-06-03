import { createAuthClient, getUser } from '@/lib/supabase-server'
import Link from 'next/link'

export default async function LeaguesPage() {
  const [user, supabase] = await Promise.all([getUser(), createAuthClient()])

  // 自分がメンバーのリーグ ID 一覧を取得
  const { data: memberships } = await supabase
    .from('league_members')
    .select('league_id')
    .eq('user_id', user!.id)

  const memberLeagueIds = (memberships ?? []).map((m) => m.league_id)

  // 自分がメンバーのリーグ + 誰でも見られるレガシーリーグ（created_by IS NULL）
  let leaguesQuery = supabase.from('leagues').select('*').order('created_at', { ascending: false })

  if (memberLeagueIds.length > 0) {
    leaguesQuery = leaguesQuery.or(`id.in.(${memberLeagueIds.join(',')}),created_by.is.null`)
  } else {
    leaguesQuery = leaguesQuery.is('created_by', null)
  }

  const { data: leagues } = await leaguesQuery

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-green-deep">リーグ一覧</h1>
          <p className="text-sm text-warm-gray mt-1">登録されたリーグ・シーズンの一覧</p>
        </div>
        <Link
          href="/leagues/new"
          className="bg-green-deep text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-green-mid transition-colors shadow-sm"
        >
          ＋ 新規作成
        </Link>
      </div>

      {!leagues?.length ? (
        <div className="bg-white rounded-xl border border-warm-border p-12 text-center">
          <p className="text-4xl mb-3">🀄</p>
          <p className="text-warm-gray text-sm">リーグがまだありません。</p>
          <p className="text-warm-gray text-sm">「新規作成」から始めるか、招待リンクで参加してください。</p>
        </div>
      ) : (
        <div className="space-y-3">
          {leagues.map((league) => (
            <Link
              key={league.id}
              href={`/leagues/${league.id}`}
              className="flex items-center gap-4 bg-white rounded-xl border border-warm-border px-5 py-4 hover:border-green-mid hover:shadow-md transition-all duration-150 group"
            >
              <div className="w-1.5 h-12 bg-green-deep rounded-full group-hover:bg-vermilion transition-colors" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900">{league.name}</div>
                {league.start_date && (
                  <div className="text-xs text-warm-gray mt-0.5">
                    {league.start_date} 〜 {league.end_date ?? '終了日未定'}
                  </div>
                )}
                {league.notes && (
                  <div className="text-xs text-gray-500 mt-0.5 truncate">{league.notes}</div>
                )}
              </div>
              <span className="text-warm-gray text-lg group-hover:text-green-mid transition-colors">›</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
