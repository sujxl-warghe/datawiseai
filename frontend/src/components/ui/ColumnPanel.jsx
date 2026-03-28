import { getDtypeLabel, getDtypeColor, formatNumber } from '../../lib/utils'

export default function ColumnPanel({ columns = [] }) {
  if (!columns.length) return null

  return (
    <div className="space-y-1.5">
      {columns.map((col, i) => {
        const label = getDtypeLabel(col.dtype)
        const colorClass = getDtypeColor(col.dtype)

        return (
          <div
            key={col.name || i}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors"
            style={{ background: 'var(--bg-secondary)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
          >
            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--accent)', opacity: col.missing > 0 ? 0.4 : 1 }} />
            <div className="flex-1 min-w-0">
              <span className="text-xs font-medium truncate block" style={{ color: 'var(--text-primary)' }}>
                {col.name}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {col.missing > 0 && (
                <span className="text-xs text-amber-400">{col.missing} null</span>
              )}
              <span className={`text-xs font-mono ${colorClass}`}>
                {label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
