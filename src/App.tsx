import { useCallback, useEffect, useMemo, useState } from 'react'
import { AboutView } from './components/AboutView'
import { DetailPanel } from './components/DetailPanel'
import { ArrowIcon, RefreshIcon } from './components/Icons'
import { IncidentsView } from './components/IncidentsView'
import { Overview } from './components/Overview'
import { Sidebar } from './components/Sidebar'
import { loadStatus } from './lib/api'
import { allIncidents, overallHealth } from './lib/derive'
import { REPO_URL, timeAgo } from './lib/format'
import type { Monitor, StatusPayload, View } from './types'

const meta: Record<View, { title: string; sub: string }> = {
  overview: {
    title: 'Overview',
    sub: 'Every service, one quiet dashboard.',
  },
  incidents: {
    title: 'Incidents',
    sub: 'Every outage Pulse has recorded.',
  },
  about: {
    title: 'How it works',
    sub: 'No database. No cron service. No API keys.',
  },
}

function LoadingState() {
  return (
    <>
      <div className="sk sk-banner" />
      <div className="stats">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="sk sk-stat" key={index} />
        ))}
      </div>
      <div className="monitors">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="sk sk-card" key={index} />
        ))}
      </div>
    </>
  )
}

export default function App() {
  const [status, setStatus] = useState<StatusPayload | null>(null)
  const [source, setSource] = useState<'live' | 'snapshot'>('snapshot')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<View>('overview')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [, setTick] = useState(0)

  const refresh = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true)
    try {
      const result = await loadStatus()
      setStatus(result.data)
      setSource(result.source)
      setError(null)
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Unable to load status',
      )
    } finally {
      setLoading(false)
      if (manual) window.setTimeout(() => setRefreshing(false), 700)
    }
  }, [])

  useEffect(() => {
    void refresh(false)

    const poll = window.setInterval(() => {
      if (!document.hidden) void refresh(false)
    }, 60_000)
    const clock = window.setInterval(() => setTick((t) => t + 1), 30_000)

    const onVisible = () => {
      if (!document.hidden) void refresh(false)
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      window.clearInterval(poll)
      window.clearInterval(clock)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refresh])

  const selected = useMemo(
    () => status?.monitors.find((monitor) => monitor.id === selectedId) ?? null,
    [status, selectedId],
  )

  const health = status ? overallHealth(status.monitors) : 'pending'
  const openIncidents = status
    ? allIncidents(status.monitors).filter((incident) => !incident.end).length
    : 0
  const lastRun = status?.generatedAt ?? Math.floor(Date.now() / 1000)

  const openMonitor = useCallback((monitor: Monitor) => {
    setSelectedId(monitor.id)
  }, [])

  const closePanel = useCallback(() => setSelectedId(null), [])

  return (
    <div className="app">
      <Sidebar
        view={view}
        onChange={setView}
        health={health}
        incidentCount={openIncidents}
        monitorCount={status?.monitors.length ?? 0}
        lastRun={lastRun}
      />

      <main className="main">
        <header className="topbar">
          <div className="topbar-title">
            <h1>{meta[view].title}</h1>
            <p>{meta[view].sub}</p>
          </div>
          <div className="topbar-right">
            <span className={`source ${source}`}>
              <span className="source-dot" />
              {source === 'live' ? 'Live data' : 'Snapshot'}
            </span>
            <span className="updated">
              {status ? `Updated ${timeAgo(status.generatedAt)}` : 'Loading'}
            </span>
            <button
              type="button"
              className={`icon-btn${refreshing ? ' spinning' : ''}`}
              onClick={() => void refresh(true)}
              aria-label="Refresh status"
              disabled={refreshing}
            >
              <RefreshIcon />
            </button>
          </div>
        </header>

        {error && status ? (
          <div className="notice">
            <span>Couldn't refresh. Showing the last data we loaded.</span>
            <button type="button" onClick={() => void refresh(true)}>
              Retry
            </button>
          </div>
        ) : null}

        {loading && !status ? <LoadingState /> : null}

        {!loading && !status ? (
          <div className="empty">
            <h2>Couldn't load the status file</h2>
            <p>
              The dashboard reads a JSON snapshot from the data branch. Check
              your connection and try again.
            </p>
            <button
              type="button"
              className="primary-btn"
              onClick={() => void refresh(true)}
            >
              Try again
            </button>
          </div>
        ) : null}

        {status ? (
          <>
            {view === 'overview' ? (
              <Overview
                monitors={status.monitors}
                generatedAt={status.generatedAt}
                onOpen={openMonitor}
              />
            ) : null}
            {view === 'incidents' ? (
              <IncidentsView monitors={status.monitors} />
            ) : null}
            {view === 'about' ? <AboutView /> : null}

            <footer className="foot">
              <span>Checks by GitHub Actions · Dashboard on Vercel</span>
              <a href={REPO_URL} target="_blank" rel="noreferrer">
                View source <ArrowIcon size={12} />
              </a>
            </footer>
          </>
        ) : null}
      </main>

      {selected ? (
        <DetailPanel monitor={selected} onClose={closePanel} />
      ) : null}
    </div>
  )
}
