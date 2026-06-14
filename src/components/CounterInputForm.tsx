'use client'

import { useState } from 'react'

type Player = {
  player_id: string
  rank: number
  players: { name: string } | null
}

type CounterType = {
  id: string
  name: string
}

type Props = {
  players: Player[]
  counterTypes: CounterType[]
  initialValues: Record<string, number>
  action: (formData: FormData) => void
}

export default function CounterInputForm({ players, counterTypes, initialValues, action }: Props) {
  const [counts, setCounts] = useState<Record<string, number>>(initialValues)
  const [activePlayerId, setActivePlayerId] = useState(players[0]?.player_id ?? '')

  const key = (pid: string, ctid: string) => `${pid}_${ctid}`

  const inc = (k: string) =>
    setCounts((p) => ({ ...p, [k]: (p[k] ?? 0) + 1 }))

  const dec = (k: string) =>
    setCounts((p) => ({ ...p, [k]: Math.max(0, (p[k] ?? 0) - 1) }))

  const set = (k: string, val: string) => {
    const n = parseInt(val, 10)
    setCounts((p) => ({ ...p, [k]: isNaN(n) || n < 0 ? 0 : n }))
  }

  const playerTotal = (pid: string) =>
    counterTypes.reduce((s, ct) => s + (counts[key(pid, ct.id)] ?? 0), 0)

  return (
    <form action={action}>
      {/* 全プレイヤー × 全カウンタータイプの hidden input（フォーム送信用） */}
      {players.map((p) =>
        counterTypes.map((ct) => (
          <input
            key={key(p.player_id, ct.id)}
            type="hidden"
            name={key(p.player_id, ct.id)}
            value={counts[key(p.player_id, ct.id)] ?? 0}
          />
        ))
      )}

      {/* 上部固定の保存ボタン（スクロールしても常に表示） */}
      <div className="sticky top-0 z-20 -mx-4 px-4 py-2.5 mb-4 bg-cream/95 backdrop-blur-sm border-b border-warm-border">
        <button
          type="submit"
          className="w-full bg-green-deep text-white py-3 rounded-xl font-bold text-base
            hover:bg-green-mid active:scale-[0.98] transition-all shadow-sm"
        >
          保存する
        </button>
      </div>

      {/* プレイヤー選択タブ */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1 -mx-4 px-4 snap-x">
        {players.map((p) => {
          const total = playerTotal(p.player_id)
          const isActive = p.player_id === activePlayerId
          return (
            <button
              key={p.player_id}
              type="button"
              onClick={() => setActivePlayerId(p.player_id)}
              className={`flex-none flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all snap-start
                ${isActive
                  ? 'bg-green-deep text-white shadow-sm'
                  : 'bg-white border border-warm-border text-warm-gray hover:border-green-mid hover:text-green-deep'
                }`}
            >
              {p.players?.name}
              {total > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold leading-none
                  ${isActive ? 'bg-white/20 text-white' : 'bg-green-light text-green-deep'}`}>
                  {total}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* カウンター行 */}
      <div className="bg-white rounded-xl border border-warm-border overflow-hidden shadow-sm mb-5">
        {counterTypes.map((ct, i) => {
          const k = key(activePlayerId, ct.id)
          const count = counts[k] ?? 0
          return (
            <div
              key={ct.id}
              className={`flex items-center justify-between px-4 py-3 transition-colors
                ${i > 0 ? 'border-t border-cream' : ''}
                ${count > 0 ? 'bg-green-light/40' : ''}`}
            >
              <span className={`text-sm font-medium min-w-0 mr-3 ${count > 0 ? 'text-green-deep' : 'text-gray-700'}`}>
                {ct.name}
              </span>
              <div className="flex items-center gap-2 flex-none">
                {/* マイナスボタン */}
                <button
                  type="button"
                  onClick={() => dec(k)}
                  disabled={count === 0}
                  className="w-11 h-11 rounded-full border-2 border-warm-border text-gray-500 font-bold text-xl
                    flex items-center justify-center
                    hover:border-vermilion hover:text-vermilion hover:bg-vermilion-light
                    active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed
                    transition-all duration-100 select-none touch-none"
                >
                  −
                </button>
                {/* 数値入力（直接修正用） */}
                <input
                  type="number"
                  value={count}
                  min="0"
                  onChange={(e) => set(k, e.target.value)}
                  className="w-14 h-11 text-center border-2 border-warm-border rounded-lg
                    text-base font-bold text-gray-900
                    focus:outline-none focus:border-green-mid focus:ring-2 focus:ring-green-mid/20
                    transition-colors"
                />
                {/* プラスボタン */}
                <button
                  type="button"
                  onClick={() => inc(k)}
                  className="w-11 h-11 rounded-full bg-green-deep text-white font-bold text-xl
                    flex items-center justify-center shadow-sm
                    hover:bg-green-mid active:scale-90
                    transition-all duration-100 select-none touch-none"
                >
                  ＋
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* プレイヤー別合計サマリー */}
      <div className="bg-white rounded-xl border border-warm-border p-3 mb-5">
        <p className="text-xs text-warm-gray mb-2 text-center">入力合計</p>
        <div className="grid grid-cols-4 gap-2">
          {players.map((p) => {
            const total = playerTotal(p.player_id)
            const isActive = p.player_id === activePlayerId
            return (
              <button
                key={p.player_id}
                type="button"
                onClick={() => setActivePlayerId(p.player_id)}
                className={`text-center p-2 rounded-lg transition-colors
                  ${isActive ? 'bg-green-light ring-2 ring-green-deep/30' : 'hover:bg-cream'}`}
              >
                <div className="text-xs text-warm-gray truncate">{p.players?.name}</div>
                <div className={`text-xl font-bold ${total > 0 ? 'text-green-deep' : 'text-gray-300'}`}>
                  {total}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* 保存ボタン */}
      <button
        type="submit"
        className="w-full bg-green-deep text-white py-4 rounded-xl font-bold text-base
          hover:bg-green-mid active:scale-[0.98] transition-all shadow-sm"
      >
        保存する
      </button>
    </form>
  )
}
