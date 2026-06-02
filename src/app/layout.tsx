import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { getUser, createAuthClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

const notoSansJP = Noto_Sans_JP({ subsets: ["latin"], weight: ["400", "500", "700"] });

export const metadata: Metadata = {
  title: "麻雀リーグ管理",
  description: "麻雀リーグ成績管理",
  manifest: "/manifest.json",
  icons: {
    // Safari が <link rel="apple-touch-icon"> を確認する
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    icon: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "麻雀リーグ",
  },
};

async function signOut() {
  "use server";
  const supabase = await createAuthClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();

  return (
    <html lang="ja" className={notoSansJP.className}>
      <body className="min-h-screen bg-cream">
        {/* ナビゲーション */}
        <header>
          <nav className="bg-green-deep shadow-lg">
            <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2 text-white font-bold text-lg tracking-widest">
                <span className="text-2xl">🀄</span>
                <span>麻雀リーグ</span>
              </Link>
              <div className="flex items-center gap-1">
                {user ? (
                  <>
                    <Link
                      href="/leagues"
                      className="text-sm text-green-100 hover:text-white hover:bg-white/10 px-3 py-3 sm:px-4 rounded transition-all duration-150"
                    >
                      リーグ一覧
                    </Link>
                    <Link
                      href="/players"
                      className="text-sm text-green-100 hover:text-white hover:bg-white/10 px-3 py-3 sm:px-4 rounded transition-all duration-150"
                    >
                      プレイヤー
                    </Link>
                    <form action={signOut}>
                      <button
                        type="submit"
                        title={user.email ?? 'ログアウト'}
                        className="ml-2 text-xs text-green-200 hover:text-white hover:bg-white/10 px-3 py-2 rounded transition-all duration-150 border border-white/20 hover:border-white/40"
                      >
                        {user.user_metadata?.name
                          ? user.user_metadata.name.split(' ')[0]
                          : (user.email?.split('@')[0] ?? 'ユーザー')}
                        　ログアウト
                      </button>
                    </form>
                  </>
                ) : null}
              </div>
            </div>
            {/* 朱色のアクセントライン */}
            <div className="h-1 bg-vermilion" />
          </nav>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-6 sm:py-8 pb-10">
          {children}
        </main>
      </body>
    </html>
  );
}
