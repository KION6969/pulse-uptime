import { useEffect } from 'react'
import {
  averageLatency,
  isCheckOk,
  monitorHealth,
  percentileLatency,
  uptimeOf,
} from '../lib/derive'
import {
  fmtDateTime,
  fmtDuration,
  fmtMs,
  fmtPct,
  timeAgo,
} from '../lib/format'
import type { Monitor } from '../types'
import { ArrowIcon, CloseIcon } from './Icons'
import { ResponseChart } from './ResponseChart'
import { UptimeStrip } from './UptimeStrip'

interface DetailPanelProps {
  monitor: Monitor
  onClose: () => void
}

export function DetailPanel({ monitor, onClose }: DetailPanelProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [onClose])

  const health = monitorHealth(monitor)
  const uptime = uptimeOf(monitor.checks, 86400)
  const avg = averageLatency(monitor.checks, 86400)
  const p95 = percentileLatency(monitor.checks, 86400, 0.95)
  const recent = monitor.checks.slice(-10).reverse()
  const incidents = [...monitor.incidents].reverse()
  const now = Math.floor(Date.now() / 1000)

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <aside
        className="panel"
        role="dialog"
        aria-modal="true"
        aria-label={`${monitor.name} details`}
      >
        <header className="panel-head">
          <div className="panel-title">
            <span className={`status-dot ${health}`} />
            <div>
              <h2>{monitor.name}</h2>
              <a
                className="panel-url"
                href={monitor.url}
                target="_blank"
                rel="noreferrer"
              >
                {monitor.url.replace(/^https?:\/\//, '')}
              </a>
            </div>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="Close details"
          >
            <CloseIcon />
          </button>
        </header>

        <div className="panel-meta">
          <span className={`chip ${health}`}>
            {health === 'up'
              ? 'Operational'
              : health === 'down'
                ? 'Down'
                : 'Pending'}
          </span>
          <span>
            {monitor.last
              ? `Last checked ${timeAgo(monitor.last.t)}`
              : 'No checks yet'}
          </span>
          <span className="mono">
            {monitor.last?.code ? `HTTP ${monitor.last.code}` : '—'}
          </span>
        </div>

        <div className="panel-stats">
          <div>
            <b>{fmtPct(uptime)}</b>
            <span>uptime · 24h</span>
          </div>
          <div>
            <b>{fmtMs(avg)}</b>
            <span>avg response</span>
          </div>
          <div>
            <b>{fmtMs(p95)}</b>
            <span>p95 response</span>
          </div>
        </div>

        <section className="panel-section">
          <div className="panel-section-head">
            <h3>Response time</h3>
            <span>last 24 hours</span>
          </div>
          <ResponseChart checks={monitor.checks} />
        </section>

        <section className="panel-section">
          <div className="panel-section-head">
            <h3>Uptime</h3>
            <span>15-minute segments</span>
          </div>
          <UptimeStrip checks={monitor.checks} count={96} sizeSec={900} tall />
        </section>

        <section className="panel-section">
          <div className="panel-section-head">
            <h3>Recent checks</h3>
            <span>{monitor.checks.length} stored</span>
          </div>
          {recent.length ? (
            <table className="checks">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Status</th>
                  <th>Latency</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((check) => (
                  <tr key={check.t}>
                    <td className="mono">{fmtDateTime(check.t)}</td>
                    <td>
                      <span
                        className={`pill ${isCheckOk(check) ? 'ok' : 'bad'}`}
                      >
                        {check.code || 'ERR'}
                      </span>
                    </td>
                    <td className="mono">{fmtMs(check.ms)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="muted-line">No checks recorded yet.</p>
          )}
        </section>

        <section className="panel-section">
          <div className="panel-section-head">
            <h3>Incidents</h3>
            <span>{incidents.length} recorded</span>
          </div>
          {incidents.length ? (
            <div className="panel-incidents">
              {incidents.map((incident) => (
                <div className="panel-incident" key={incident.id}>
                  <span className={`incident-mark ${incident.end ? 'done' : 'live'}`} />
                  <div>
                    <strong>{incident.reason}</strong>
                    <span>
                      {fmtDateTime(incident.start)} ·{' '}
                      {fmtDuration((incident.end ?? now) - incident.start)}
                      {incident.end ? '' : ' · ongoing'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted-line">No incidents recorded. Quiet is good.</p>
          )}
        </section>

        <a
          className="visit-btn"
          href={monitor.url}
          target="_blank"
          rel="noreferrer"
        >
          Visit site <ArrowIcon size={14} />
        </a>
      </aside>
    </>
  )
}
