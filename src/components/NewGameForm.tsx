'use client'

import { useState } from 'react'
import Link from 'next/link'

type Player = { id: string; name: string }

type Props = {
  players: Player[]
  action: (formData: FormData) => Promise<void>
  defaultDate: string
  leagueId: string
}

// 点数は下2桁(00)固定なので100で割った値を入力する（350 → 35000点）
const TOTAL_HUNDREDS = 1000 // 100,000点 ÷ 100

const fieldClass =
  'w-full border border-warm-border rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-green-mid focus:ring-1 focus:ring-green-mid transition-colors'

export default function NewGameForm({ players, action, defaultDate, leagueId }: Props) {
  const [scores, setScores] = useState(['', '', '', ''])

  const setScore = (i: number, val: string) =>
    setScores((prev) => prev.map((v, j) => (j === i ? val : v)))

  // 各スロットの点数をパース（未入力は null）
  const parsed = scores.map((s) => {
    if (s.trim() === '') return null
    const n = parseInt(s, 10)
    return isNaN(n) ? null : n
  })

  const emptyIdx = parsed.findIndex((v) => v === null)
  const filledCount = parsed.filter((v) => v !== null).length
  const canRecalc = filledCount === 3 && emptyIdx !== -1

  const handleRecalc = () => {
    if (!canRecalc) return
    const sum = parsed.reduce<number>((acc, v) => acc + (v ?? 0), 0)
    const remaining = TOTAL_HUNDREDS - sum
    setScores((prev) => prev.map((v, i) => (i === emptyIdx ? String(remaining) : v)))
  }

  return (
    <form action={action} className="bg-white rounded-xl border border-warm-border p-6 space-y-6 max-w-lg shadow-sm">

      {/* 日時・場所 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            対局日時 <span className="text-vermilion">*</span>
          </label>
          <input
            name="played_at"
            type="date"
            defaultValue={defaultDate}
            required
            className={fieldClass}
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">場所</label>
          <input name="location" className={fieldClass} placeholder="例: 雀荘A" />
        </div>
      </div>

      {/* プレイヤーと点数 */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-1">プレイヤーと点数</h3>
        <p className="text-xs text-warm-gray mb-3">
          入力順は自由です。点数が大きい順に自動で順位を計算します。
        </p>
        <div className="space-y-2.5">
          {[0, 1, 2, 3].map((i) => {
            const isAutoSlot = canRecalc && i === emptyIdx
            return (
              <div key={i} className="flex gap-2 items-center">
                <select
                  name={`player_${i + 1}`}
                  required
                  className="flex-1 border border-warm-border rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-green-mid focus:ring-1 focus:ring-green-mid transition-colors"
                >
                  <option value="">プレイヤーを選択</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <div className="flex items-center gap-1 flex-none">
                  <input
                    name={`score_${i + 1}`}
                    type="number"
                    required
                    value={scores[i]}
                    onChange={(e) => setScore(i, e.target.value)}
                    placeholder={isAutoSlot ? '自動' : '350'}
                    className={`w-20 border-2 rounded-lg px-2 py-2.5 text-sm text-right bg-white focus:outline-none transition-colors
                      ${isAutoSlot
                        ? 'border-green-mid bg-green-light/40 focus:border-green-deep placeholder:text-green-mid'
                        : 'border-warm-border focus:border-green-mid focus:ring-1 focus:ring-green-mid'
                      }`}
                  />
                  <span className="text-sm font-medium text-warm-gray select-none">00</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* 再計算ボタン */}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleRecalc}
            disabled={!canRecalc}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border transition-all
              ${canRecalc
                ? 'border-green-mid/60 bg-green-light text-green-deep hover:bg-green-deep hover:text-white hover:border-green-deep active:scale-95'
                : 'border-warm-border bg-cream text-gray-400 cursor-not-allowed'
              }`}
          >
            <span className="text-base leading-none">↻</span>
            残り1人を自動計算
          </button>
          <span className="text-xs text-warm-gray">合計100,000点で計算</span>
        </div>

        {/* 入力済みの合計を表示 */}
        {filledCount >= 2 && (
          <p className="mt-2 text-xs text-warm-gray">
            現在の合計:{' '}
            <span className={`font-semibold ${filledCount === 4 && parsed.reduce<number>((a, v) => a + (v ?? 0), 0) !== TOTAL_HUNDREDS ? 'text-vermilion' : 'text-gray-700'}`}>
              {(parsed.reduce<number>((a, v) => a + (v ?? 0), 0) * 100).toLocaleString()}点
            </span>
            {filledCount === 4 && parsed.reduce<number>((a, v) => a + (v ?? 0), 0) !== TOTAL_HUNDREDS && (
              <span className="text-warm-gray ml-1">（合計が100,000点と異なります）</span>
            )}
          </p>
        )}
      </div>

      {/* メモ */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">メモ</label>
        <textarea name="notes" rows={2} className={fieldClass} placeholder="自由記入" />
      </div>

      {/* ボタン */}
      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          className="bg-green-deep text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-green-mid transition-colors shadow-sm"
        >
          保存する
        </button>
        <Link
          href={`/leagues/${leagueId}`}
          className="px-5 py-2.5 rounded-lg text-sm text-warm-gray hover:bg-cream transition-colors"
        >
          キャンセル
        </Link>
      </div>
    </form>
  )
}
