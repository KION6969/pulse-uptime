import { allIncidents } from '../lib/derive'
import type { Monitor } from '../types'
import { CheckIcon } from './Icons'
import { IncidentRow } from './IncidentRow'

export function IncidentsView({ monitors }: { monitors: Monitor[] }) {
  const incidents = allIncidents(monitors)
  const ongoing = incidents.filter((incident) => !incident.end).length

  if (!incidents.length) {
    return (
      <div className="empty">
        <span className="empty-icon">
          <CheckIcon size={22} />
        </span>
        <h2>No incidents recorded</h2>
        <p>
          Since Pulse started checking, every target has stayed up. The moment
          a check fails, the outage appears here.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="inc-summary">
        <div>
          <b>{incidents.length}</b>
          <span>recorded</span>
        </div>
        <div>
          <b className={ongoing ? 'text-red' : ''}>{ongoing}</b>
          <span>ongoing</span>
        </div>
        <div>
          <b>
            {incidents.filter((incident) => incident.end).length}
          </b>
          <span>resolved</span>
        </div>
      </div>
      <div className="incidents">
        {incidents.map((incident) => (
          <IncidentRow key={incident.id} incident={incident} />
        ))}
      </div>
    </>
  )
}
