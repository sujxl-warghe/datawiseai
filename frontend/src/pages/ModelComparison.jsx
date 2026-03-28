import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Play, RefreshCw, ChevronDown, ChevronUp, Zap } from 'lucide-react'
import { compareModels, getFile } from '../lib/api'
import FileSelector from '../components/chat/FileSelector'
import toast from 'react-hot-toast'

const ALGO_LABELS = {
  random_forest:       'Random Forest',
  gradient_boosting:   'Gradient Boosting',
  logistic_regression: 'Logistic Regression',
  linear_regression:   'Linear Regression',
  xgboost:             'XGBoost',
  svm:                 'SVM',
  ridge:               'Ridge',
}

const TASK_TYPES = [
  { value: 'classification', label: '🏷️ Classification' },
  { value: 'regression',     label: '📈 Regression'     },
]

const METRIC_KEYS = {
  classification: [
    { key: 'accuracy',  label: 'Accuracy',  pct: true  },
    { key: 'f1_score',  label: 'F1 Score',  pct: true  },
    { key: 'precision', label: 'Precision', pct: true  },
    { key: 'recall',    label: 'Recall',    pct: true  },
    { key: 'cv_mean',   label: 'CV Mean',   pct: true  },
  ],
  regression: [
    { key: 'r2_score',  label: 'R²',    pct: true  },
    { key: 'mae',       label: 'MAE',   pct: false },
    { key: 'rmse',      label: 'RMSE',  pct: false },
    { key: 'cv_mean',   label: 'CV R²', pct: true  },
  ],
}

// Medal colors
const MEDALS = ['🥇','🥈','🥉']
const RANK_COLORS = [
  { bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.3)', text: '#fbbf24' },
  { bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.2)', text: '#94a3b8' },
  { bg: 'rgba(180,120,60,0.1)',  border: 'rgba(180,120,60,0.2)',  text: '#b4783c' },
]

export default function ModelComparison() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [taskType,     setTaskType]     = useState('classification')
  const [targetCol,    setTargetCol]    = useState('')
  const [featureCols,  setFeatureCols]  = useState([])
  const [testSize,     setTestSize]     = useState(0.2)
  const [comparing,    setComparing]    = useState(false)
  const [results,      setResults]      = useState(null)
  const [sortKey,      setSortKey]      = useState('primary')
  const [showDetails,  setShowDetails]  = useState(null)

  const columns = (selectedFile?.columns || []).map(c => c.name || c)

  useEffect(() => {
    if (selectedFile) {
      setResults(null)
      setTargetCol('')
      setFeatureCols([])
    }
  }, [selectedFile])

  const toggleFeature = (col) => {
    if (col === targetCol) return
    setFeatureCols(p => p.includes(col) ? p.filter(c => c !== col) : [...p, col])
  }

  const selectAll = () => setFeatureCols(columns.filter(c => c !== targetCol))

  const handleCompare = async () => {
    if (!selectedFile)   return toast.error('Select a dataset')
    if (!targetCol && taskType !== 'clustering') return toast.error('Select target column')
    if (!featureCols.length) return toast.error('Select feature columns')

    setComparing(true)
    setResults(null)
    try {
      const data = await compareModels({
        file_id:      selectedFile.file_id,
        target_col:   targetCol,
        feature_cols: featureCols,
        task_type:    taskType,
        test_size:    testSize,
      })
      setResults(data)
      toast.success(`Compared ${data.results.length} algorithms!`)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setComparing(false)
    }
  }

  const sortedResults = results
    ? [...results.results].sort((a, b) => {
        if (sortKey === 'train_time') return a.train_time - b.train_time
        const ma = a.metrics[sortKey] ?? a.primary
        const mb = b.metrics[sortKey] ?? b.primary
        return mb - ma
      })
    : []

  const metrics = METRIC_KEYS[taskType] || METRIC_KEYS.classification
  const primaryKey = taskType === 'classification' ? 'accuracy' : 'r2_score'

  // Bar width for visual comparison
  const maxPrimary = results ? Math.max(...results.results.map(r => r.primary)) : 1

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight mb-1.5" style={{ color: 'var(--text-primary)' }}>
          Model Comparison
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Compare all algorithms side-by-side and pick the best one
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── LEFT CONFIG ── */}
        <div className="lg:col-span-1 space-y-4">

          {/* Dataset */}
          <div className="card p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              1. Dataset
            </p>
            <FileSelector selected={selectedFile} onSelect={setSelectedFile} />
          </div>

          {selectedFile && (
            <>
              {/* Task type */}
              <div className="card p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  2. Task Type
                </p>
                {TASK_TYPES.map(t => (
                  <button key={t.value} onClick={() => setTaskType(t.value)}
                    className="w-full text-left px-3 py-2.5 rounded-xl border transition-all text-sm"
                    style={{
                      background:  taskType === t.value ? 'var(--accent-dim)' : 'var(--bg-secondary)',
                      borderColor: taskType === t.value ? 'var(--accent-border)' : 'var(--border)',
                      color:       taskType === t.value ? 'var(--accent)' : 'var(--text-secondary)',
                    }}>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Target */}
              <div className="card p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  3. Target Column
                </p>
                <select value={targetCol}
                  onChange={e => { setTargetCol(e.target.value); setFeatureCols(f => f.filter(c => c !== e.target.value)) }}
                  className="input-base text-sm">
                  <option value="">-- Select target --</option>
                  {columns.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Features */}
              <div className="card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    4. Features
                  </p>
                  <button onClick={selectAll} className="text-xs" style={{ color: 'var(--accent)' }}>
                    All
                  </button>
                </div>
                <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
                  {columns.map(col => {
                    const isTarget   = col === targetCol
                    const isSelected = featureCols.includes(col)
                    return (
                      <button key={col} onClick={() => toggleFeature(col)} disabled={isTarget}
                        className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-left transition-all"
                        style={{
                          background: isSelected ? 'var(--accent-dim)' : 'var(--bg-secondary)',
                          color:      isTarget ? 'var(--text-muted)' : isSelected ? 'var(--accent)' : 'var(--text-secondary)',
                          opacity:    isTarget ? 0.4 : 1, cursor: isTarget ? 'not-allowed' : 'pointer',
                        }}>
                        <div className="w-3 h-3 rounded border flex items-center justify-center shrink-0"
                          style={{ borderColor: isSelected ? 'var(--accent)' : 'var(--border)', background: isSelected ? 'var(--accent)' : 'transparent' }}>
                          {isSelected && <span style={{ color: '#0a2e15', fontSize: 8, fontWeight: 'bold' }}>✓</span>}
                        </div>
                        <span className="truncate">{col}</span>
                      </button>
                    )
                  })}
                </div>
                {featureCols.length > 0 && (
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {featureCols.length} selected
                  </p>
                )}
              </div>

              {/* Test split */}
              <div className="card p-4 space-y-2">
                <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span>Test split</span><span>{Math.round(testSize * 100)}%</span>
                </div>
                <input type="range" min="0.1" max="0.4" step="0.05" value={testSize}
                  onChange={e => setTestSize(parseFloat(e.target.value))}
                  className="w-full" style={{ accentColor: 'var(--accent)' }} />
              </div>

              {/* Compare button */}
              <button onClick={handleCompare}
                disabled={comparing || !targetCol || !featureCols.length}
                className="btn-primary w-full justify-center py-3 text-sm">
                {comparing
                  ? <><RefreshCw size={14} className="animate-spin" /> Comparing all algorithms…</>
                  : <><Trophy size={14} /> Compare All Models</>
                }
              </button>

              {comparing && (
                <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                  Training all algorithms — may take 30–60 seconds
                </p>
              )}
            </>
          )}
        </div>

        {/* ── RIGHT: RESULTS ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Empty state */}
          {!selectedFile && (
            <div className="flex flex-col items-center justify-center h-96 text-center card">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: 'var(--accent-dim)' }}>
                <Trophy size={26} style={{ color: 'var(--accent)' }} strokeWidth={1.5} />
              </div>
              <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                Select a dataset to compare
              </h2>
              <p className="text-sm max-w-xs" style={{ color: 'var(--text-muted)' }}>
                All algorithms will be trained and ranked automatically
              </p>
            </div>
          )}

          {selectedFile && !comparing && !results && (
            <div className="flex flex-col items-center justify-center h-72 text-center card">
              <Trophy size={22} style={{ color: 'var(--text-muted)' }} className="mb-3" strokeWidth={1.5} />
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Ready to compare</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Configure options and click Compare All Models
              </p>
            </div>
          )}

          {/* Loading */}
          {comparing && (
            <div className="card p-10 flex flex-col items-center gap-4 text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: 'var(--accent-dim)' }}>
                <RefreshCw size={24} style={{ color: 'var(--accent)' }} className="animate-spin" />
              </div>
              <div>
                <p className="font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Training all algorithms…
                </p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Random Forest, Gradient Boosting, XGBoost, SVM and more
                </p>
              </div>
              {/* Animated algo list */}
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {Object.values(ALGO_LABELS).map((name, i) => (
                  <motion.span key={name}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.5, delay: i * 0.2, repeat: Infinity }}
                    className="text-xs px-2.5 py-1 rounded-full"
                    style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
                    {name}
                  </motion.span>
                ))}
              </div>
            </div>
          )}

          {/* Results */}
          {results && !comparing && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">

              {/* Summary header */}
              <div className="card p-4 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    🏆 Best: {ALGO_LABELS[results.best] || results.best}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {results.results.length} algorithms compared · Train: {results.train_size} · Test: {results.test_size}
                  </p>
                </div>
                {/* Sort selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Sort by:</span>
                  <select value={sortKey} onChange={e => setSortKey(e.target.value)}
                    className="text-xs px-2 py-1.5 rounded-lg border"
                    style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                    {metrics.map(m => (
                      <option key={m.key} value={m.key}>{m.label}</option>
                    ))}
                    <option value="train_time">Train Time</option>
                  </select>
                </div>
              </div>

              {/* Comparison bars */}
              <div className="card p-5 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider mb-4"
                  style={{ color: 'var(--text-muted)' }}>
                  {taskType === 'classification' ? 'Accuracy' : 'R² Score'} Comparison
                </p>
                {sortedResults.map((r, i) => {
                  const rankColor = RANK_COLORS[i] || { bg: 'transparent', border: 'var(--border)', text: 'var(--text-muted)' }
                  const barPct = maxPrimary > 0 ? (r.primary / maxPrimary) * 100 : 0
                  const isBest = r.algorithm === results.best
                  return (
                    <div key={r.algorithm}>
                      <div className="flex items-center gap-3 mb-1.5">
                        <span className="text-sm w-5 shrink-0">{MEDALS[i] || `${i+1}.`}</span>
                        <span className="text-sm font-medium flex-1" style={{ color: isBest ? 'var(--accent)' : 'var(--text-primary)' }}>
                          {ALGO_LABELS[r.algorithm] || r.algorithm}
                        </span>
                        <span className="text-sm font-mono font-bold shrink-0" style={{ color: isBest ? 'var(--accent)' : 'var(--text-secondary)' }}>
                          {r.primary >= 0 ? `${(r.primary * 100).toFixed(1)}%` : r.primary.toFixed(4)}
                        </span>
                        <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>
                          {r.train_time}s
                        </span>
                      </div>
                      <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-hover)' }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${barPct}%` }}
                          transition={{ duration: 0.6, delay: i * 0.08 }}
                          className="h-full rounded-full"
                          style={{ background: isBest ? 'var(--accent)' : 'var(--text-muted)', opacity: isBest ? 1 : 0.45 }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Detailed metrics table */}
              <div className="card overflow-hidden">
                <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    Detailed Metrics
                  </p>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: 'var(--bg-secondary)' }}>
                      <tr>
                        <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)',
                          fontWeight: 600, borderBottom: '1px solid var(--border)' }}>Algorithm</th>
                        {metrics.map(m => (
                          <th key={m.key} style={{ padding: '10px 12px', textAlign: 'center', fontSize: 11,
                            color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)',
                            whiteSpace: 'nowrap' }}>
                            {m.label}
                          </th>
                        ))}
                        <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 11,
                          color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>
                          Time
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedResults.map((r, i) => {
                        const isBest = r.algorithm === results.best
                        return (
                          <tr key={r.algorithm}
                            style={{
                              borderBottom: '1px solid var(--border)',
                              background: isBest ? 'rgba(134,239,172,0.04)' : 'transparent',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                            onMouseLeave={e => e.currentTarget.style.background = isBest ? 'rgba(134,239,172,0.04)' : 'transparent'}
                          >
                            <td style={{ padding: '10px 16px' }}>
                              <div className="flex items-center gap-2">
                                <span style={{ fontSize: 14 }}>{MEDALS[i] || ''}</span>
                                <span style={{ fontSize: 13, fontWeight: isBest ? 600 : 400,
                                  color: isBest ? 'var(--accent)' : 'var(--text-primary)' }}>
                                  {ALGO_LABELS[r.algorithm] || r.algorithm}
                                </span>
                              </div>
                            </td>
                            {metrics.map(m => {
                              const val = r.metrics[m.key]
                              const display = val == null ? '—'
                                : m.pct ? `${(val * 100).toFixed(1)}%`
                                : val.toFixed(4)
                              // Highlight best value in each column
                              const colVals = sortedResults.map(x => x.metrics[m.key]).filter(v => v != null)
                              const isBestCol = m.key !== 'mae' && m.key !== 'rmse'
                                ? val === Math.max(...colVals)
                                : val === Math.min(...colVals)
                              return (
                                <td key={m.key} style={{ padding: '10px 12px', textAlign: 'center',
                                  fontSize: 12, fontFamily: 'monospace',
                                  color: isBestCol ? 'var(--accent)' : 'var(--text-secondary)',
                                  fontWeight: isBestCol ? 700 : 400,
                                }}>
                                  {display}
                                </td>
                              )
                            })}
                            <td style={{ padding: '10px 12px', textAlign: 'center',
                              fontSize: 11, color: 'var(--text-muted)' }}>
                              {r.train_time}s
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Winner card */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="rounded-2xl p-5 flex items-center gap-4"
                style={{ background: 'rgba(134,239,172,0.06)', border: '1px solid var(--accent-border)' }}
              >
                <div className="text-3xl">🏆</div>
                <div className="flex-1">
                  <p className="font-semibold mb-0.5" style={{ color: 'var(--accent)' }}>
                    Recommended: {ALGO_LABELS[results.best] || results.best}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Highest {taskType === 'classification' ? 'accuracy' : 'R²'} score across all algorithms.
                    Go to ML Training, select this algorithm and train your final model.
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>
                    {results.results[0]
                      ? `${(results.results[0].primary * 100).toFixed(1)}%`
                      : '—'}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {taskType === 'classification' ? 'Accuracy' : 'R² Score'}
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
