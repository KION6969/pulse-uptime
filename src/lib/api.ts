import { STATUS_URL } from '../config'
import type { Check, Monitor, StatusPayload } from '../types'

export interface LoadResult {
  data: StatusPayload
  source: 'live' | 'snapshot'
}

function normalizeCheck(raw: Partial<Check> | null | undefined): Check {
  const code = Number(raw?.code) || 0
  return {
    t: Number(raw?.t) || 0,
    ms: Number(raw?.ms) || 0,
    code,
    ok: typeof raw?.ok === 'boolean' ? raw.ok : code >= 200 && code < 400,
  }
}

function normalizeMonitor(raw: Partial<Monitor>): Monitor {
  const checks = Array.isArray(raw.checks)
    ? raw.checks.map((c) => normalizeCheck(c))
    : []
  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? 'Monitor'),
    url: String(raw.url ?? ''),
    group: raw.group ? String(raw.group) : 'Services',
    checks,
    days: Array.isArray(raw.days) ? raw.days : [],
    incidents: Array.isArray(raw.incidents) ? raw.incidents : [],
    last: raw.last ? normalizeCheck(raw.last) : (checks.at(-1) ?? null),
    uptime24h:
      typeof raw.uptime24h === 'number' ? raw.uptime24h : null,
    uptime30d:
      typeof raw.uptime30d === 'number' ? raw.uptime30d : null,
  }
}

function normalize(raw: unknown): StatusPayload {
  const payload = raw as Partial<StatusPayload>
  if (!payload || !Array.isArray(payload.monitors)) {
    throw new Error('Malformed status payload')
  }
  return {
    generatedAt: Number(payload.generatedAt) || 0,
    monitors: payload.monitors.map((m) => normalizeMonitor(m)),
  }
}

async function getJson(url: string, timeoutMs: number): Promise<unknown> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(`${url}?t=${Date.now()}`, {
      signal: controller.signal,
      cache: 'no-store',
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return await response.json()
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Live data comes from the `data` branch on GitHub. If that is unreachable
 * (first deploy, offline, rate limit) fall back to the snapshot bundled at
 * build time so the dashboard is never blank.
 *
 * In development the order is reversed so `npm run check` shows up immediately
 * instead of being hidden behind the deployed snapshot.
 */
export async function loadStatus(): Promise<LoadResult> {
  const sources = import.meta.env.DEV
    ? [
        { url: '/status.json', source: 'snapshot' as const },
        { url: STATUS_URL, source: 'live' as const },
      ]
    : [
        { url: STATUS_URL, source: 'live' as const },
        { url: '/status.json', source: 'snapshot' as const },
      ]

  for (const candidate of sources) {
    try {
      const data = normalize(await getJson(candidate.url, 8000))
      return { data, source: candidate.source }
    } catch {
      // Try the next source.
    }
  }

  throw new Error('Unable to load the status file')
}
