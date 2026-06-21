'use client'

import { useState } from 'react'
import Link from 'next/link'

type Player = { id: string; name: string }

type Props = {
  players: Player[]
  action: (formData: FormData) => Promise<void>
  defaultDate: string
  leagueId: string
  initialPlayerIds?: string[]
  initialScores?: string[]
  initialLocation?: string
  initialNotes?: string
}

// 点数は下2桁(00)固定なので100で割った値を入力する（350 → 35000点）
const TOTAL_HUNDREDS = 1000 // 100,000点 ÷ 100

const fieldClass =
  'w-full border border-warm-border rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-green-mid focus:ring-1 focus:ring-green-mid transition-colors'

export default function NewGameForm({
  players, action, defaultDate, leagueId,
  initialPlayerIds, initialScores, initialLocation, initialNotes,
}: Props) {
  const [scores, setScores] = useState(initialScores ?? ['', '', '', ''])
  // テンキーの入力対象（何人目の点数を入力中か）
  const [activeIdx, setActiveIdx] = useState(0)

  // テンキー操作（クリックだけで点数入力できる）
  const tapDigit = (d: string) =>
    setScores((prev) =>
      prev.map((v, i) => {
        if (i !== activeIdx) return v
        const base = v === '0' ? '' : v // 先頭の0は残さない
        const next = base + d
        return next.length > 4 ? v : next // 上限4桁（=999900点）
      })
    )
  const tapBackspace = () =>
    setScores((prev) => prev.map((v, i) => (i === activeIdx ? v.slice(0, -1) : v)))
  const tapClear = () =>
    setScores((prev) => prev.map((v, i) => (i === activeIdx ? '' : v)))

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
          <input name="location" defaultValue={initialLocation ?? ''} className={fieldClass} placeholder="例: 雀荘A" />
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
                  defaultValue={initialPlayerIds?.[i] ?? ''}
                  className="flex-1 border border-warm-border rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-green-mid focus:ring-1 focus:ring-green-mid transition-colors"
                >
                  <option value="">プレイヤーを選択</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                {/* 点数: フォーム送信用の hidden + タップで選択する表示ボタン */}
                <input type="hidden" name={`score_${i + 1}`} value={scores[i]} />
                <button
                  type="button"
                  onClick={() => setActiveIdx(i)}
                  className={`flex items-center justify-end gap-1 flex-none w-24 h-11 px-3 rounded-lg border-2 bg-white transition-colors
                    ${activeIdx === i
                      ? 'border-green-deep ring-2 ring-green-mid/20'
                      : isAutoSlot
                        ? 'border-green-mid bg-green-light/40'
                        : 'border-warm-border'
                    }`}
                >
                  {scores[i] === '' ? (
                    <span className={`text-base font-bold ${isAutoSlot ? 'text-green-mid' : 'text-gray-300'}`}>
                      {isAutoSlot ? '自動' : '—'}
                    </span>
                  ) : (
                    <>
                      <span className="text-base font-bold text-gray-900">{scores[i]}</span>
                      <span className="text-xs font-medium text-warm-gray">00</span>
                    </>
                  )}
                </button>
              </div>
            )
          })}
        </div>

        {/* テンキー（クリックだけで点数入力） */}
        <div className="mt-4 bg-cream/60 border border-warm-border rounded-xl p-3">
          <p className="text-xs text-warm-gray text-center mb-2">
            <span className="font-semibold text-green-deep">{activeIdx + 1}人目</span>の点数を入力中（数字をタップ）
          </p>
          <div className="grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => tapDigit(d)}
                className="h-12 rounded-lg bg-white border border-warm-border text-lg font-bold text-gray-900 hover:border-green-mid active:scale-95 transition-all select-none"
              >
                {d}
              </button>
            ))}
            <button
              type="button"
              onClick={tapClear}
              className="h-12 rounded-lg bg-white border border-warm-border text-sm font-medium text-warm-gray hover:border-vermilion hover:text-vermilion active:scale-95 transition-all select-none"
            >
              C
            </button>
            <button
              type="button"
              onClick={() => tapDigit('0')}
              className="h-12 rounded-lg bg-white border border-warm-border text-lg font-bold text-gray-900 hover:border-green-mid active:scale-95 transition-all select-none"
            >
              0
            </button>
            <button
              type="button"
              onClick={tapBackspace}
              className="h-12 rounded-lg bg-white border border-warm-border text-lg text-gray-700 hover:border-green-mid active:scale-95 transition-all select-none"
            >
              ⌫
            </button>
          </div>
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
        <textarea name="notes" rows={2} defaultValue={initialNotes ?? ''} className={fieldClass} placeholder="自由記入" />
      </div>

      {/* ボタン */}
      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          disabled={filledCount !== 4}
          className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm ${
            filledCount === 4
              ? 'bg-green-deep text-white hover:bg-green-mid'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
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
