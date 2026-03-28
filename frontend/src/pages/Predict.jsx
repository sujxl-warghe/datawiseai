import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, RefreshCw, Download, ChevronDown, Brain, AlertCircle, Plus, Trash2 } from 'lucide-react'
import { listSavedModels, predictModel } from '../lib/api'
import { downloadCSV } from '../lib/utils'
import { formatRelative } from '../lib/utils'
import toast from 'react-hot-toast'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const TASK_COLORS = {
  classification: { bg: 'rgba(134,239,172,0.1)', color: '#86efac' },
  regression:     { bg: 'rgba(251,191,36,0.1)',  color: '#fbbf24' },
  clustering:     { bg: 'rgba(147,197,253,0.1)', color: '#93c5fd' },
}

export default function Predict() {
  const [models,       setModels]       = useState([])
  const [loadingModels,setLoadingModels]= useState(true)
  const [selectedModel,setSelectedModel]= useState(null)
  const [showPicker,   setShowPicker]   = useState(false)
  const [rows,         setRows]         = useState([])        // array of {col: value}
  const [predicting,   setPredicting]   = useState(false)
  const [results,      setResults]      = useState(null)
  const [error,        setError]        = useState(null)

  useEffect(() => {
    listSavedModels()
      .then(data => setModels(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoadingModels(false))
  }, [])

  // When model selected, init one empty row
  const handleModelSelect = (model) => {
    setSelectedModel(model)
    setShowPicker(false)
    setResults(null)
    setError(null)
    const emptyRow = {}
    ;(model.feature_cols || []).forEach(c => { emptyRow[c] = '' })
    setRows([emptyRow])
  }

  const addRow = () => {
    const emptyRow = {}
    ;(selectedModel.feature_cols || []).forEach(c => { emptyRow[c] = '' })
    setRows(r => [...r, emptyRow])
  }

  const removeRow = (i) => setRows(r => r.filter((_, idx) => idx !== i))

  const updateCell = (rowIdx, col, val) => {
    setRows(r => r.map((row, i) => i === rowIdx ? { ...row, [col]: val } : row))
  }

  const handlePredict = async () => {
    if (!selectedModel) return toast.error('Select a model first')
    if (rows.length === 0)  return toast.error('Add at least one row')

    // Validate — convert empty strings to 0 for numeric
    const cleanRows = rows.map(row => {
      const r = {}
      ;(selectedModel.feature_cols || []).forEach(c => {
        const v = row[c]
        r[c] = v === '' ? 0 : isNaN(Number(v)) ? v : Number(v)
      })
      return r
    })

    setPredicting(true)
    setResults(null)
    setError(null)

    try {
      const data = await predictModel(selectedModel.model_id, cleanRows)
      setResults(data)
      toast.success(`${data.count} prediction${data.count > 1 ? 's' : ''} done!`)
    } catch (e) {
      setError(e.message)
      toast.error(e.message)
    } finally {
      setPredicting(false)
    }
  }

  const handleDownload = () => {
    if (!results) return
    const cols = [...(selectedModel.feature_cols || []), 'prediction']
    const data = rows.map((row, i) => ({
      ...row,
      prediction: results.predictions[i],
    }))
    downloadCSV(data, cols, 'predictions.csv')
  }

  const features = selectedModel?.feature_cols || []
  const taskColor = TASK_COLORS[selectedModel?.task_type] || TASK_COLORS.classification

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight mb-1.5" style={{ color: 'var(--text-primary)' }}>
          Predict
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Use a trained model to predict outcomes on new data
        </p>
      </motion.div>

      {/* Model Selector */}
      <div className="relative mb-6">
        <button
          onClick={() => setShowPicker(p => !p)}
          className="flex items-center gap-3 px-4 py-3 rounded-xl border transition-all w-full max-w-md"
          style={{
            background:  'var(--bg-secondary)',
            borderColor: showPicker ? 'var(--accent-border)' : 'var(--border)',
          }}
        >
          <Brain size={15} style={{ color: selectedModel ? taskColor.color : 'var(--text-muted)', flexShrink: 0 }} />
          <div className="flex-1 text-left min-w-0">
            {selectedModel ? (
              <>
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                  {selectedModel.model_name || selectedModel.algorithm?.replace(/_/g,' ')}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {selectedModel.task_type} · {selectedModel.filename}
                </p>
              </>
            ) : (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {loadingModels ? 'Loading models…' : 'Select a saved model…'}
              </p>
            )}
          </div>
          <ChevronDown size={14} style={{
            color: 'var(--text-muted)', flexShrink: 0,
            transform: showPicker ? 'rotate(180deg)' : '', transition: '0.2s'
          }} />
        </button>

        {/* Dropdown */}
        <AnimatePresence>
          {showPicker && (
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4 }}
              className="absolute top-full left-0 mt-1.5 w-96 rounded-xl border shadow-xl z-50 overflow-hidden"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
            >
              {models.length === 0 ? (
                <div className="p-5 text-center">
                  <p className="text-sm mb-1" style={{ color: 'var(--text-primary)' }}>No saved models</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Train a model and click "Save Model" in ML Training page
                  </p>
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto py-1">
                  {models.filter(m => m.file_exists).map(m => {
                    const tc = TASK_COLORS[m.task_type] || TASK_COLORS.classification
                    const acc = m.metrics?.accuracy != null
                      ? `${(m.metrics.accuracy*100).toFixed(1)}% acc`
                      : m.metrics?.r2_score != null ? `R²=${m.metrics.r2_score}` : null
                    return (
                      <button
                        key={m.model_id}
                        onClick={() => handleModelSelect(m)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors"
                        style={{ background: selectedModel?.model_id === m.model_id ? 'var(--accent-dim)' : 'transparent' }}
                        onMouseEnter={e => { if (selectedModel?.model_id !== m.model_id) e.currentTarget.style.background = 'var(--bg-hover)' }}
                        onMouseLeave={e => { if (selectedModel?.model_id !== m.model_id) e.currentTarget.style.background = 'transparent' }}
                      >
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: tc.bg }}>
                          <Brain size={14} style={{ color: tc.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                            {m.model_name || m.algorithm?.replace(/_/g,' ')}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {m.task_type} · {m.filename} · {formatRelative(m.trained_at)}
                          </p>
                        </div>
                        {acc && (
                          <span className="text-xs px-2 py-0.5 rounded-full shrink-0"
                            style={{ background: tc.bg, color: tc.color }}>{acc}</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        {showPicker && <div className="fixed inset-0 z-40" onClick={() => setShowPicker(false)} />}
      </div>

      {/* No model selected */}
      {!selectedModel && (
        <div className="flex flex-col items-center justify-center py-32 text-center card">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'var(--accent-dim)' }}>
            <Zap size={26} style={{ color: 'var(--accent)' }} strokeWidth={1.5} />
          </div>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            Select a model to predict
          </h2>
          <p className="text-sm max-w-xs" style={{ color: 'var(--text-muted)' }}>
            Choose a saved model from the dropdown above. Train and save models in ML Training page.
          </p>
        </div>
      )}

      {/* Input Form */}
      {selectedModel && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">

          {/* Model info bar */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl flex-wrap"
            style={{ background: taskColor.bg, border: `1px solid ${taskColor.color}30` }}>
            <Brain size={14} style={{ color: taskColor.color }} />
            <span className="text-sm font-medium" style={{ color: taskColor.color }}>
              {selectedModel.model_name || selectedModel.algorithm?.replace(/_/g,' ')}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(0,0,0,0.15)', color: taskColor.color }}>
              {selectedModel.task_type}
            </span>
            <span className="text-xs" style={{ color: taskColor.color, opacity: 0.7 }}>
              Target: {selectedModel.target_col}
            </span>
            <span className="text-xs ml-auto" style={{ color: taskColor.color, opacity: 0.7 }}>
              {features.length} features
            </span>
          </div>

          {/* Input table */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
              <span className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-muted)' }}>
                Input Data ({rows.length} row{rows.length > 1 ? 's' : ''})
              </span>
              <button onClick={addRow} className="btn-ghost text-xs py-1 px-2.5">
                <Plus size={11} /> Add Row
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: features.length * 140 }}>
                <thead style={{ background: 'var(--bg-secondary)' }}>
                  <tr>
                    <th style={{ width: 36, padding: '8px 12px', borderBottom: '1px solid var(--border)',
                      fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>#</th>
                    {features.map(col => (
                      <th key={col} style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)',
                        fontSize: 11, color: 'var(--text-muted)', textAlign: 'left',
                        whiteSpace: 'nowrap', minWidth: 130 }}>
                        {col}
                      </th>
                    ))}
                    {rows.length > 1 && <th style={{ width: 36 }} />}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rowIdx) => (
                    <tr key={rowIdx}
                      style={{ borderBottom: '1px solid var(--border)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '6px 12px', textAlign: 'center',
                        fontSize: 11, color: 'var(--text-muted)' }}>{rowIdx + 1}</td>
                      {features.map(col => (
                        <td key={col} style={{ padding: '4px 8px' }}>
                          <input
                            value={row[col] ?? ''}
                            onChange={e => updateCell(rowIdx, col, e.target.value)}
                            placeholder="value"
                            style={{
                              background: 'var(--bg-secondary)',
                              border: '1px solid var(--border)',
                              borderRadius: 6,
                              color: 'var(--text-primary)',
                              padding: '5px 8px',
                              fontSize: 12,
                              fontFamily: 'inherit',
                              outline: 'none',
                              width: '100%',
                            }}
                            onFocus={e => e.target.style.borderColor = 'var(--accent-border)'}
                            onBlur={e => e.target.style.borderColor = 'var(--border)'}
                          />
                        </td>
                      ))}
                      {rows.length > 1 && (
                        <td style={{ padding: '4px 8px' }}>
                          <button onClick={() => removeRow(rowIdx)}
                            style={{ color: 'var(--text-muted)', background: 'none', border: 'none',
                              cursor: 'pointer', padding: 4, borderRadius: 4 }}
                            onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                            <Trash2 size={13} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Predict button */}
          <div className="flex items-center gap-3">
            <button onClick={handlePredict} disabled={predicting}
              className="btn-primary py-2.5 px-6">
              {predicting
                ? <><RefreshCw size={14} className="animate-spin" /> Predicting…</>
                : <><Zap size={14} /> Run Prediction</>
              }
            </button>
            {results && (
              <button onClick={handleDownload} className="btn-ghost text-xs py-2 px-3">
                <Download size={12} /> Download CSV
              </button>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="flex gap-2 p-4 rounded-xl text-sm"
              style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* Results */}
          {results && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
                <span className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--text-muted)' }}>
                  Predictions ({results.count})
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                  Target: {selectedModel.target_col}
                </span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ background: 'var(--bg-secondary)' }}>
                    <tr>
                      <th style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)',
                        fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>#</th>
                      {features.slice(0, 4).map(col => (
                        <th key={col} style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)',
                          fontSize: 11, color: 'var(--text-muted)', textAlign: 'left' }}>
                          {col}
                        </th>
                      ))}
                      {features.length > 4 && (
                        <th style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)',
                          fontSize: 11, color: 'var(--text-muted)' }}>
                          +{features.length - 4} more
                        </th>
                      )}
                      <th style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)',
                        fontSize: 11, fontWeight: 700, color: 'var(--accent)', textAlign: 'left' }}>
                        🎯 Prediction
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.predictions.map((pred, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '8px 14px', textAlign: 'center',
                          fontSize: 12, color: 'var(--text-muted)' }}>{i + 1}</td>
                        {features.slice(0, 4).map(col => (
                          <td key={col} style={{ padding: '8px 14px',
                            fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                            {rows[i]?.[col] ?? '—'}
                          </td>
                        ))}
                        {features.length > 4 && <td style={{ padding: '8px 14px', fontSize: 12, color: 'var(--text-muted)' }}>…</td>}
                        <td style={{ padding: '8px 14px' }}>
                          <span style={{
                            fontSize: 13, fontWeight: 700,
                            color: 'var(--accent)', fontFamily: 'monospace',
                            background: 'var(--accent-dim)',
                            padding: '3px 10px', borderRadius: 6,
                          }}>
                            {typeof pred === 'number' ? pred.toLocaleString(undefined, { maximumFractionDigits: 4 }) : String(pred)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  )
}
