import { supabase } from '@/lib/supabase'
import { createAuthClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import Link from 'next/link'

async function createLeague(formData: FormData) {
  'use server'
  const authClient = await createAuthClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) redirect('/login')

  const name = (formData.get('name') as string).trim()
  const start_date = (formData.get('start_date') as string) || null
  const end_date = (formData.get('end_date') as string) || null
  const notes = (formData.get('notes') as string) || null

  const toInt = (key: string) => {
    const v = (formData.get(key) as string).trim()
    return v !== '' ? parseInt(v, 10) : null
  }
  const uma_1 = toInt('uma_1')
  const uma_2 = toInt('uma_2')
  const uma_3 = uma_2 !== null ? -uma_2 : null
  const uma_4 = uma_1 !== null ? -uma_1 : null
  const starting_points = toInt('starting_points')
  const return_points = toInt('return_points')

  const { data: league } = await supabase
    .from('leagues')
    .insert({
      name, start_date, end_date, notes,
      uma_1, uma_2, uma_3, uma_4, starting_points, return_points,
      created_by: user.id,
    })
    .select()
    .single()

  if (league) {
    // 作成者をオーナーとしてメンバーに追加
    await supabase.from('league_members').insert({
      league_id: league.id,
      user_id: user.id,
      role: 'owner',
    })
  }

  revalidatePath('/leagues')
  redirect('/leagues')
}

const inputClass =
  'w-full border border-warm-border rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-green-mid focus:ring-1 focus:ring-green-mid transition-colors'

export default function NewLeaguePage() {
  return (
    <div>
      <Link href="/leagues" className="text-sm text-warm-gray hover:text-green-deep transition-colors">
        ← リーグ一覧
      </Link>
      <h1 className="text-2xl font-bold text-green-deep mt-2 mb-8">新規リーグ作成</h1>

      <form action={createLeague} className="bg-white rounded-xl border border-warm-border p-6 space-y-6 max-w-lg shadow-sm">
        {/* リーグ名 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            リーグ名 <span className="text-vermilion">*</span>
          </label>
          <input name="name" required className={inputClass} placeholder="例: 2026年春リーグ" />
        </div>

        {/* 開始・終了日 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">開始日</label>
            <input name="start_date" type="date" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">終了日</label>
            <input name="end_date" type="date" className={inputClass} />
          </div>
        </div>

        {/* ポイントルール */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-1">ポイントルール</h3>
          <p className="text-xs text-warm-gray mb-4">
            設定するとリーグ集計にポイントが表示されます。後からでも変更できます。
          </p>

          {/* ウマ */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-600 mb-2">
              ウマ
              <span className="font-normal text-warm-gray">（3位・4位は自動でマイナスになります）</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-warm-gray mb-1">1位ウマ</label>
                <input name="uma_1" type="number" placeholder="20" className={inputClass} />
              </div>
              <div>
                <label className="block text-xs text-warm-gray mb-1">2位ウマ</label>
                <input name="uma_2" type="number" placeholder="10" className={inputClass} />
              </div>
            </div>
            <p className="mt-1.5 text-xs text-warm-gray">
              例: 1位=20・2位=10 の場合 → 3位 −10、4位 −20
            </p>
          </div>

          {/* 持ち点・返し点 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">持ち点</label>
              <input name="starting_points" type="number" placeholder="25000" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">返し点</label>
              <input name="return_points" type="number" placeholder="30000" className={inputClass} />
            </div>
          </div>
          <p className="mt-1.5 text-xs text-warm-gray">
            ポイント計算式: (素点 − 返し点) ÷ 1000 + ウマ
          </p>
        </div>

        {/* 備考 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">備考</label>
          <textarea name="notes" rows={2} className={inputClass} placeholder="メモなど" />
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            className="bg-green-deep text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-green-mid transition-colors shadow-sm"
          >
            作成する
          </button>
          <Link href="/leagues" className="px-5 py-2.5 rounded-lg text-sm text-warm-gray hover:bg-cream transition-colors">
            キャンセル
          </Link>
        </div>
      </form>
    </div>
  )
}
