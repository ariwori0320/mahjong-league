import { createClient } from '@supabase/supabase-js'

/**
 * サーバー専用の管理用 Supabase クライアント。
 * service_role キーを使うため RLS をバイパスする。
 *
 * ⚠️ 絶対にクライアントコンポーネント（'use client'）から import しないこと。
 *    招待トークンの照合など、ログイン前の処理にのみ使用する。
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY が設定されていません。Supabase の Settings → API から service_role キーを取得し、環境変数に追加してください。'
    )
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
