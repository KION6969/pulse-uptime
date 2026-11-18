import type { Check, Health, Incident, Monitor } from '../types'

export function isCheckOk(check: Check | null | undefined): boolean {
  if (!check) return false
  if (typeof check.ok === 'boolean') return check.ok
  return check.code >= 200 && check.code < 400
}

export function monitorHealth(monitor: Monitor): Health {
  if (!monitor.last) return 'pending'
  return isCheckOk(monitor.last) ? 'up' : 'down'
}

export function overallHealth(monitors: Monitor[]): Health {
  if (!monitors.length || monitors.every((m) => !m.last)) return 'pending'
  return monitors.some((m) => monitorHealth(m) === 'down') ? 'down' : 'up'
}

export function windowChecks(
  checks: Check[],
  seconds: number,
  now = Math.floor(Date.now() / 1000),
): Check[] {
  return checks.filter((c) => c.t >= now - seconds)
}

export function uptimeOf(
  checks: Check[],
  seconds: number,
  now = Math.floor(Date.now() / 1000),
): number | null {
  const window = windowChecks(checks, seconds, now)
  if (!window.length) return null
  const ok = window.filter(isCheckOk).length
  return (ok / window.length) * 100
}

export function averageLatency(
  checks: Check[],
  seconds: number,
  now = Math.floor(Date.now() / 1000),
): number | null {
  const window = windowChecks(checks, seconds, now).filter(
    (c) => isCheckOk(c) && c.ms > 0,
  )
  if (!window.length) return null
  return window.reduce((sum, c) => sum + c.ms, 0) / window.length
}

export function percentileLatency(
  checks: Check[],
  seconds: number,
  percentile: number,
  now = Math.floor(Date.now() / 1000),
): number | null {
  const values = windowChecks(checks, seconds, now)
    .filter(isCheckOk)
    .map((c) => c.ms)
    .sort((a, b) => a - b)
  if (!values.length) return null
  const index = Math.min(
    values.length - 1,
    Math.floor(values.length * percentile),
  )
  return values[index]
}

export interface GlobalStats {
  uptime: number | null
  avg: number | null
  openIncidents: number
  incidents24h: number
  up: number
  total: number
  checks: number
}

export function globalStats(monitors: Monitor[]): GlobalStats {
  const now = Math.floor(Date.now() / 1000)
  const all = monitors.flatMap((m) => windowChecks(m.checks, 86400, now))
  const ok = all.filter(isCheckOk)
  const latencies = ok.filter((c) => c.ms > 0).map((c) => c.ms)
  const openIncidents = monitors.reduce(
    (n, m) => n + m.incidents.filter((i) => !i.end).length,
    0,
  )
  const incidents24h = monitors.reduce(
    (n, m) => n + m.incidents.filter((i) => i.start >= now - 86400).length,
    0,
  )
  return {
    uptime: all.length ? (ok.length / all.length) * 100 : null,
    avg: latencies.length
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length
      : null,
    openIncidents,
    incidents24h,
    up: monitors.filter((m) => monitorHealth(m) === 'up').length,
    total: monitors.length,
    checks: all.length,
  }
}

export type BucketState = 'up' | 'down' | 'partial' | 'none'

export interface Bucket {
  start: number
  state: BucketState
  ok: number
  total: number
}

export function buckets(
  checks: Check[],
  count: number,
  sizeSec: number,
  now = Math.floor(Date.now() / 1000),
): Bucket[] {
  const current = Math.floor(now / sizeSec) * sizeSec
  const first = current - (count - 1) * sizeSec
  const out: Bucket[] = []
  for (let i = 0; i < count; i += 1) {
    const start = first + i * sizeSec
    const inside = checks.filter((c) => c.t >= start && c.t < start + sizeSec)
    const ok = inside.filter(isCheckOk).length
    out.push({
      start,
      state: !inside.length
        ? 'none'
        : ok === inside.length
          ? 'up'
          : ok === 0
            ? 'down'
            : 'partial',
      ok,
      total: inside.length,
    })
  }
  return out
}

export interface IncidentWithMonitor extends Incident {
  monitor: Monitor
}

export function allIncidents(monitors: Monitor[]): IncidentWithMonitor[] {
  return monitors
    .flatMap((monitor) =>
      monitor.incidents.map((incident) => ({ ...incident, monitor })),
    )
    .sort((a, b) => b.start - a.start)
}
