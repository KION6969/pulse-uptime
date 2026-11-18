import { REPO_URL, timeAgo } from '../lib/format'
import type { Health, View } from '../types'
import {
  AlertIcon,
  ArrowIcon,
  GridIcon,
  InfoIcon,
  PulseIcon,
} from './Icons'

interface SidebarProps {
  view: View
  onChange: (view: View) => void
  health: Health
  incidentCount: number
  monitorCount: number
  lastRun: number
}

const items = [
  { id: 'overview' as const, label: 'Overview', icon: GridIcon },
  { id: 'incidents' as const, label: 'Incidents', icon: AlertIcon },
  { id: 'about' as const, label: 'How it works', icon: InfoIcon },
]

export function Sidebar({
  view,
  onChange,
  health,
  incidentCount,
  monitorCount,
  lastRun,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark">
          <PulseIcon size={19} />
        </span>
        <div className="brand-copy">
          <span className="brand-name">Pulse</span>
          <span className="brand-sub">Uptime monitor</span>
        </div>
      </div>

      <nav className="nav" aria-label="Sections">
        <span className="nav-label">Monitor</span>
        {items.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              type="button"
              className={view === item.id ? 'active' : ''}
              onClick={() => onChange(item.id)}
            >
              <Icon size={16} />
              <span>{item.label}</span>
              {item.id === 'incidents' && incidentCount > 0 ? (
                <span className="count">{incidentCount}</span>
              ) : null}
              {item.id === 'overview' ? (
                <span className="count">{monitorCount}</span>
              ) : null}
            </button>
          )
        })}
      </nav>

      <div className="engine">
        <div className="engine-head">
          <span className={`status-dot ${health}`} />
          <strong>
            {health === 'pending' ? 'Engine starting' : 'Engine live'}
          </strong>
        </div>
        <p>GitHub Actions · every 5 min</p>
        <p className="engine-run">Last run {timeAgo(lastRun)}</p>
        <a href={REPO_URL} target="_blank" rel="noreferrer">
          View repository <ArrowIcon size={12} />
        </a>
      </div>
    </aside>
  )
}
