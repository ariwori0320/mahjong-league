import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * サーバーコンポーネント・サーバーアクション向け Supabase クライアント（セッション付き）
 */
export async function createAuthClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component から呼ばれた場合は無視（middleware が更新する）
          }
        },
      },
    }
  )
}

/**
 * 現在ログイン中のユーザーを取得する。未ログインなら null。
 */
export async function getUser() {
  const client = await createAuthClient()
  const {
    data: { user },
  } = await client.auth.getUser()
  return user
}
