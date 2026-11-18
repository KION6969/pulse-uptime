import { buckets } from '../lib/derive'
import { fmtTime } from '../lib/format'
import type { Check } from '../types'

interface UptimeStripProps {
  checks: Check[]
  count?: number
  sizeSec?: number
  tall?: boolean
}

export function UptimeStrip({
  checks,
  count = 48,
  sizeSec = 1800,
  tall = false,
}: UptimeStripProps) {
  const list = buckets(checks, count, sizeSec)
  const hours = Math.round((count * sizeSec) / 3600)

  return (
    <div
      className={`strip${tall ? ' tall' : ''}`}
      role="img"
      aria-label={`Uptime for the last ${hours} hours`}
    >
      {list.map((bucket, index) => (
        <span
          key={index}
          className={`seg ${bucket.state}`}
          title={`${fmtTime(bucket.start)} · ${
            bucket.total
              ? `${bucket.ok}/${bucket.total} checks OK`
              : 'no data yet'
          }`}
        />
      ))}
    </div>
  )
}
