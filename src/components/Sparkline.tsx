import { useId } from 'react'

interface SparklineProps {
  values: number[]
  color?: string
  width?: number
  height?: number
}

export function Sparkline({
  values,
  color = '#3ddc97',
  width = 140,
  height = 38,
}: SparklineProps) {
  const rawId = useId()
  const gradientId = `spark-${rawId.replace(/[^a-zA-Z0-9]/g, '')}`
  const data = values.filter((v) => Number.isFinite(v))

  if (!data.length) {
    return (
      <svg
        className="spark"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d={`M0 ${height / 2} H${width}`}
          fill="none"
          stroke="rgba(255,255,255,.08)"
          strokeWidth="1.5"
          strokeDasharray="4 5"
        />
      </svg>
    )
  }

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const flat = max - min < 1
  const coords = data.map((value, index) => {
    const x = data.length === 1 ? 0 : (index / (data.length - 1)) * width
    const y = flat
      ? height * 0.45
      : height - 4 - ((value - min) / range) * (height - 8)
    return [x, y] as const
  })
  if (coords.length === 1) coords.push([width, coords[0][1]])

  const line = coords
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ')
  const area = `${line} L${width},${height} L0,${height} Z`

  return (
    <svg
      className="spark"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.26" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        opacity={flat ? 0.55 : 1}
      />
    </svg>
  )
}
