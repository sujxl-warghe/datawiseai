import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { BarChart2, Download, RefreshCw, Shuffle } from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line, ScatterChart, Scatter,
  PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts'
import { previewFile } from '../lib/api'
import FileSelector from '../components/chat/FileSelector'
import toast from 'react-hot-toast'

const CHART_TYPES = [
  { value: 'bar',     label: '📊 Bar',     desc: 'Compare categories'  },
  { value: 'line',    label: '📈 Line',    desc: 'Trends over time'    },
  { value: 'area',    label: '🏔️ Area',    desc: 'Filled line chart'   },
  { value: 'scatter', label: '⚡ Scatter', desc: 'X vs Y relationship' },
  { value: 'pie',     label: '🥧 Pie',     desc: 'Part of a whole'     },
]

const PRESET_PALETTES = [
  { name: 'Emerald',  colors: ['#86efac','#34d399','#10b981','#059669','#047857','#065f46'] },
  { name: 'Ocean',    colors: ['#38bdf8','#0ea5e9','#0284c7','#93c5fd','#6366f1','#8b5cf6'] },
  { name: 'Sunset',   colors: ['#fb923c','#f59e0b','#fbbf24','#f87171','#e879f9','#ec4899'] },
  { name: 'Candy',    colors: ['#f472b6','#a78bfa','#60a5fa','#34d399','#fbbf24','#fb923c'] },
  { name: 'Mono',     colors: ['#f0f0e8','#a0a090','#606058','#333328','#1e1e16','#0f0f0a'] },
  { name: 'Vivid',    colors: ['#ef4444','#3b82f6','#22c55e','#eab308','#8b5cf6','#06b6d4'] },
]

const DEFAULT_COLORS = PRESET_PALETTES[0].colors

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border-strong)',
      borderRadius: 10, padding: '10px 14px', fontSize: 12,
      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
    }}>
      {label && <p style={{ color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>{label}</p>}
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.fill || p.stroke }} />
          <p style={{ color: 'var(--text-primary)' }}>
            {p.name}: <strong>{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</strong>
          </p>
        </div>
      ))}
    </div>
  )
}

const axisStyle = { fontSize: 11, fill: 'var(--text-muted)', fontFamily: 'DM Sans' }

// ── Color Swatch Picker ─────────────────────────────────────────────
function ColorPicker({ label, value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 12, color: 'var(--text-muted)', flex: 1 }}>{label}</span>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 4 }}>
        {/* Color preview circle + native input */}
        <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{
            width: 26, height: 26, borderRadius: 8,
            background: value, border: '2px solid var(--border-strong)',
            cursor: 'pointer', flexShrink: 0,
          }} />
          <input
            type="color"
            value={value}
            onChange={e => onChange(e.target.value)}
            style={{ width: 0, height: 0, padding: 0, border: 'none', opacity: 0, position: 'absolute' }}
          />
          <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)' }}>
            {value}
          </span>
        </label>
      </div>
    </div>
  )
}

export default function ChartBuilder() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [allData,      setAllData]      = useState([])
  const [columns,      setColumns]      = useState([])
  const [numericCols,  setNumericCols]  = useState([])
  const [loading,      setLoading]      = useState(false)

  // Chart config
  const [chartType,    setChartType]    = useState('bar')
  const [xCol,         setXCol]         = useState('')
  const [yCol,         setYCol]         = useState('')
  const [yCol2,        setYCol2]        = useState('')
  const [aggFunc,      setAggFunc]      = useState('sum')
  const [maxBars,      setMaxBars]      = useState(20)
  const [showGrid,     setShowGrid]     = useState(true)
  const [showLegend,   setShowLegend]   = useState(true)
  const [chartTitle,   setChartTitle]   = useState('')

  // Color config
  const [seriesColors,    setSeriesColors]    = useState([DEFAULT_COLORS[0], DEFAULT_COLORS[1]])
  const [pieColors,       setPieColors]       = useState([...DEFAULT_COLORS])
  const [bgColor,         setBgColor]         = useState('#1e1e16')
  const [activePalette,   setActivePalette]   = useState('Emerald')

  const [chartData,    setChartData]    = useState([])

  const loadData = async (file) => {
    setLoading(true)
    try {
      const preview = await previewFile(file.file_id, 500)
      setAllData(preview.rows)
      setColumns(preview.columns)
      const nums = preview.columns.filter(col => {
        const vals = preview.rows.slice(0, 20).map(r => r[col])
        return vals.some(v => v !== '' && v !== null && !isNaN(Number(v)))
      })
      setNumericCols(nums)
      const nonNum = preview.columns.filter(c => !nums.includes(c))
      setXCol(nonNum[0] || preview.columns[0] || '')
      setYCol(nums[0] || '')
      setYCol2('')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (file) => {
    setSelectedFile(file)
    setChartData([])
    loadData(file)
  }

  const applyPalette = (palette) => {
    setActivePalette(palette.name)
    setSeriesColors([palette.colors[0], palette.colors[1]])
    setPieColors([...palette.colors])
  }

  const randomizeColors = () => {
    const rand = () => '#' + Math.floor(Math.random()*0xffffff).toString(16).padStart(6,'0')
    setSeriesColors([rand(), rand()])
    setPieColors(Array.from({ length: 6 }, rand))
    setActivePalette('')
  }

  useEffect(() => {
    if (!allData.length || !xCol || (!yCol && chartType !== 'pie')) return
    buildChartData()
  }, [allData, xCol, yCol, yCol2, aggFunc, maxBars, chartType])

  const buildChartData = useCallback(() => {
    if (!allData.length || !xCol) return

    if (chartType === 'scatter') {
      if (!yCol) return
      const data = allData
        .filter(r => r[xCol] !== '' && r[yCol] !== '')
        .map(r => ({ x: Number(r[xCol]) || 0, y: Number(r[yCol]) || 0 }))
        .slice(0, 200)
      setChartData(data)
      return
    }

    if (chartType === 'pie') {
      const counts = {}
      allData.forEach(r => {
        const k = String(r[xCol] ?? 'Unknown')
        counts[k] = (counts[k] || 0) + 1
      })
      const data = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, value]) => ({ name, value }))
      setChartData(data)
      return
    }

    const grouped = {}
    allData.forEach(r => {
      const key = String(r[xCol] ?? 'Unknown')
      if (!grouped[key]) grouped[key] = { _count: 0, _sum: {}, _vals: {} }
      grouped[key]._count++
      ;[yCol, yCol2].filter(Boolean).forEach(col => {
        const v = Number(r[col])
        if (!isNaN(v)) {
          grouped[key]._sum[col] = (grouped[key]._sum[col] || 0) + v
          if (!grouped[key]._vals[col]) grouped[key]._vals[col] = []
          grouped[key]._vals[col].push(v)
        }
      })
    })

    const data = Object.entries(grouped)
      .map(([name, g]) => {
        const row = { name }
        ;[yCol, yCol2].filter(Boolean).forEach(col => {
          if (aggFunc === 'count') row[col] = g._count
          else if (aggFunc === 'mean') row[col] = g._vals[col]?.length
            ? +(g._sum[col] / g._vals[col].length).toFixed(3) : 0
          else row[col] = +(g._sum[col] || 0).toFixed(3)
        })
        return row
      })
      .sort((a, b) => (b[yCol] || 0) - (a[yCol] || 0))
      .slice(0, maxBars)

    setChartData(data)
  }, [allData, xCol, yCol, yCol2, aggFunc, maxBars, chartType])

  const handleDownload = () => {
    const svgEl = document.querySelector('.recharts-wrapper svg')
    if (!svgEl) return toast.error('No chart to download')
    const clone = svgEl.cloneNode(true)
    clone.setAttribute('style', `background:${bgColor}`)
    const svgData = new XMLSerializer().serializeToString(clone)
    const canvas  = document.createElement('canvas')
    canvas.width  = 1200; canvas.height = 600
    const ctx     = canvas.getContext('2d')
    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, 1200, 600)
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0, 1200, 600)
      const a  = document.createElement('a')
      a.href   = canvas.toDataURL('image/png')
      a.download = `${chartTitle || 'chart'}.png`
      a.click()
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  const yKeys = [yCol, yCol2].filter(Boolean)

  const renderChart = () => {
    if (!chartData.length) return (
      <div className="flex flex-col items-center justify-center h-full gap-3"
        style={{ color: 'var(--text-muted)' }}>
        <BarChart2 size={32} strokeWidth={1.2} />
        <p className="text-sm">Select columns to build your chart</p>
      </div>
    )

    const commonProps = { data: chartData, margin: { top: 10, right: 20, left: 0, bottom: 50 } }

    if (chartType === 'pie') {
      return (
        <PieChart>
          <Pie data={chartData} dataKey="value" nameKey="name"
            cx="50%" cy="48%" outerRadius="65%"
            label={({ name, percent }) => `${name} (${(percent*100).toFixed(0)}%)`}
            labelLine strokeWidth={0}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={pieColors[i % pieColors.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          {showLegend && <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-muted)' }} />}
        </PieChart>
      )
    }

    if (chartType === 'scatter') {
      return (
        <ScatterChart {...commonProps}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />}
          <XAxis dataKey="x" name={xCol} tick={axisStyle} tickLine={false} axisLine={false}
            label={{ value: xCol, position: 'insideBottom', offset: -15, style: { ...axisStyle, fontSize: 12 } }} />
          <YAxis dataKey="y" name={yCol} tick={axisStyle} tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
          <Scatter fill={seriesColors[0]} opacity={0.75} />
        </ScatterChart>
      )
    }

    if (chartType === 'line') {
      return (
        <LineChart {...commonProps}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />}
          <XAxis dataKey="name" tick={axisStyle} tickLine={false} axisLine={false}
            angle={-30} textAnchor="end" interval="preserveStartEnd" />
          <YAxis tick={axisStyle} tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip />} />
          {showLegend && yKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
          {yKeys.map((k, i) => (
            <Line key={k} type="monotone" dataKey={k} stroke={seriesColors[i] || DEFAULT_COLORS[i]}
              strokeWidth={2.5} dot={chartData.length < 30} activeDot={{ r: 5 }} />
          ))}
        </LineChart>
      )
    }

    if (chartType === 'area') {
      return (
        <AreaChart {...commonProps}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />}
          <XAxis dataKey="name" tick={axisStyle} tickLine={false} axisLine={false}
            angle={-30} textAnchor="end" interval="preserveStartEnd" />
          <YAxis tick={axisStyle} tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip />} />
          {showLegend && yKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
          {yKeys.map((k, i) => (
            <Area key={k} type="monotone" dataKey={k}
              stroke={seriesColors[i] || DEFAULT_COLORS[i]}
              fill={seriesColors[i] || DEFAULT_COLORS[i]}
              fillOpacity={0.15} strokeWidth={2.5} />
          ))}
        </AreaChart>
      )
    }

    // Bar
    return (
      <BarChart {...commonProps}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />}
        <XAxis dataKey="name" tick={axisStyle} tickLine={false} axisLine={false}
          angle={-30} textAnchor="end" interval={0} />
        <YAxis tick={axisStyle} tickLine={false} axisLine={false} />
        <Tooltip content={<CustomTooltip />} />
        {showLegend && yKeys.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
        {yKeys.map((k, i) => (
          <Bar key={k} dataKey={k} fill={seriesColors[i] || DEFAULT_COLORS[i]}
            radius={[5, 5, 0, 0]} maxBarSize={52} />
        ))}
      </BarChart>
    )
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight mb-1.5" style={{ color: 'var(--text-primary)' }}>
          Chart Builder
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Build custom charts with full color control
        </p>
      </motion.div>

      <div className="mb-6">
        <FileSelector selected={selectedFile} onSelect={handleFileSelect} />
      </div>

      {!selectedFile && (
        <div className="flex flex-col items-center justify-center py-32 text-center card">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'var(--accent-dim)' }}>
            <BarChart2 size={26} style={{ color: 'var(--accent)' }} strokeWidth={1.5} />
          </div>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Select a dataset</h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Choose a file to start building charts</p>
        </div>
      )}

      {loading && (
        <div className="card p-8 text-center" style={{ color: 'var(--text-muted)' }}>
          <RefreshCw size={20} className="animate-spin mx-auto mb-2" /> Loading dataset…
        </div>
      )}

      {selectedFile && !loading && columns.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* ── LEFT CONFIG ── */}
          <div className="lg:col-span-1 space-y-4 max-h-screen overflow-y-auto pr-1">

            {/* Chart Type */}
            <div className="card p-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                Chart Type
              </p>
              {CHART_TYPES.map(t => (
                <button key={t.value} onClick={() => setChartType(t.value)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all text-sm"
                  style={{
                    background:  chartType === t.value ? 'var(--accent-dim)' : 'var(--bg-secondary)',
                    borderColor: chartType === t.value ? 'var(--accent-border)' : 'var(--border)',
                    color:       chartType === t.value ? 'var(--accent)' : 'var(--text-secondary)',
                  }}>
                  <span>{t.label}</span>
                  <span className="text-xs opacity-50 ml-auto">{t.desc}</span>
                </button>
              ))}
            </div>

            {/* Axes */}
            <div className="card p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                {chartType === 'pie' ? 'Category' : 'Axes'}
              </p>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>
                  {chartType === 'scatter' ? 'X (numeric)' : chartType === 'pie' ? 'Category Column' : 'X Axis'}
                </label>
                <select value={xCol} onChange={e => setXCol(e.target.value)} className="input-base text-sm">
                  <option value="">-- Select --</option>
                  {columns.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {chartType !== 'pie' && (
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Y Axis</label>
                  <select value={yCol} onChange={e => setYCol(e.target.value)} className="input-base text-sm">
                    <option value="">-- Select --</option>
                    {numericCols.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}
              {['bar','line','area'].includes(chartType) && (
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Y2 (optional)</label>
                  <select value={yCol2} onChange={e => setYCol2(e.target.value)} className="input-base text-sm">
                    <option value="">-- None --</option>
                    {numericCols.filter(c => c !== yCol).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}
            </div>

            {/* Aggregation */}
            {!['scatter','pie'].includes(chartType) && (
              <div className="card p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Aggregation
                </p>
                <div className="flex gap-1">
                  {[['sum','Sum'],['mean','Mean'],['count','Count']].map(([v,l]) => (
                    <button key={v} onClick={() => setAggFunc(v)}
                      className="flex-1 py-1.5 text-xs rounded-lg border transition-all"
                      style={{
                        background:  aggFunc === v ? 'var(--accent-dim)' : 'var(--bg-secondary)',
                        borderColor: aggFunc === v ? 'var(--accent-border)' : 'var(--border)',
                        color:       aggFunc === v ? 'var(--accent)' : 'var(--text-muted)',
                      }}>{l}</button>
                  ))}
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>
                    Max items: {maxBars}
                  </label>
                  <input type="range" min="5" max="50" value={maxBars}
                    onChange={e => setMaxBars(Number(e.target.value))}
                    className="w-full" style={{ accentColor: 'var(--accent)' }} />
                </div>
              </div>
            )}

            {/* ── COLOR SECTION ── */}
            <div className="card p-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  🎨 Colors
                </p>
                <button onClick={randomizeColors}
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors"
                  style={{ color: 'var(--text-muted)', background: 'var(--bg-hover)' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                  <Shuffle size={11} /> Random
                </button>
              </div>

              {/* Preset Palettes */}
              <div>
                <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Presets</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {PRESET_PALETTES.map(palette => (
                    <button key={palette.name} onClick={() => applyPalette(palette)}
                      className="rounded-lg overflow-hidden border-2 transition-all"
                      style={{ borderColor: activePalette === palette.name ? 'var(--accent)' : 'transparent' }}
                      title={palette.name}>
                      <div style={{ display: 'flex', height: 20 }}>
                        {palette.colors.slice(0, 4).map((c, i) => (
                          <div key={i} style={{ flex: 1, background: c }} />
                        ))}
                      </div>
                      <p style={{ fontSize: 9, textAlign: 'center', padding: '2px 0',
                        background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                        {palette.name}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Series Colors */}
              {chartType !== 'pie' && (
                <div className="space-y-2">
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Series Colors</p>
                  <ColorPicker
                    label={yCol || 'Series 1'}
                    value={seriesColors[0]}
                    onChange={v => setSeriesColors(c => [v, c[1]])}
                  />
                  {yCol2 && (
                    <ColorPicker
                      label={yCol2}
                      value={seriesColors[1]}
                      onChange={v => setSeriesColors(c => [c[0], v])}
                    />
                  )}
                </div>
              )}

              {/* Pie Colors */}
              {chartType === 'pie' && (
                <div className="space-y-2">
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Slice Colors</p>
                  {pieColors.slice(0, 6).map((c, i) => (
                    <ColorPicker
                      key={i}
                      label={chartData[i]?.name || `Slice ${i+1}`}
                      value={c}
                      onChange={v => setPieColors(cols => cols.map((col, idx) => idx === i ? v : col))}
                    />
                  ))}
                </div>
              )}

              {/* Background Color */}
              <div className="pt-1 border-t" style={{ borderColor: 'var(--border)' }}>
                <ColorPicker label="Background" value={bgColor} onChange={setBgColor} />
              </div>
            </div>

            {/* Display options */}
            <div className="card p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Display
              </p>
              <input value={chartTitle} onChange={e => setChartTitle(e.target.value)}
                placeholder="Chart title…" className="input-base text-sm" />
              {[
                [showGrid,   setShowGrid,   'Grid lines'],
                [showLegend, setShowLegend, 'Legend'],
              ].map(([val, setter, label]) => (
                <div key={label} onClick={() => setter(v => !v)}
                  className="flex items-center gap-2.5 cursor-pointer">
                  <div className="w-8 h-4 rounded-full relative transition-colors"
                    style={{ background: val ? 'var(--accent)' : 'var(--bg-hover)' }}>
                    <div className="w-3 h-3 rounded-full absolute top-0.5 transition-all"
                      style={{ background: 'white', left: val ? '17px' : '2px' }} />
                  </div>
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT: CHART ── */}
          <div className="lg:col-span-3">
            <div className="card overflow-hidden" style={{ height: 520 }}>
              <div className="flex items-center justify-between px-5 py-3 border-b"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {chartTitle || (xCol && yCol ? `${yCol} by ${xCol}` : 'Chart Preview')}
                </p>
                <div className="flex items-center gap-3">
                  {chartData.length > 0 && (
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {chartData.length} data points
                    </span>
                  )}
                  <button onClick={handleDownload} disabled={!chartData.length}
                    className="btn-ghost text-xs py-1 px-2.5 disabled:opacity-30">
                    <Download size={11} /> PNG
                  </button>
                </div>
              </div>

              <div style={{ height: 460, padding: '16px 8px 8px', background: bgColor, transition: 'background 0.3s' }}>
                <ResponsiveContainer width="100%" height="100%">
                  {renderChart()}
                </ResponsiveContainer>
              </div>
            </div>

            {/* Summary stats */}
            {chartData.length > 0 && !['scatter','pie'].includes(chartType) && yCol && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-4 gap-3 mt-4">
                {(() => {
                  const vals   = chartData.map(d => d[yCol]).filter(v => v != null)
                  const sum    = vals.reduce((a,b) => a+b, 0)
                  const avg    = sum / vals.length
                  const mx     = Math.max(...vals)
                  const topRow = chartData.find(d => d[yCol] === mx)
                  return [
                    { label: 'Total',    val: sum.toLocaleString(undefined, { maximumFractionDigits: 2 }) },
                    { label: 'Average',  val: avg.toLocaleString(undefined, { maximumFractionDigits: 2 }) },
                    { label: 'Maximum',  val: mx.toLocaleString(undefined,  { maximumFractionDigits: 2 }) },
                    { label: 'Top Item', val: topRow?.name || '—' },
                  ].map(({ label, val }) => (
                    <div key={label} className="card p-3 text-center">
                      <div className="text-base font-bold mb-0.5 truncate"
                        style={{ color: 'var(--accent)' }}>{val}</div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</div>
                    </div>
                  ))
                })()}
              </motion.div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

