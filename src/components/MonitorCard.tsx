import {
  isCheckOk,
  monitorHealth,
  uptimeOf,
} from '../lib/derive'
import { fmtMs, fmtPct, hostOf, timeAgo } from '../lib/format'
import type { Monitor } from '../types'
import { Sparkline } from './Sparkline'
import { UptimeStrip } from './UptimeStrip'

interface MonitorCardProps {
  monitor: Monitor
  onOpen: (monitor: Monitor) => void
}

export function MonitorCard({ monitor, onOpen }: MonitorCardProps) {
  const health = monitorHealth(monitor)
  const uptime = uptimeOf(monitor.checks, 86400)
  const latencies = monitor.checks
    .filter(isCheckOk)
    .slice(-48)
    .map((c) => c.ms)
  const color = health === 'down' ? '#ff6262' : '#3ddc97'
  const last = monitor.last

  return (
    <button
      type="button"
      className={`monitor ${health}`}
      onClick={() => onOpen(monitor)}
      aria-label={`Open details for ${monitor.name}`}
    >
      <div className="m-top">
        <span className={`status-dot ${health}`} />
        <div className="m-id">
          <span className="m-name">{monitor.name}</span>
          <span className="m-url">{hostOf(monitor.url)}</span>
        </div>
        <span className="m-ms">{last ? fmtMs(last.ms) : '—'}</span>
      </div>

      <div className="m-mid">
        <div>
          <span className="m-uptime">{fmtPct(uptime)}</span>
          <span className="m-label">uptime · 24h</span>
        </div>
        <Sparkline values={latencies} color={color} />
      </div>

      <UptimeStrip checks={monitor.checks} />

      <div className="m-foot">
        <span>
          {last ? `Checked ${timeAgo(last.t)}` : 'Awaiting first check'}
        </span>
        <span className="mono">
          {last ? (last.code ? `HTTP ${last.code}` : 'No response') : '—'}
        </span>
      </div>
    </button>
  )
}
