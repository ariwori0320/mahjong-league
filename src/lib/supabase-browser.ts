import { createBrowserClient } from '@supabase/ssr'

/**
 * クライアントコンポーネント用 Supabase クライアント。
 * ブラウザの Cookie からセッションを自動読み取りするため、
 * RLS の auth.uid() チェックが機能する。
 */
export function getSupabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
