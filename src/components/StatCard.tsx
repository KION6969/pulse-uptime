import type { ReactNode } from 'react'

interface StatCardProps {
  icon: ReactNode
  label: string
  value: string
  sub: string
  tone?: 'default' | 'danger'
}

export function StatCard({
  icon,
  label,
  value,
  sub,
  tone = 'default',
}: StatCardProps) {
  return (
    <div className={`stat${tone === 'danger' ? ' danger' : ''}`}>
      <div className="stat-top">
        <span className="stat-icon">{icon}</span>
        {label}
      </div>
      <b>{value}</b>
      <small>{sub}</small>
    </div>
  )
}
