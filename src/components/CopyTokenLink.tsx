'use client'
import { useState, useEffect } from 'react'

export default function CopyTokenLink({ path }: { path: string }) {
  const [url, setUrl] = useState(path)
  const [copied, setCopied] = useState(false)
  const [canShare, setCanShare] = useState(false)

  useEffect(() => {
    const fullUrl = `${window.location.origin}${path}`
    setUrl(fullUrl)
    // スマホのネイティブ共有（Web Share API）が使えるか確認
    setCanShare(
      typeof navigator.share === 'function' &&
      !!navigator.canShare?.({ url: fullUrl })
    )
  }, [path])

  const handleShare = async () => {
    try {
      await navigator.share({ url, title: 'カウンター入力' })
    } catch {
      // キャンセルなど無視
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <input
        readOnly
        value={url}
        className="flex-1 text-sm border border-warm-border rounded-lg px-3 py-2.5 bg-white text-gray-600 truncate"
      />
      <div className="flex gap-2">
        {canShare && (
          <button
            type="button"
            onClick={handleShare}
            className="flex-1 sm:flex-none bg-green-deep text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-green-mid transition-colors whitespace-nowrap"
          >
            共有
          </button>
        )}
        <button
          type="button"
          onClick={handleCopy}
          className="flex-1 sm:flex-none border border-warm-border bg-white text-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:border-green-mid hover:text-green-deep transition-colors whitespace-nowrap"
        >
          {copied ? '✓ コピー済み' : 'コピー'}
        </button>
      </div>
    </div>
  )
}
