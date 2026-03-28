import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wrench, Sparkles, Play, RotateCcw, Download, ChevronDown, ChevronUp, CheckCircle, Eye } from 'lucide-react'
import {
  getFeatureInfo, previewTransform, applyTransform,
  getFeatureSession, previewEngineered, resetFeatureSession, downloadEngineered
} from '../lib/api'
import FileSelector from '../components/chat/FileSelector'
import DataTable from '../components/ui/DataTable'
import toast from 'react-hot-toast'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const TYPE_COLORS = {
  numeric:     { bg: 'rgba(134,239,172,0.1)', color: '#86efac' },
  categorical: { bg: 'rgba(251,191,36,0.1)',  color: '#fbbf24' },
  datetime:    { bg: 'rgba(147,197,253,0.1)', color: '#93c5fd' },
  missing:     { bg: 'rgba(248,113,113,0.1)', color: '#f87171' },
  combine:     { bg: 'rgba(196,181,253,0.1)', color: '#c4b5fd' },
}

const TRANSFORM_GROUPS = {
  numeric:     { label: '🔢 Numeric',        color: TYPE_COLORS.numeric     },
  categorical: { label: '🏷️ Categorical',    color: TYPE_COLORS.categorical },
  datetime:    { label: '📅 Date/Time',      color: TYPE_COLORS.datetime    },
  combine:     { label: '🔗 Combine Cols',   color: TYPE_COLORS.combine     },
  missing:     { label: '❓ Missing Values', color: TYPE_COLORS.missing     },
}

export default function FeatureEngineering() {
  const [selectedFile,   setSelectedFile]   = useState(null)
  const [fileInfo,       setFileInfo]       = useState(null)
  const [session,        setSession]        = useState(null)
  const [loading,        setLoading]        = useState(false)

  // Transform form
  const [selectedCol,    setSelectedCol]    = useState('')
  const [selectedCol2,   setSelectedCol2]   = useState('')
  const [selectedTrans,  setSelectedTrans]  = useState('')
  const [newColName,     setNewColName]     = useState('')
  const [applying,       setApplying]       = useState(false)
  const [previewing,     setPreviewing]     = useState(false)
  const [previewData,    setPreviewData]    = useState(null)

  // Data preview
  const [tableData,      setTableData]      = useState(null)
  const [showTable,      setShowTable]      = useState(false)
  const [loadingTable,   setLoadingTable]   = useState(false)

  // Suggestions
  const [showSugg,       setShowSugg]       = useState(true)

  const transforms = fileInfo?.col_types ? buildTransformList(fileInfo) : {}

  function buildTransformList(info) {
    // Group transforms by type
    return {
      numeric:     ['log','sqrt','square','normalize','standardize','abs','reciprocal','binning'],
      categorical: ['label_encode','onehot','frequency'],
      datetime:    ['extract_year','extract_month','extract_day','extract_dow'],
      combine:     ['add','subtract','multiply','divide'],
      missing:     ['fill_mean','fill_median','fill_mode','fill_zero','drop_rows'],
    }
  }

  const TRANS_META = {
    log:           { label: 'Log Transform',        desc: 'log(x+1)' },
    sqrt:          { label: 'Square Root',           desc: 'sqrt(x)'  },
    square:        { label: 'Square (x²)',           desc: 'x²'       },
    normalize:     { label: 'Normalize (0–1)',       desc: 'Min-max'  },
    standardize:   { label: 'Standardize',           desc: 'Z-score'  },
    abs:           { label: 'Absolute Value',        desc: '|x|'      },
    reciprocal:    { label: 'Reciprocal',            desc: '1/x'      },
    binning:       { label: 'Binning',               desc: '5 bins'   },
    label_encode:  { label: 'Label Encode',          desc: 'A→0, B→1' },
    onehot:        { label: 'One-Hot Encode',        desc: 'Binary cols'},
    frequency:     { label: 'Frequency Encode',      desc: 'Count map'},
    extract_year:  { label: 'Extract Year',          desc: 'YYYY'     },
    extract_month: { label: 'Extract Month',         desc: '1–12'     },
    extract_day:   { label: 'Extract Day',           desc: '1–31'     },
    extract_dow:   { label: 'Day of Week',           desc: '0–6'      },
    add:           { label: 'Add Columns',           desc: 'A + B'    },
    subtract:      { label: 'Subtract',              desc: 'A - B'    },
    multiply:      { label: 'Multiply',              desc: 'A × B'    },
    divide:        { label: 'Divide',                desc: 'A ÷ B'    },
    fill_mean:     { label: 'Fill → Mean',           desc: 'NaN→mean' },
    fill_median:   { label: 'Fill → Median',         desc: 'NaN→med'  },
    fill_mode:     { label: 'Fill → Mode',           desc: 'NaN→mode' },
    fill_zero:     { label: 'Fill → Zero',           desc: 'NaN→0'    },
    drop_rows:     { label: 'Drop NaN Rows',         desc: 'Remove'   },
  }

  const loadInfo = async (file) => {
    setLoading(true)
    setFileInfo(null)
    setSession(null)
    setTableData(null)
    setPreviewData(null)
    try {
      const [info, sess] = await Promise.all([
        getFeatureInfo(file.file_id),
        getFeatureSession(file.file_id).catch(() => ({ steps: [] })),
      ])
      setFileInfo(info)
      setSession(sess)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (file) => {
    setSelectedFile(file)
    setSelectedCol('')
    setSelectedTrans('')
    setPreviewData(null)
    loadInfo(file)
  }

  const handlePreview = async () => {
    if (!selectedCol || !selectedTrans) return toast.error('Select column and transformation')
    setPreviewing(true)
    setPreviewData(null)
    try {
      const data = await previewTransform({
        file_id: selectedFile.file_id,
        col: selectedCol, transform: selectedTrans,
        col2: selectedCol2 || null, new_col_name: newColName || null,
      })
      setPreviewData(data)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setPreviewing(false)
    }
  }

  const handleApply = async () => {
    if (!selectedCol || !selectedTrans) return toast.error('Select column and transformation')
    setApplying(true)
    try {
      const result = await applyTransform({
        file_id: selectedFile.file_id,
        col: selectedCol, transform: selectedTrans,
        col2: selectedCol2 || null, new_col_name: newColName || null,
      })
      setSession(result)
      toast.success(result.message || 'Transformation applied!')
      setPreviewData(null)
      setSelectedTrans('')
      setNewColName('')
      // Refresh info
      const info = await getFeatureInfo(selectedFile.file_id)
      setFileInfo(info)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setApplying(false)
    }
  }

  const handleReset = async () => {
    if (!confirm('Reset all transformations?')) return
    try {
      await resetFeatureSession(selectedFile.file_id)
      setSession({ steps: [] })
      setTableData(null)
      setPreviewData(null)
      const info = await getFeatureInfo(selectedFile.file_id)
      setFileInfo(info)
      toast.success('Session reset')
    } catch (e) {
      toast.error(e.message)
    }
  }

  const loadTable = async () => {
    setLoadingTable(true)
    try {
      const data = await previewEngineered(selectedFile.file_id)
      setTableData(data)
      setShowTable(true)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoadingTable(false)
    }
  }

  const columns = fileInfo?.columns || []
  const colTypes = fileInfo?.col_types || {}
  const isCombine = ['add','subtract','multiply','divide'].includes(selectedTrans)
  const stepsCount = session?.steps?.length || 0

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight mb-1.5" style={{ color: 'var(--text-primary)' }}>
          Feature Engineering
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Transform, encode and create new features to improve your ML model
        </p>
      </motion.div>

      {/* File selector */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <FileSelector selected={selectedFile} onSelect={handleFileSelect} />
        {selectedFile && stepsCount > 0 && (
          <>
            <button onClick={loadTable} disabled={loadingTable} className="btn-ghost text-xs py-2 px-3">
              <Eye size={12} /> Preview Data
            </button>
            <a href={downloadEngineered(selectedFile.file_id)} download className="btn-primary text-xs py-2 px-3">
              <Download size={12} /> Download CSV
            </a>
            <button onClick={handleReset} className="btn-ghost text-xs py-2 px-3" style={{ color: '#f87171' }}>
              <RotateCcw size={12} /> Reset
            </button>
          </>
        )}
      </div>

      {/* Empty state */}
      {!selectedFile && (
        <div className="flex flex-col items-center justify-center py-32 text-center card">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'var(--accent-dim)' }}>
            <Wrench size={24} style={{ color: 'var(--accent)' }} strokeWidth={1.5} />
          </div>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Select a dataset</h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Choose a file to start engineering features
          </p>
        </div>
      )}

      {loading && (
        <div className="card p-8 text-center" style={{ color: 'var(--text-muted)' }}>
          Loading dataset info…
        </div>
      )}

      {selectedFile && fileInfo && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── LEFT: Transform Builder ── */}
          <div className="lg:col-span-1 space-y-4">

            {/* Steps done badge */}
            {stepsCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-border)' }}>
                <CheckCircle size={14} style={{ color: 'var(--accent)' }} />
                <span className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
                  {stepsCount} transformation{stepsCount > 1 ? 's' : ''} applied
                </span>
              </div>
            )}

            {/* 1. Column select */}
            <div className="card p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                1. Select Column
              </p>
              <select value={selectedCol} onChange={e => { setSelectedCol(e.target.value); setSelectedTrans(''); setPreviewData(null) }}
                className="input-base text-sm">
                <option value="">-- Choose column --</option>
                {columns.map(c => (
                  <option key={c} value={c}>{c} ({colTypes[c] || 'unknown'})</option>
                ))}
              </select>

              {/* Column quick stats */}
              {selectedCol && fileInfo.col_stats && (() => {
                const stat = fileInfo.col_stats.find(s => s.col === selectedCol)
                if (!stat) return null
                return (
                  <div className="space-y-1 pt-1">
                    {[
                      ['Type', colTypes[selectedCol]],
                      ['Missing', `${stat.missing} rows`],
                      ['Unique', stat.unique],
                      stat.skew != null && ['Skew', stat.skew],
                      stat.mean != null && ['Mean', stat.mean],
                    ].filter(Boolean).map(([k, v]) => (
                      <div key={k} className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
                        <span>{k}</span>
                        <span style={{ color: 'var(--text-secondary)' }}>{v}</span>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>

            {/* 2. Transform select */}
            {selectedCol && (
              <div className="card p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  2. Transformation
                </p>
                <div className="space-y-3">
                  {Object.entries(TRANSFORM_GROUPS).map(([groupKey, group]) => (
                    <div key={groupKey}>
                      <p className="text-xs mb-1.5 font-medium" style={{ color: group.color.color }}>
                        {group.label}
                      </p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(transforms[groupKey] || []).map(t => {
                          const meta = TRANS_META[t]
                          if (!meta) return null
                          const isSelected = selectedTrans === t
                          return (
                            <button key={t} onClick={() => { setSelectedTrans(t); setPreviewData(null) }}
                              className="text-left px-2.5 py-2 rounded-lg border transition-all"
                              style={{
                                background:  isSelected ? group.color.bg : 'var(--bg-secondary)',
                                borderColor: isSelected ? group.color.color + '60' : 'var(--border)',
                                color:       isSelected ? group.color.color : 'var(--text-secondary)',
                              }}>
                              <div className="text-xs font-medium leading-tight">{meta.label}</div>
                              <div className="text-xs opacity-60 mt-0.5">{meta.desc}</div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Second column (for combine ops) */}
            {isCombine && (
              <div className="card p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  3. Second Column
                </p>
                <select value={selectedCol2} onChange={e => setSelectedCol2(e.target.value)}
                  className="input-base text-sm">
                  <option value="">-- Choose column B --</option>
                  {columns.filter(c => c !== selectedCol).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            )}

            {/* New col name */}
            {selectedTrans && !['fill_mean','fill_median','fill_mode','fill_zero','drop_rows'].includes(selectedTrans) && (
              <div className="card p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  New Column Name (optional)
                </p>
                <input value={newColName} onChange={e => setNewColName(e.target.value)}
                  placeholder={`${selectedCol}_${selectedTrans}`}
                  className="input-base text-sm" />
              </div>
            )}

            {/* Action buttons */}
            {selectedCol && selectedTrans && (
              <div className="flex gap-2">
                <button onClick={handlePreview} disabled={previewing}
                  className="btn-ghost flex-1 justify-center text-xs py-2">
                  {previewing ? 'Loading…' : '👁 Preview'}
                </button>
                <button onClick={handleApply} disabled={applying || (isCombine && !selectedCol2)}
                  className="btn-primary flex-1 justify-center text-xs py-2">
                  {applying ? 'Applying…' : <><Play size={12} /> Apply</>}
                </button>
              </div>
            )}
          </div>

          {/* ── RIGHT: Preview + History ── */}
          <div className="lg:col-span-2 space-y-5">

            {/* AI Suggestions */}
            {fileInfo.suggestions?.length > 0 && (
              <div className="card p-4">
                <button onClick={() => setShowSugg(s => !s)}
                  className="w-full flex items-center gap-2 text-sm font-semibold"
                  style={{ color: 'var(--text-primary)' }}>
                  <Sparkles size={14} style={{ color: '#fbbf24' }} />
                  AI Suggestions ({fileInfo.suggestions.length})
                  <span className="ml-auto">{showSugg ? <ChevronUp size={13} /> : <ChevronDown size={13} />}</span>
                </button>
                {showSugg && (
                  <div className="mt-3 space-y-2">
                    {fileInfo.suggestions.slice(0, 8).map((s, i) => (
                      <button key={i} onClick={() => {
                        setSelectedCol(s.col)
                        setSelectedTrans(s.transform)
                        setPreviewData(null)
                      }}
                        className="w-full flex items-center gap-3 text-left px-3 py-2.5 rounded-lg transition-colors"
                        style={{ background: 'var(--bg-secondary)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                      >
                        <span className="text-xs px-2 py-0.5 rounded-full shrink-0"
                          style={{
                            background: s.priority === 'high' ? 'rgba(248,113,113,0.1)' : 'rgba(251,191,36,0.1)',
                            color: s.priority === 'high' ? '#f87171' : '#fbbf24',
                          }}>
                          {s.priority}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                            {s.col} → {TRANS_META[s.transform]?.label || s.transform}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.reason}</p>
                        </div>
                        <span className="text-xs shrink-0" style={{ color: 'var(--accent)' }}>Apply →</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Transform Preview */}
            {previewData && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle size={15} style={{ color: 'var(--accent)' }} />
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Preview
                  </p>
                  <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>
                    {previewData.message}
                  </span>
                </div>

                {/* Before / After comparison */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {[
                    { label: 'Before', stats: previewData.before_stats, samples: previewData.sample_before },
                    { label: 'After',  stats: previewData.after_stats,  samples: previewData.sample_after  },
                  ].map(({ label, stats, samples }) => (
                    <div key={label} className="rounded-xl p-3"
                      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                      <p className="text-xs font-semibold mb-2" style={{ color: label === 'After' ? 'var(--accent)' : 'var(--text-muted)' }}>
                        {label}
                      </p>
                      <div className="space-y-1 mb-3">
                        {stats && Object.entries(stats).filter(([k]) => !['col'].includes(k)).map(([k, v]) => (
                          <div key={k} className="flex justify-between text-xs">
                            <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                            <span style={{ color: 'var(--text-secondary)' }}>{v}</span>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Samples:</p>
                        {(samples || []).map((v, i) => (
                          <div key={i} className="text-xs font-mono px-2 py-0.5 rounded"
                            style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)' }}>
                            {v ?? '—'}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <button onClick={handleApply} disabled={applying}
                  className="btn-primary w-full justify-center py-2.5 text-sm">
                  {applying ? 'Applying…' : <><Play size={13} /> Apply Transformation</>}
                </button>
              </motion.div>
            )}

            {/* Applied steps history */}
            {stepsCount > 0 && (
              <div className="card p-4">
                <p className="text-xs font-semibold uppercase tracking-wider mb-3"
                  style={{ color: 'var(--text-muted)' }}>
                  Applied Steps ({stepsCount})
                </p>
                <div className="space-y-2">
                  {(session?.steps || []).map((step, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                      style={{ background: 'var(--bg-secondary)' }}>
                      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                        style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                        {i + 1}
                      </div>
                      <p className="text-xs flex-1" style={{ color: 'var(--text-secondary)' }}>
                        {step.msg}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Data table preview */}
            {showTable && tableData && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Engineered Dataset Preview
                  </p>
                  <button onClick={() => setShowTable(false)} className="btn-ghost text-xs py-1 px-2">
                    Close
                  </button>
                </div>
                <DataTable
                  columns={tableData.columns}
                  rows={tableData.rows}
                  filename="engineered_data"
                  maxHeight="340px"
                />
              </motion.div>
            )}

            {/* Empty state in right panel */}
            {!previewData && !showTable && stepsCount === 0 && selectedFile && (
              <div className="flex flex-col items-center justify-center h-64 text-center card">
                <Wrench size={22} style={{ color: 'var(--text-muted)' }} className="mb-3" strokeWidth={1.5} />
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                  Ready to transform
                </p>
                <p className="text-xs max-w-xs" style={{ color: 'var(--text-muted)' }}>
                  Select a column and transformation from the left, or click an AI suggestion above
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
