export interface Check {
  t: number
  ms: number
  code: number
  ok?: boolean
}

export interface DayStat {
  d: string
  ok: number
  total: number
}

export interface Incident {
  id: string
  start: number
  end: number | null
  code: number
  reason: string
}

export interface Monitor {
  id: string
  name: string
  url: string
  group?: string
  checks: Check[]
  days: DayStat[]
  incidents: Incident[]
  last: Check | null
  uptime24h: number | null
  uptime30d: number | null
}

export interface StatusPayload {
  generatedAt: number
  monitors: Monitor[]
}

export type View = 'overview' | 'incidents' | 'about'

export type Health = 'up' | 'down' | 'pending'
