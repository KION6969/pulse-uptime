import { useState } from 'react'
import { isCheckOk } from '../lib/derive'
import { fmtMs, fmtTime } from '../lib/format'
import type { Check } from '../types'

const W = 760
const H = 240
const PAD = { top: 24, right: 16, bottom: 30, left: 54 }

interface ResponseChartProps {
  checks: Check[]
}

export function ResponseChart({ checks }: ResponseChartProps) {
  const [hover, setHover] = useState<number | null>(null)
  const data = checks.filter(isCheckOk).slice(-288)

  if (data.length < 2) {
    return (
      <div className="chart-empty">
        <span>Not enough data yet</span>
        <p>
          The response-time chart fills in as the engine runs every five
          minutes.
        </p>
      </div>
    )
  }

  const max = Math.max(...data.map((c) => c.ms), 60)
  const yMax = Math.max(100, Math.ceil(max / 50) * 50)
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom
  const px = (index: number) =>
    PAD.left + (index / (data.length - 1)) * innerW
  const py = (ms: number) => PAD.top + (1 - ms / yMax) * innerH

  const line = data
    .map(
      (check, index) =>
        `${index === 0 ? 'M' : 'L'}${px(index).toFixed(1)},${py(check.ms).toFixed(1)}`,
    )
    .join(' ')
  const area = `${line} L${px(data.length - 1).toFixed(1)},${PAD.top + innerH} L${PAD.left},${PAD.top + innerH} Z`

  const midIndex = Math.floor((data.length - 1) / 2)
  const ticks = [0, 0.5, 1]

  function onMove(event: React.MouseEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * W
    const ratio = (x - PAD.left) / innerW
    const index = Math.round(ratio * (data.length - 1))
    setHover(Math.max(0, Math.min(data.length - 1, index)))
  }

  const active = hover !== null ? data[hover] : null
  const labelW = 124
  const labelX =
    hover !== null
      ? Math.max(
          PAD.left,
          Math.min(W - PAD.right - labelW, px(hover) - labelW / 2),
        )
      : 0

  return (
    <div className="chart-wrap">
      <svg
        className="chart"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Response time over the last 24 hours"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="response-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3ddc97" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#3ddc97" stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticks.map((tick) => {
          const y = PAD.top + tick * innerH
          const value = Math.round(yMax * (1 - tick))
          return (
            <g key={tick}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={y}
                y2={y}
                stroke="rgba(255,255,255,.06)"
                strokeDasharray="3 5"
              />
              <text
                x={PAD.left - 10}
                y={y + 3.5}
                textAnchor="end"
                fontSize="10"
                fill="#5d636e"
                fontFamily="JetBrains Mono, monospace"
              >
                {value} ms
              </text>
            </g>
          )
        })}

        <path d={area} fill="url(#response-fill)" />
        <path
          d={line}
          fill="none"
          stroke="#3ddc97"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {[...new Set([0, midIndex, data.length - 1])].map((index) => (
          <text
            key={index}
            x={px(index)}
            y={H - 8}
            textAnchor={
              index === 0 ? 'start' : index === data.length - 1 ? 'end' : 'middle'
            }
            fontSize="10"
            fill="#5d636e"
            fontFamily="JetBrains Mono, monospace"
          >
            {fmtTime(data[index].t)}
          </text>
        ))}

        {hover !== null && active ? (
          <g>
            <line
              x1={px(hover)}
              x2={px(hover)}
              y1={PAD.top}
              y2={PAD.top + innerH}
              stroke="rgba(255,255,255,.18)"
              strokeDasharray="3 4"
            />
            <circle
              cx={px(hover)}
              cy={py(active.ms)}
              r="4"
              fill="#3ddc97"
              stroke="#0a0c10"
              strokeWidth="2"
            />
            <g transform={`translate(${labelX}, ${PAD.top + 4})`}>
              <rect
                width={labelW}
                height={40}
                rx="8"
                fill="#14171d"
                stroke="rgba(255,255,255,.12)"
              />
              <text
                x="10"
                y="17"
                fontSize="11"
                fill="#eef1f5"
                fontFamily="JetBrains Mono, monospace"
              >
                {fmtMs(active.ms)}
              </text>
              <text x="10" y="31" fontSize="10" fill="#5d636e">
                {fmtTime(active.t)} · HTTP {active.code}
              </text>
            </g>
          </g>
        ) : null}

        <rect
          x={PAD.left}
          y={PAD.top}
          width={innerW}
          height={innerH}
          fill="transparent"
        />
      </svg>
    </div>
  )
}

