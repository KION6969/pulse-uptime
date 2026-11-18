import type { IncidentWithMonitor } from '../lib/derive'
import { fmtDateTime, fmtDuration } from '../lib/format'
import { AlertIcon } from './Icons'

export function IncidentRow({ incident }: { incident: IncidentWithMonitor }) {
  const now = Math.floor(Date.now() / 1000)
  const duration = (incident.end ?? now) - incident.start

  return (
    <article className="incident">
      <span className={`inc-icon ${incident.end ? 'done' : 'live'}`}>
        <AlertIcon size={15} />
      </span>
      <div className="inc-main">
        <div className="inc-title">
          <span>{incident.monitor.name}</span>
          <span className={`badge ${incident.end ? 'resolved' : 'ongoing'}`}>
            {incident.end ? 'Resolved' : 'Ongoing'}
          </span>
        </div>
        <div className="inc-meta">
          <span>{incident.reason}</span>
          <span className="dot-sep">·</span>
          <span>Started {fmtDateTime(incident.start)}</span>
        </div>
      </div>
      <div className="inc-dur">{fmtDuration(duration)}</div>
    </article>
  )
}
