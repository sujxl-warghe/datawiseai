import { useMemo } from 'react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts'

const COLORS = ['#86efac', '#6ee7b7', '#34d399', '#10b981', '#059669', '#047857']

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg px-3 py-2 text-xs" style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-strong)',
      boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
      color: 'var(--text-primary)',
    }}>
      <p className="font-medium mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.fill || 'var(--accent)' }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  )
}

export default function ResultChart({ data }) {
  const { records, columns } = data

  const { chartData, xKey, yKeys, chartType } = useMemo(() => {
    if (!records?.length || !columns?.length) return { chartData: [], xKey: null, yKeys: [], chartType: 'bar' }

    const numericCols = columns.filter(c => {
      const vals = records.slice(0, 10).map(r => r[c])
      return vals.every(v => v != null && !isNaN(Number(v)))
    })
    const textCols = columns.filter(c => !numericCols.includes(c))

    const xKey = textCols[0] || columns[0]
    const yKeys = numericCols.slice(0, 3)

    if (!yKeys.length) return { chartData: [], xKey, yKeys: [], chartType: 'bar' }

    const chartData = records.slice(0, 20).map(r => {
      const row = { [xKey]: String(r[xKey] ?? '—') }
      yKeys.forEach(k => { row[k] = Number(r[k]) || 0 })
      return row
    })

    const chartType = records.length > 10 ? 'line' : 'bar'
    return { chartData, xKey, yKeys, chartType }
  }, [records, columns])

  if (!chartData.length || !yKeys.length) {
    return (
      <div className="flex items-center justify-center h-40 rounded-xl border text-sm"
        style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'var(--bg-secondary)' }}>
        No numeric data to chart
      </div>
    )
  }

  const axisStyle = { fontSize: 11, fill: 'var(--text-muted)', fontFamily: 'DM Sans' }

  return (
    <div className="rounded-xl border overflow-hidden p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
      <ResponsiveContainer width="100%" height={220}>
        {chartType === 'bar' ? (
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: -12, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey={xKey} tick={axisStyle} tickLine={false} axisLine={false} />
            <YAxis tick={axisStyle} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            {yKeys.map((k, i) => (
              <Bar key={k} dataKey={k} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} maxBarSize={40} />
            ))}
          </BarChart>
        ) : (
          <LineChart data={chartData} margin={{ top: 4, right: 4, left: -12, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey={xKey} tick={axisStyle} tickLine={false} axisLine={false} />
            <YAxis tick={axisStyle} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            {yKeys.map((k, i) => (
              <Line key={k} type="monotone" dataKey={k} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}
