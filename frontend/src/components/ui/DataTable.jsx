import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpDown, ArrowUp, ArrowDown, Download } from 'lucide-react'
import { downloadCSV } from '../../lib/utils'

export default function DataTable({ columns = [], rows = [], filename = 'data', maxHeight = '420px' }) {
  const [sort, setSort] = useState({ col: null, dir: 'asc' })
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 50

  const sorted = useMemo(() => {
    if (!sort.col) return rows
    return [...rows].sort((a, b) => {
      const av = a[sort.col], bv = b[sort.col]
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv))
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }, [rows, sort])

  const paged = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE)

  const toggleSort = (col) => {
    setSort(s => s.col === col ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' })
    setPage(0)
  }

  if (!columns.length) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {rows.length.toLocaleString()} rows · {columns.length} columns
        </span>
        <button
          onClick={() => downloadCSV(rows, columns, filename + '.csv')}
          className="btn-ghost text-xs py-1.5 px-3"
        >
          <Download size={12} /> Export CSV
        </button>
      </div>

      <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
        <div style={{ maxHeight, overflowY: 'auto', overflowX: 'auto' }}>
          <table className="w-full text-sm border-collapse" style={{ minWidth: columns.length * 130 }}>
            <thead className="sticky top-0 z-10" style={{ background: 'var(--bg-secondary)' }}>
              <tr>
                {columns.map(col => (
                  <th
                    key={col}
                    onClick={() => toggleSort(col)}
                    className="text-left px-4 py-3 font-medium cursor-pointer select-none whitespace-nowrap border-b"
                    style={{
                      color: sort.col === col ? 'var(--accent)' : 'var(--text-secondary)',
                      borderColor: 'var(--border)',
                      fontSize: '11px',
                      letterSpacing: '0.03em',
                      textTransform: 'uppercase',
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      {col}
                      {sort.col === col
                        ? sort.dir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                        : <ArrowUpDown size={11} style={{ opacity: 0.3 }} />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map((row, i) => (
                <tr
                  key={i}
                  className="transition-colors"
                  style={{ borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {columns.map(col => {
                    const val = row[col]
                    return (
                      <td
                        key={col}
                        className="px-4 py-2.5 font-mono text-xs max-w-xs truncate"
                        style={{ color: val == null || val === '' ? 'var(--text-muted)' : 'var(--text-primary)' }}
                        title={val != null ? String(val) : ''}
                      >
                        {val == null || val === '' ? '—' : String(val)}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3 px-1">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="btn-ghost text-xs py-1.5 px-3 disabled:opacity-30"
            >
              Prev
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="btn-ghost text-xs py-1.5 px-3 disabled:opacity-30"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
