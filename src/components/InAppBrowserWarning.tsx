'use client'
import { useEffect, useState } from 'react'

function detectInAppBrowser(): { inApp: boolean; isIOS: boolean } {
  if (typeof navigator === 'undefined') return { inApp: false, isIOS: false }
  const ua = navigator.userAgent
  const isIOS = /iPhone|iPad|iPod/.test(ua)
  const inApp =
    // LINE, Instagram, Facebook, Twitter, WeChat, Snapchat
    /Line\/|Instagram|FBAN|FBAV|Twitter\/|MicroMessenger|Snapchat/.test(ua) ||
    // Android WebView (wv フラグ)
    (/Android/.test(ua) && /wv\)/.test(ua)) ||
    // iOS WebView (Safari が UA に含まれない)
    (isIOS && !/Safari\//.test(ua) && /AppleWebKit/.test(ua))
  return { inApp, isIOS }
}

export default function InAppBrowserWarning() {
  const [show, setShow] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [copied, setCopied] = useState(false)
  const [currentUrl, setCurrentUrl] = useState('')

  useEffect(() => {
    const { inApp, isIOS } = detectInAppBrowser()
    setShow(inApp)
    setIsIOS(isIOS)
    setCurrentUrl(window.location.href)
  }, [])

  if (!show) return null

  const openInChrome = () => {
    if (isIOS) {
      // iOS: googlechrome:// スキーム
      window.location.href = currentUrl.replace(/^https?:\/\//, 'googlechrome://')
    } else {
      // Android: Chrome Intent URL
      const { host, pathname, search } = window.location
      window.location.href = `intent://${host}${pathname}${search}#Intent;scheme=https;package=com.android.chrome;end`
    }
  }

  const copyUrl = async () => {
    await navigator.clipboard.writeText(currentUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <p className="text-3xl text-center mb-3">🚫</p>
        <h2 className="text-base font-bold text-gray-900 text-center mb-2">
          このブラウザでは Google ログインできません
        </h2>
        <p className="text-sm text-gray-500 text-center mb-5 leading-relaxed">
          Google のポリシーにより、アプリ内ブラウザでのログインは禁止されています。
          <br />
          <span className="font-medium text-gray-700">Chrome</span> または <span className="font-medium text-gray-700">Safari</span> で開いてください。
        </p>

        <button
          onClick={openInChrome}
          className="w-full bg-green-deep text-white py-3 rounded-xl text-sm font-semibold mb-2 hover:bg-green-mid transition-colors"
        >
          Chrome で開く
        </button>

        <button
          onClick={copyUrl}
          className="w-full border border-warm-border py-2.5 rounded-xl text-sm text-gray-600 hover:bg-cream transition-colors"
        >
          {copied ? '✓ URL をコピーしました' : 'URL をコピーする'}
        </button>

        <p className="text-xs text-gray-400 text-center mt-3">
          Chrome が開かない場合はURLをコピーして Chrome のアドレスバーに貼り付けてください
        </p>
      </div>
    </div>
  )
}
