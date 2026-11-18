import { allIncidents, globalStats, monitorHealth, overallHealth } from '../lib/derive'
import { fmtMs, fmtPct } from '../lib/format'
import type { Monitor } from '../types'
import { MonitorCard } from './MonitorCard'
import { CheckIcon, ActivityIcon, AlertIcon, ServerIcon, ZapIcon } from './Icons'
import { StatCard } from './StatCard'
import { StatusBanner } from './StatusBanner'
import { IncidentRow } from './IncidentRow'

interface OverviewProps {
  monitors: Monitor[]
  generatedAt: number
  onOpen: (monitor: Monitor) => void
}

export function Overview({ monitors, generatedAt, onOpen }: OverviewProps) {
  const health = overallHealth(monitors)
  const stats = globalStats(monitors)
  const now = Math.floor(Date.now() / 1000)
  const recent = allIncidents(monitors)
    .filter((incident) => incident.start >= now - 86400)
    .slice(0, 3)

  return (
    <>
      <StatusBanner
        health={health}
        monitors={monitors}
        stats={stats}
        lastRun={generatedAt}
      />

      <div className="stats">
        <StatCard
          icon={<ActivityIcon size={15} />}
          label="Uptime 24h"
          value={fmtPct(stats.uptime)}
          sub={`${stats.checks} checks across ${stats.total} monitors`}
        />
        <StatCard
          icon={<ZapIcon size={15} />}
          label="Avg response"
          value={fmtMs(stats.avg)}
          sub="Healthy checks, all monitors"
        />
        <StatCard
          icon={<ServerIcon size={15} />}
          label="Monitors"
          value={`${stats.up}/${stats.total}`}
          sub="Reporting operational"
        />
        <StatCard
          icon={<AlertIcon size={15} />}
          label="Incidents 24h"
          value={String(stats.incidents24h)}
          sub={`${stats.openIncidents} open right now`}
          tone={stats.openIncidents ? 'danger' : 'default'}
        />
      </div>

      <div className="section-head">
        <h2>Monitors</h2>
        <span>
          {monitors.filter((m) => monitorHealth(m) === 'up').length} of{' '}
          {monitors.length} operational
        </span>
      </div>
      <div className="monitors">
        {monitors.map((monitor) => (
          <MonitorCard key={monitor.id} monitor={monitor} onOpen={onOpen} />
        ))}
      </div>

      <div className="section-head">
        <h2>Recent incidents</h2>
        <span>Last 24 hours</span>
      </div>
      {recent.length ? (
        <div className="incidents">
          {recent.map((incident) => (
            <IncidentRow key={incident.id} incident={incident} />
          ))}
        </div>
      ) : (
        <div className="quiet">
          <span className="quiet-icon">
            <CheckIcon size={17} />
          </span>
          <div>
            <strong>Quiet day</strong>
            <p>No incidents recorded in the last 24 hours.</p>
          </div>
        </div>
      )}
    </>
  )
}
