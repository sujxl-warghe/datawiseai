import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, RefreshCw, AlertTriangle, CheckCircle, Info } from 'lucide-react'
import { learningCurve } from '../lib/api'
import FileSelector from '../components/chat/FileSelector'
import ChartImage from '../components/charts/ChartImage'
import toast from 'react-hot-toast'

const ALGO_OPTIONS = {
  classification: [
    { value: 'random_forest',       label: 'Random Forest'       },
    { value: 'gradient_boosting',   label: 'Gradient Boosting'   },
    { value: 'logistic_regression', label: 'Logistic Regression' },
    { value: 'xgboost',             label: 'XGBoost'             },
    { value: 'svm',                 label: 'SVM'                 },
  ],
  regression: [
    { value: 'random_forest',     label: 'Random Forest'     },
    { value: 'gradient_boosting', label: 'Gradient Boosting' },
    { value: 'linear_regression', label: 'Linear Regression' },
    { value: 'xgboost',           label: 'XGBoost'           },
    { value: 'ridge',             label: 'Ridge'             },
  ],
}

const DIAGNOSIS_INFO = {
  overfitting: {
    icon: AlertTriangle,
    color: '#f87171',
    bg:    'rgba(248,113,113,0.08)',
    border:'rgba(248,113,113,0.25)',
    label: '⚠️ Overfitting Detected',
    desc:  'Model memorizes training data but fails on new data. Training score is much higher than validation score.',
    fixes: [
      'Reduce model complexity (fewer trees / smaller depth)',
      'Add more training data if possible',
      'Use regularization (Ridge, Lasso)',
      'Remove irrelevant features',
      'Try cross-validation with more folds',
    ],
  },
  underfitting: {
    icon: AlertTriangle,
    color: '#fbbf24',
    bg:    'rgba(251,191,36,0.08)',
    border:'rgba(251,191,36,0.25)',
    label: '⚠️ Underfitting Detected',
    desc:  'Model is too simple to capture patterns. Both training and validation scores are low.',
    fixes: [
      'Try a more complex algorithm (XGBoost, Gradient Boosting)',
      'Add more relevant features',
      'Increase model depth / estimators',
      'Run Feature Engineering to create better features',
      'Check if target column is correct',
    ],
  },
  good_fit: {
    icon: CheckCircle,
    color: '#86efac',
    bg:    'rgba(134,239,172,0.08)',
    border:'rgba(134,239,172,0.25)',
    label: '✅ Good Fit',
    desc:  'Training and validation scores are close and reasonably high. Model is learning well!',
    fixes: [
      'Try Auto-tune to squeeze out more performance',
      'Compare with other algorithms in Model Comparison',
      'Add more data for even better results',
      'Consider saving and deploying this model',
    ],
  },
}

export default function LearningCurve() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [taskType,     setTaskType]     = useState('classification')
  const [targetCol,    setTargetCol]    = useState('')
  const [featureCols,  setFeatureCols]  = useState([])
  const [algorithm,    setAlgorithm]    = useState('random_forest')
  const [loading,      setLoading]      = useState(false)
  const [result,       setResult]       = useState(null)
  const [error,        setError]        = useState(null)

  const columns = (selectedFile?.columns || []).map(c => c.name || c)

  useEffect(() => {
    if (selectedFile) { setResult(null); setTargetCol(''); setFeatureCols([]) }
  }, [selectedFile])

  useEffect(() => {
    setAlgorithm('random_forest')
  }, [taskType])

  const toggleFeature = (col) => {
    if (col === targetCol) return
    setFeatureCols(p => p.includes(col) ? p.filter(c => c !== col) : [...p, col])
  }

  const selectAll = () => setFeatureCols(columns.filter(c => c !== targetCol))

  const handleGenerate = async () => {
    if (!selectedFile)          return toast.error('Select a dataset')
    if (!targetCol)             return toast.error('Select target column')
    if (!featureCols.length)    return toast.error('Select feature columns')

    setLoading(true)
    setResult(null)
    setError(null)
    try {
      const data = await learningCurve({
        file_id:      selectedFile.file_id,
        target_col:   targetCol,
        feature_cols: featureCols,
        task_type:    taskType,
        algorithm,
      })
      setResult(data)
    } catch (e) {
      setError(e.message)
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  const diag = result ? DIAGNOSIS_INFO[result.diagnosis] || DIAGNOSIS_INFO.good_fit : null

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight mb-1.5" style={{ color: 'var(--text-primary)' }}>
          Learning Curve
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Detect overfitting & underfitting — visualize how your model learns with more data
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
                {['classification','regression'].map(t => (
                  <button key={t} onClick={() => setTaskType(t)}
                    className="w-full text-left px-3 py-2 rounded-xl border transition-all text-sm capitalize"
                    style={{
                      background:  taskType === t ? 'var(--accent-dim)' : 'var(--bg-secondary)',
                      borderColor: taskType === t ? 'var(--accent-border)' : 'var(--border)',
                      color:       taskType === t ? 'var(--accent)' : 'var(--text-secondary)',
                    }}>
                    {t === 'classification' ? '🏷️ Classification' : '📈 Regression'}
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
                  <button onClick={selectAll} className="text-xs" style={{ color: 'var(--accent)' }}>All</button>
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
                          opacity:    isTarget ? 0.4 : 1,
                          cursor:     isTarget ? 'not-allowed' : 'pointer',
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
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{featureCols.length} selected</p>
                )}
              </div>

              {/* Algorithm */}
              <div className="card p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  5. Algorithm
                </p>
                <select value={algorithm} onChange={e => setAlgorithm(e.target.value)}
                  className="input-base text-sm">
                  {(ALGO_OPTIONS[taskType] || []).map(a => (
                    <option key={a.value} value={a.value}>{a.label}</option>
                  ))}
                </select>
              </div>

              {/* Generate button */}
              <button onClick={handleGenerate}
                disabled={loading || !targetCol || !featureCols.length}
                className="btn-primary w-full justify-center py-3 text-sm">
                {loading
                  ? <><RefreshCw size={14} className="animate-spin" /> Generating…</>
                  : <><TrendingUp size={14} /> Generate Learning Curve</>
                }
              </button>
              {loading && (
                <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                  Running 5-fold cross-validation × 10 training sizes…
                </p>
              )}
            </>
          )}
        </div>

        {/* ── RIGHT: RESULTS ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Empty */}
          {!selectedFile && (
            <div className="flex flex-col items-center justify-center h-96 text-center card">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: 'var(--accent-dim)' }}>
                <TrendingUp size={26} style={{ color: 'var(--accent)' }} strokeWidth={1.5} />
              </div>
              <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                Select a dataset
              </h2>
              <p className="text-sm max-w-xs" style={{ color: 'var(--text-muted)' }}>
                Learning curve shows how your model improves as it sees more training data
              </p>
            </div>
          )}

          {selectedFile && !loading && !result && (
            <div className="flex flex-col items-center justify-center h-72 text-center card">
              <TrendingUp size={22} style={{ color: 'var(--text-muted)' }} className="mb-3" strokeWidth={1.5} />
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Ready</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Configure options and click Generate
              </p>
              {error && (
                <div className="mt-4 px-4 py-2 rounded-xl text-xs text-red-400 max-w-sm"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="card p-10 flex flex-col items-center gap-4 text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: 'var(--accent-dim)' }}>
                <RefreshCw size={24} style={{ color: 'var(--accent)' }} className="animate-spin" />
              </div>
              <div>
                <p className="font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Generating learning curve…
                </p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Training model at 10 different data sizes with 5-fold CV
                </p>
              </div>
            </div>
          )}

          {/* Results */}
          {result && !loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">

              {/* Chart */}
              <ChartImage src={result.chart} title="Learning Curve" />

              {/* Score Summary */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Final Train Score', val: `${(result.final_train * 100).toFixed(1)}%`, color: 'var(--accent)' },
                  { label: 'Final Val Score',   val: `${(result.final_val   * 100).toFixed(1)}%`, color: '#fbbf24'       },
                  { label: 'Gap (Train - Val)', val: `${(result.gap         * 100).toFixed(1)}%`,
                    color: result.gap > 0.15 ? '#f87171' : result.gap > 0.08 ? '#fbbf24' : 'var(--accent)' },
                ].map(({ label, val, color }) => (
                  <div key={label} className="card p-4 text-center">
                    <div className="text-xl font-bold mb-1" style={{ color }}>{val}</div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Diagnosis */}
              {diag && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="rounded-2xl p-5"
                  style={{ background: diag.bg, border: `1px solid ${diag.border}` }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <diag.icon size={16} style={{ color: diag.color }} />
                    <p className="font-semibold text-sm" style={{ color: diag.color }}>
                      {diag.label}
                    </p>
                  </div>
                  <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                    {diag.desc}
                  </p>
                  <div>
                    <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
                      💡 How to fix:
                    </p>
                    <div className="space-y-1.5">
                      {diag.fixes.map((fix, i) => (
                        <div key={i} className="flex gap-2 text-xs"
                          style={{ color: 'var(--text-secondary)' }}>
                          <span style={{ color: diag.color, flexShrink: 0 }}>→</span>
                          {fix}
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* What is learning curve — info box */}
              <div className="rounded-xl p-4 flex gap-3"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <Info size={14} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: 1 }} />
                <div className="text-xs space-y-1.5" style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}>
                  <p><strong style={{ color: 'var(--text-secondary)' }}>Green line (Training):</strong> How well model performs on training data</p>
                  <p><strong style={{ color: 'var(--text-secondary)' }}>Yellow line (Validation):</strong> How well model generalizes to unseen data</p>
                  <p><strong style={{ color: 'var(--text-secondary)' }}>Good model:</strong> Both lines converge to a high score with minimal gap</p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
