import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { HardDrive, Download, Trash2, RefreshCw, Search, FileText, Brain } from 'lucide-react'
import { listSavedModels, deleteModel } from '../lib/api'
import { formatRelative } from '../lib/utils'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

const BASE_URL = 'https://datawiseai.onrender.com'

const TASK_COLORS = {
  classification: { bg: 'rgba(134,239,172,0.1)', color: '#86efac' },
  regression:     { bg: 'rgba(251,191,36,0.1)',  color: '#fbbf24' },
  clustering:     { bg: 'rgba(147,197,253,0.1)', color: '#93c5fd' },
}

export default function SavedModels() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const [models,  setModels]  = useState([])
  const [loadingModels, setLoadingModels] = useState(true)
  const [search,  setSearch]  = useState('')

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate('/login')
    }
  }, [user, loading, navigate])

  const load = async () => {
    if (!user) return
    setLoadingModels(true)
    try {
      const data = await listSavedModels()
      setModels(Array.isArray(data) ? data : [])
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoadingModels(false)
    }
  }

  useEffect(() => { if (user) load() }, [user])

  const handleDelete = async (modelId, name) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    try {
      await deleteModel(modelId)
      setModels(m => m.filter(x => x.model_id !== modelId))
      toast.success('Model deleted')
    } catch (e) {
      toast.error(e.message)
    }
  }

  const filtered = models.filter(m =>
    (m.model_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (m.filename   || '').toLowerCase().includes(search.toLowerCase()) ||
    (m.algorithm  || '').toLowerCase().includes(search.toLowerCase())
  )

  const getAccuracy = (m) => {
    if (m.metrics?.accuracy != null) return `${(m.metrics.accuracy * 100).toFixed(1)}% acc`
    if (m.metrics?.r2_score != null) return `R²=${m.metrics.r2_score}`
    if (m.metrics?.silhouette_score != null) return `sil=${m.metrics.silhouette_score}`
    return null
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight mb-1.5" style={{ color: 'var(--text-primary)' }}>
              Saved Models
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              All your saved trained models — download anytime
            </p>
          </div>
          <button onClick={load} disabled={loading} className="btn-ghost text-xs py-2 px-3">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </motion.div>

      {/* Stats bar */}
      {models.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-4 mb-6 flex-wrap"
        >
          {[
            { label: 'Total Saved',      val: models.length },
            { label: 'Classification',   val: models.filter(m => m.task_type === 'classification').length },
            { label: 'Regression',       val: models.filter(m => m.task_type === 'regression').length },
            { label: 'Available',        val: models.filter(m => m.file_exists).length },
          ].map(({ label, val }) => (
            <div key={label} className="card px-4 py-3 flex items-center gap-2.5">
              <span className="text-lg font-bold" style={{ color: 'var(--accent)' }}>{val}</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
            </div>
          ))}
        </motion.div>
      )}

      {/* Search */}
      {models.length > 0 && (
        <div className="relative mb-5">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--text-muted)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, file, or algorithm…"
            className="input-base pl-9 text-sm"
          />
        </div>
      )}

      {/* Loading */}
      {(loading || loadingModels) && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse flex gap-4">
              <div className="w-10 h-10 rounded-xl shrink-0" style={{ background: 'var(--bg-hover)' }} />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-48 rounded" style={{ background: 'var(--bg-hover)' }} />
                <div className="h-3 w-32 rounded" style={{ background: 'var(--bg-hover)' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !loadingModels && models.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-32 text-center card"
        >
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'var(--accent-dim)' }}>
            <HardDrive size={24} style={{ color: 'var(--accent)' }} strokeWidth={1.5} />
          </div>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            No saved models yet
          </h2>
          <p className="text-sm max-w-xs" style={{ color: 'var(--text-muted)' }}>
            Train a model in the ML Training page and click the <strong>"Save Model"</strong> button to store it here
          </p>
        </motion.div>
      )}

      {/* No search results */}
      {!loading && models.length > 0 && filtered.length === 0 && (
        <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
          No models match "{search}"
        </div>
      )}

      {/* Model list */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((m, i) => {
            const taskColor = TASK_COLORS[m.task_type] || TASK_COLORS.classification
            const accuracy  = getAccuracy(m)
            const algoLabel = (m.algorithm || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

            return (
              <motion.div
                key={m.model_id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="card card-hover p-5"
                style={{ opacity: m.file_exists ? 1 : 0.6 }}
              >
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: taskColor.bg }}>
                    <Brain size={18} style={{ color: taskColor.color }} strokeWidth={1.8} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                        {m.model_name || algoLabel}
                      </p>

                      {/* Task type badge */}
                      <span className="text-xs px-2 py-0.5 rounded-full shrink-0"
                        style={{ background: taskColor.bg, color: taskColor.color }}>
                        {m.task_type}
                      </span>

                      {/* Accuracy badge */}
                      {accuracy && (
                        <span className="text-xs px-2 py-0.5 rounded-full shrink-0"
                          style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                          {accuracy}
                        </span>
                      )}

                      {/* File missing warning */}
                      {!m.file_exists && (
                        <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>
                          File missing
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs flex-wrap"
                      style={{ color: 'var(--text-muted)' }}>
                      <span className="flex items-center gap-1">
                        <FileText size={10} /> {m.filename || 'Unknown file'}
                      </span>
                      <span>·</span>
                      <span>{algoLabel}</span>
                      <span>·</span>
                      <span>Target: {m.target_col}</span>
                      <span>·</span>
                      <span>{m.train_size + m.test_size} rows</span>
                      <span>·</span>
                      <span>{formatRelative(m.trained_at)}</span>
                    </div>

                    {/* Feature cols */}
                    {m.feature_cols?.length > 0 && (
                      <div className="flex gap-1 flex-wrap mt-2">
                        {m.feature_cols.slice(0, 6).map(f => (
                          <span key={f} className="text-xs px-2 py-0.5 rounded"
                            style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
                            {f}
                          </span>
                        ))}
                        {m.feature_cols.length > 6 && (
                          <span className="text-xs px-2 py-0.5 rounded"
                            style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
                            +{m.feature_cols.length - 6} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {m.file_exists ? (
                      <a
                        href={`${BASE_URL}/api/ml/models/${m.file_id}/${m.model_id}/download`}
                        download
                        className="btn-primary text-xs py-2 px-3"
                      >
                        <Download size={12} /> Download .pkl
                      </a>
                    ) : (
                      <span className="text-xs px-3 py-2 rounded-lg"
                        style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
                        Unavailable
                      </span>
                    )}

                    <button
                      onClick={() => handleDelete(m.model_id, m.model_name || algoLabel)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                      style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)' }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
