import type { GlobalStats } from '../lib/derive'
import { monitorHealth } from '../lib/derive'
import { fmtMs, fmtPct, timeAgo } from '../lib/format'
import type { Health, Monitor } from '../types'

interface StatusBannerProps {
  health: Health
  monitors: Monitor[]
  stats: GlobalStats
  lastRun: number
}

export function StatusBanner({
  health,
  monitors,
  stats,
  lastRun,
}: StatusBannerProps) {
  const down = monitors.filter((m) => monitorHealth(m) === 'down')

  const title =
    health === 'up'
      ? 'All systems operational'
      : health === 'down'
        ? `${down.length} ${down.length === 1 ? 'service is' : 'services are'} down`
        : 'Monitoring is starting'

  const subtitle =
    health === 'up'
      ? `${monitors.length} monitors checked every 5 minutes`
      : health === 'down'
        ? down.map((m) => m.name).join(', ')
        : 'The first results will appear in a few minutes'

  return (
    <section className={`banner ${health}`}>
      <div className="banner-left">
        <div className={`orb ${health}`} aria-hidden="true">
          <span className="orb-ring" />
          <span className="orb-ring" />
          <span className="orb-ring" />
          <span className="orb-core" />
        </div>
        <div className="banner-copy">
          <div className="banner-eyebrow">
            <span className={`status-dot ${health}`} />
            {health === 'up'
              ? 'Operational'
              : health === 'down'
                ? 'Incident in progress'
                : 'Standby'}
          </div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>

      <div className="banner-metrics">
        <div className="banner-metric">
          <b>{fmtPct(stats.uptime)}</b>
          <span>uptime · 24h</span>
        </div>
        <div className="banner-sep" />
        <div className="banner-metric">
          <b>{fmtMs(stats.avg)}</b>
          <span>avg response</span>
        </div>
        <div className="banner-sep" />
        <div className="banner-metric">
          <b className="mono-value">{timeAgo(lastRun)}</b>
          <span>last engine run</span>
        </div>
      </div>
    </section>
  )
}
