import { createAuthClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import Link from 'next/link'

async function addPlayer(formData: FormData) {
  'use server'
  const supabase = await createAuthClient()
  const name = (formData.get('name') as string).trim()
  if (!name) return
  await supabase.from('players').insert({ name })
  revalidatePath('/players')
  redirect('/players')
}

async function deletePlayer(formData: FormData) {
  'use server'
  const supabase = await createAuthClient()
  const id = formData.get('id') as string
  await supabase.from('players').delete().eq('id', id)
  revalidatePath('/players')
  redirect('/players')
}

export default async function PlayersPage() {
  const supabase = await createAuthClient()
  const { data: players } = await supabase
    .from('players')
    .select('*')
    .order('created_at', { ascending: true })

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-green-deep">プレイヤー管理</h1>
        <p className="text-sm text-warm-gray mt-1">対局に参加するプレイヤーを登録します</p>
      </div>

      {/* 追加フォーム */}
      <div className="bg-white rounded-xl border border-warm-border p-5 max-w-lg mb-6 shadow-sm">
        <h2 className="font-semibold text-green-deep mb-3">プレイヤーを追加</h2>
        <form action={addPlayer} className="flex gap-2">
          <input
            name="name"
            required
            className="flex-1 border border-warm-border rounded-lg px-3 py-2.5 text-sm bg-cream focus:outline-none focus:border-green-mid focus:ring-1 focus:ring-green-mid transition-colors"
            placeholder="プレイヤー名を入力"
          />
          <button
            type="submit"
            className="bg-green-deep text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-green-mid transition-colors shadow-sm whitespace-nowrap"
          >
            追加
          </button>
        </form>
      </div>

      {/* プレイヤーリスト */}
      <div className="bg-white rounded-xl border border-warm-border max-w-lg shadow-sm overflow-hidden">
        {!players?.length ? (
          <div className="p-8 text-center">
            <p className="text-warm-gray text-sm">プレイヤーがまだいません。</p>
          </div>
        ) : (
          <ul className="divide-y divide-cream">
            {players.map((player, i) => (
              <li key={player.id} className="flex items-center justify-between px-5 py-3 hover:bg-cream/50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-green-light text-green-deep text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <Link href={`/players/${player.id}`} className="text-sm font-medium text-green-deep hover:text-vermilion hover:underline transition-colors">
                    {player.name}
                  </Link>
                </div>
                <form action={deletePlayer}>
                  <input type="hidden" name="id" value={player.id} />
                  <button type="submit" className="text-xs text-warm-gray hover:text-vermilion transition-colors px-2 py-1 rounded hover:bg-vermilion-light">
                    削除
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
