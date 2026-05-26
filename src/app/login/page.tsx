import { createAuthClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

async function signInWithGoogle(formData: FormData) {
  'use server'
  const supabase = await createAuthClient()
  const headersList = await headers()
  const origin = headersList.get('origin') ?? 'http://localhost:3000'
  const next = (formData.get('next') as string) || '/leagues'

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  })

  if (error) throw new Error(error.message)
  if (data.url) redirect(data.url)
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="bg-white rounded-2xl border border-warm-border p-10 shadow-sm text-center max-w-sm w-full">
        <p className="text-5xl mb-4">🀄</p>
        <h1 className="text-xl font-bold text-green-deep mb-2">麻雀リーグ管理</h1>
        <p className="text-sm text-warm-gray mb-8">Google アカウントでログインしてご利用ください</p>

        <form action={signInWithGoogle}>
          {next && <input type="hidden" name="next" value={next} />}
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-3 bg-white border border-warm-border rounded-lg px-6 py-3 text-sm font-medium text-gray-700 hover:bg-cream hover:border-green-mid transition-all shadow-sm"
          >
            <GoogleIcon />
            Google でログイン
          </button>
        </form>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908C16.658 14.091 17.64 11.783 17.64 9.2z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962L3.964 6.294C4.672 4.169 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  )
}
