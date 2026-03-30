import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Play, Download, Trash2, ChevronDown, ChevronUp, Lightbulb, RefreshCw } from 'lucide-react'
import { trainModel, listModels, deleteModel, saveModel } from '../lib/api'
import { useMLState } from '../hooks/useMLState'
import FileSelector from '../components/chat/FileSelector'
import ChartImage from '../components/charts/ChartImage'
import MetricsCard from '../components/charts/MetricsCard'
import AlgoComparison from '../components/charts/AlgoComparison'
import { formatRelative } from '../lib/utils'
import toast from 'react-hot-toast'

const BASE_URL = 'https://datawiseai.onrender.com'

const TASK_TYPES = [
  { value: 'classification', label: '🏷️ Classification', desc: 'Predict categories (spam/not spam)' },
  { value: 'regression',     label: '📈 Regression',     desc: 'Predict numbers (price, sales)'    },
  { value: 'clustering',     label: '🔵 Clustering',     desc: 'Group similar rows (no label)'     },
]

const ALGORITHMS = {
  classification: [
    { value: 'auto',                label: '✨ Auto Select (Recommended)' },
    { value: 'random_forest',       label: 'Random Forest'               },
    { value: 'gradient_boosting',   label: 'Gradient Boosting'           },
    { value: 'xgboost',             label: 'XGBoost'                     },
    { value: 'logistic_regression', label: 'Logistic Regression'         },
    { value: 'svm',                 label: 'SVM'                         },
  ],
  regression: [
    { value: 'auto',              label: '✨ Auto Select (Recommended)' },
    { value: 'random_forest',     label: 'Random Forest'               },
    { value: 'gradient_boosting', label: 'Gradient Boosting'           },
    { value: 'xgboost',           label: 'XGBoost'                     },
    { value: 'linear_regression', label: 'Linear Regression'           },
    { value: 'ridge',             label: 'Ridge Regression'            },
  ],
  clustering: [
    { value: 'kmeans_3', label: 'K-Means (3 clusters)' },
    { value: 'kmeans_4', label: 'K-Means (4 clusters)' },
    { value: 'kmeans_5', label: 'K-Means (5 clusters)' },
  ],
}

const CHART_TITLES = {
  confusion_matrix:    'Confusion Matrix',
  metrics_bar:         'Metrics Overview',
  feature_importance:  'Feature Importance',
  roc_curve:           'ROC Curve',
  actual_vs_predicted: 'Actual vs Predicted',
  residuals:           'Residual Plot',
  clusters:            'Cluster Visualization',
}

export default function ML() {
  // Persistent state via localStorage
  const { state, set, reset } = useMLState()
  const {
    selectedFile, taskType, targetCol, featureCols,
    algorithm, autoTune, testSize, result, saved, modelName,
  } = state

  // Transient state (no need to persist)
  const [training,    setTraining]    = useState(false)
  const [pastModels,  setPastModels]  = useState([])
  const [showPast,    setShowPast]    = useState(false)
  const [showSugg,    setShowSugg]    = useState(true)
  const [saveLoading, setSaveLoading] = useState(false)
  const [error,       setError]       = useState(null)

  // charts stored in ref (not localStorage — too large)
  const chartsRef = useRef(result?.charts || null)

  const columns = (selectedFile?.columns || []).map(c => c.name || c)

  useEffect(() => {
    if (selectedFile) loadPastModels()
  }, [selectedFile])

  // When result changes, update chartsRef
  useEffect(() => {
    if (result?.charts) chartsRef.current = result.charts
  }, [result])

  const loadPastModels = async () => {
    if (!selectedFile) return
    try {
      const models = await listModels(selectedFile.file_id)
      setPastModels(Array.isArray(models) ? models : [])
    } catch { setPastModels([]) }
  }

  const handleFileSelect = (file) => {
    // Only reset column selections when file changes, keep other prefs
    set('selectedFile', file)
    set('targetCol', '')
    set('featureCols', [])
    set('result', null)
    set('saved', false)
    chartsRef.current = null
    setError(null)
  }

  const toggleFeature = (col) => {
    if (col === targetCol) return
    const next = featureCols.includes(col)
      ? featureCols.filter(c => c !== col)
      : [...featureCols, col]
    set('featureCols', next)
  }

  const selectAllFeatures = () => {
    set('featureCols', columns.filter(c => c !== targetCol))
  }

  const handleTrain = async () => {
    if (!selectedFile)                           return toast.error('Select a dataset first')
    if (!targetCol && taskType !== 'clustering') return toast.error('Select a target column')
    if (featureCols.length === 0)                return toast.error('Select at least one feature column')

    setTraining(true)
    set('result', null)
    set('saved', false)
    set('modelName', '')
    chartsRef.current = null
    setError(null)

    try {
      const data = await trainModel({
        file_id:      selectedFile.file_id,
        target_col:   targetCol || featureCols[0],
        feature_cols: featureCols,
        task_type:    taskType,
        algorithm,
        test_size:    testSize,
        auto_tune:    autoTune,
      })

      // Store charts in ref, rest in persistent state
      chartsRef.current = data.charts || null
      set('result', { ...data, charts: null })
      toast.success(data.auto_selected ? `Best: ${data.algorithm}` : 'Model trained!')
      loadPastModels()
    } catch (e) {
      setError(e.message)
      toast.error(e.message)
    } finally {
      setTraining(false)
    }
  }

  const handleSave = async () => {
    if (!result) return
    setSaveLoading(true)
    try {
      await saveModel(result.model_id, modelName || null)
      set('saved', true)
      toast.success('Model saved! Find it in Saved Models page.')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaveLoading(false)
    }
  }

  const handleDeleteModel = async (modelId) => {
    try {
      await deleteModel(modelId)
      setPastModels(m => m.filter(x => x.model_id !== modelId))
      toast.success('Model deleted')
    } catch (e) {
      toast.error(e.message)
    }
  }

  // Merge charts back for display
  const displayResult = result
    ? { ...result, charts: chartsRef.current }
    : null

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight mb-1.5" style={{ color: 'var(--text-primary)' }}>
              ML Training
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Train, evaluate and improve machine learning models on your data
            </p>
          </div>
          {(result || selectedFile) && (
            <button onClick={reset} className="btn-ghost text-xs py-1.5 px-3">
              ✕ Reset
            </button>
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── LEFT: Config ── */}
        <div className="lg:col-span-1 space-y-4">

          {/* 1. Dataset */}
          <div className="card p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              1. Select Dataset
            </p>
            <FileSelector selected={selectedFile} onSelect={handleFileSelect} />
          </div>

          {selectedFile && (
            <>
              {/* 2. Task Type */}
              <div className="card p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  2. Task Type
                </p>
                <div className="space-y-2">
                  {TASK_TYPES.map(t => (
                    <button
                      key={t.value}
                      onClick={() => { set('taskType', t.value); set('algorithm', 'auto') }}
                      className="w-full text-left px-3 py-2.5 rounded-xl border transition-all"
                      style={{
                        background:  taskType === t.value ? 'var(--accent-dim)' : 'var(--bg-secondary)',
                        borderColor: taskType === t.value ? 'var(--accent-border)' : 'var(--border)',
                        color:       taskType === t.value ? 'var(--accent)' : 'var(--text-secondary)',
                      }}
                    >
                      <div className="text-sm font-medium">{t.label}</div>
                      <div className="text-xs mt-0.5 opacity-60">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Target Column */}
              {taskType !== 'clustering' && (
                <div className="card p-4 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    3. Target Column
                  </p>
                  <select
                    value={targetCol}
                    onChange={e => {
                      set('targetCol', e.target.value)
                      set('featureCols', featureCols.filter(c => c !== e.target.value))
                    }}
                    className="input-base text-sm"
                  >
                    <option value="">-- Select target --</option>
                    {columns.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}

              {/* 4. Feature Columns */}
              <div className="card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    {taskType !== 'clustering' ? '4.' : '3.'} Feature Columns
                  </p>
                  <button onClick={selectAllFeatures} className="text-xs" style={{ color: 'var(--accent)' }}>
                    Select all
                  </button>
                </div>
                <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
                  {columns.map(col => {
                    const isTarget   = col === targetCol
                    const isSelected = featureCols.includes(col)
                    return (
                      <button
                        key={col}
                        onClick={() => toggleFeature(col)}
                        disabled={isTarget}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-left transition-all"
                        style={{
                          background: isSelected ? 'var(--accent-dim)' : 'var(--bg-secondary)',
                          color:      isTarget ? 'var(--text-muted)' : isSelected ? 'var(--accent)' : 'var(--text-secondary)',
                          opacity:    isTarget ? 0.4 : 1,
                          cursor:     isTarget ? 'not-allowed' : 'pointer',
                        }}
                      >
                        <div className="w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0"
                          style={{
                            borderColor: isSelected ? 'var(--accent)' : 'var(--border)',
                            background:  isSelected ? 'var(--accent)' : 'transparent',
                          }}>
                          {isSelected && <span style={{ color: '#0a2e15', fontSize: 9, fontWeight: 'bold' }}>✓</span>}
                        </div>
                        <span className="truncate">{col}</span>
                        {isTarget && <span className="ml-auto opacity-50">target</span>}
                      </button>
                    )
                  })}
                </div>
                {featureCols.length > 0 && (
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {featureCols.length} feature{featureCols.length > 1 ? 's' : ''} selected
                  </p>
                )}
              </div>

              {/* 5. Algorithm & Options */}
              <div className="card p-4 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  5. Algorithm
                </p>
                <select
                  value={algorithm}
                  onChange={e => set('algorithm', e.target.value)}
                  className="input-base text-sm"
                >
                  {(ALGORITHMS[taskType] || []).map(a => (
                    <option key={a.value} value={a.value}>{a.label}</option>
                  ))}
                </select>

                {/* Auto Tune toggle */}
                <div onClick={() => set('autoTune', !autoTune)}
                  className="flex items-center gap-2.5 cursor-pointer">
                  <div className="w-9 h-5 rounded-full relative transition-colors"
                    style={{ background: autoTune ? 'var(--accent)' : 'var(--bg-hover)' }}>
                    <div className="w-3.5 h-3.5 rounded-full absolute top-0.5 transition-all"
                      style={{ background: 'white', left: autoTune ? '18px' : '2px' }} />
                  </div>
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Auto-tune hyperparameters
                  </span>
                </div>

                {/* Test split */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    <span>Test split</span>
                    <span>{Math.round(testSize * 100)}%</span>
                  </div>
                  <input type="range" min="0.1" max="0.4" step="0.05"
                    value={testSize}
                    onChange={e => set('testSize', parseFloat(e.target.value))}
                    className="w-full" style={{ accentColor: 'var(--accent)' }}
                  />
                </div>
              </div>

              {/* Train Button */}
              <button
                onClick={handleTrain}
                disabled={training || (!targetCol && taskType !== 'clustering') || featureCols.length === 0}
                className="btn-primary w-full justify-center py-3 text-sm"
              >
                {training
                  ? <><RefreshCw size={14} className="animate-spin" /> Training…</>
                  : <><Play size={14} /> Train Model</>
                }
              </button>
            </>
          )}
        </div>

        {/* ── RIGHT: Results ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Empty — no file */}
          {!selectedFile && !training && !displayResult && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-96 text-center card">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: 'var(--accent-dim)' }}>
                <Brain size={26} style={{ color: 'var(--accent)' }} strokeWidth={1.5} />
              </div>
              <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                Select a dataset to begin
              </h2>
              <p className="text-sm max-w-xs" style={{ color: 'var(--text-muted)' }}>
                Configure and train your ML model from the left panel
              </p>
            </motion.div>
          )}

          {/* File selected, not yet trained */}
          {selectedFile && !training && !displayResult && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-72 text-center card">
              <Brain size={22} style={{ color: 'var(--text-muted)' }} className="mb-3" strokeWidth={1.5} />
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                Ready to train
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Configure the left panel and click Train Model
              </p>
              {error && (
                <div className="mt-4 px-4 py-3 rounded-xl text-xs text-red-400 max-w-sm"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  {error}
                </div>
              )}
            </motion.div>
          )}

          {/* Training */}
          {training && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="card p-10 flex flex-col items-center gap-4 text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: 'var(--accent-dim)' }}>
                <RefreshCw size={24} style={{ color: 'var(--accent)' }} className="animate-spin" />
              </div>
              <div>
                <p className="font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  {algorithm === 'auto' ? 'Comparing all algorithms…' : 'Training model…'}
                </p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {autoTune ? 'Auto-tuning hyperparameters — may take a minute' : 'Usually a few seconds'}
                </p>
              </div>
            </motion.div>
          )}

          {/* Results */}
          {displayResult && !training && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">

              {/* Result header */}
              <div className="card p-4 space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {(displayResult.algorithm || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </p>
                      {displayResult.auto_selected && (
                        <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                          Auto Selected
                        </span>
                      )}
                      {displayResult.auto_tuned && (
                        <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24' }}>
                          Auto Tuned
                        </span>
                      )}
                    </div>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Train: {displayResult.train_size} · Test: {displayResult.test_size} · Target: {displayResult.target_col}
                    </p>
                  </div>
                  <a
                    href={`${BASE_URL}/api/ml/models/${selectedFile?.file_id}/${displayResult.model_id}/download`}
                    download className="btn-ghost text-xs py-1.5 px-3 shrink-0">
                    <Download size={12} /> .pkl
                  </a>
                </div>

                {/* Save row */}
                <div className="flex items-center gap-2 pt-1 border-t flex-wrap" style={{ borderColor: 'var(--border)' }}>
                  {!saved ? (
                    <>
                      <input
                        value={modelName}
                        onChange={e => set('modelName', e.target.value)}
                        placeholder="Give this model a name (optional)"
                        className="input-base text-xs py-2"
                        style={{ flex: 1, minWidth: 160 }}
                      />
                      <button
                        onClick={handleSave}
                        disabled={saveLoading}
                        className="btn-primary text-xs py-2 px-4 shrink-0"
                        style={{ background: '#fbbf24', color: '#1a1a00' }}
                      >
                        {saveLoading ? <><RefreshCw size={11} className="animate-spin" /> Saving…</> : '💾 Save Model'}
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--accent)' }}>
                      ✅ Model saved!
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        Available in Saved Models page
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Metrics */}
              <MetricsCard metrics={displayResult.metrics} taskType={displayResult.task_type} />

              {/* Algorithm comparison */}
              {displayResult.algo_comparison && Object.keys(displayResult.algo_comparison).length > 0 && (
                <AlgoComparison scores={displayResult.algo_comparison} best={displayResult.algorithm} />
              )}

              {/* AI Suggestions */}
              {displayResult.suggestions?.length > 0 && (
                <div className="card p-4">
                  <button onClick={() => setShowSugg(s => !s)}
                    className="w-full flex items-center gap-2 text-sm font-semibold"
                    style={{ color: 'var(--text-primary)' }}>
                    <Lightbulb size={14} style={{ color: '#fbbf24' }} />
                    AI Suggestions ({displayResult.suggestions.length})
                    <span className="ml-auto">{showSugg ? <ChevronUp size={13} /> : <ChevronDown size={13} />}</span>
                  </button>
                  {showSugg && (
                    <div className="mt-3 space-y-2">
                      {displayResult.suggestions.map((s, i) => (
                        <div key={i} className="flex gap-2 text-sm px-3 py-2.5 rounded-lg"
                          style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                          <span style={{ color: '#fbbf24', flexShrink: 0 }}>→</span>
                          {s}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Charts */}
              {displayResult.charts && Object.keys(displayResult.charts).length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(displayResult.charts).map(([key, src], i) => (
                    <ChartImage key={key} src={src} title={CHART_TITLES[key] || key} delay={i * 0.07} />
                  ))}
                </div>
              )}

              {/* No charts warning */}
              {(!displayResult.charts || Object.keys(displayResult.charts).length === 0) && (
                <div className="card p-5 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                  Charts are not available after navigating away.
                  <br />
                  <span className="text-xs">Re-train the model to view charts again.</span>
                </div>
              )}
            </motion.div>
          )}

          {/* Past Models */}
          {selectedFile && pastModels.length > 0 && (
            <div className="card p-4">
              <button onClick={() => setShowPast(s => !s)}
                className="w-full flex items-center gap-2 text-sm font-semibold"
                style={{ color: 'var(--text-primary)' }}>
                <Brain size={14} style={{ color: 'var(--text-muted)' }} />
                Past Models ({pastModels.length})
                <span className="ml-auto">{showPast ? <ChevronUp size={13} /> : <ChevronDown size={13} />}</span>
              </button>
              {showPast && (
                <div className="mt-3 space-y-2">
                  {pastModels.map(m => (
                    <div key={m.model_id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                      style={{ background: 'var(--bg-secondary)' }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                          {(m.algorithm || '').replace(/_/g, ' ')} · {m.task_type}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {formatRelative(m.trained_at)} · {m.target_col}
                        </p>
                      </div>
                      {m.metrics?.accuracy != null && (
                        <span className="text-xs font-mono shrink-0" style={{ color: 'var(--accent)' }}>
                          {(m.metrics.accuracy * 100).toFixed(1)}%
                        </span>
                      )}
                      {m.metrics?.r2_score != null && (
                        <span className="text-xs font-mono shrink-0" style={{ color: 'var(--accent)' }}>
                          R²={m.metrics.r2_score}
                        </span>
                      )}
                      <button onClick={() => handleDeleteModel(m.model_id)}
                        className="w-6 h-6 rounded flex items-center justify-center shrink-0"
                        style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
