import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Database, FileText, MessageSquare, TrendingUp, Upload, ArrowRight, Trash2 } from 'lucide-react'
import { listFiles, deleteFile } from '../lib/api'
import { formatBytes, formatRelative } from '../lib/utils'
import StatCard from '../components/ui/StatCard'
import { CardSkeleton } from '../components/ui/Skeleton'
import toast from 'react-hot-toast'

export default function Dashboard() {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    listFiles()
      .then(setFiles)
      .catch(() => toast.error('Could not load files'))
      .finally(() => setLoading(false))
  }, [])

  const handleDelete = async (e, fileId) => {
    e.stopPropagation()
    if (!confirm('Delete this file and all its history?')) return
    try {
      await deleteFile(fileId)
      setFiles(f => f.filter(x => x.file_id !== fileId))
      toast.success('File deleted')
    } catch (e) {
      toast.error(e.message)
    }
  }

  const totalRows = files.reduce((s, f) => s + (f.row_count || 0), 0)

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-semibold tracking-tight mb-1.5" style={{ color: 'var(--text-primary)' }}>
          Dashboard
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Your data analysis workspace
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <StatCard icon={FileText} label="Datasets" value={files.length} sub="uploaded files" accent delay={0} />
            <StatCard icon={Database} label="Total Rows" value={totalRows.toLocaleString()} sub="across all datasets" delay={0.06} />
            <StatCard icon={TrendingUp} label="Columns" value={files.reduce((s, f) => s + (f.column_count || 0), 0)} sub="total fields" delay={0.12} />
            <StatCard icon={MessageSquare} label="Ready" value={files.length > 0 ? 'Yes' : 'No'} sub="to analyze" accent={files.length > 0} delay={0.18} />
          </>
        )}
      </div>

      {/* Quick Actions */}
      {files.length === 0 && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-8 text-center mb-8"
        >
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--accent-dim)' }}>
            <Database size={24} style={{ color: 'var(--accent)' }} strokeWidth={1.5} />
          </div>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            No datasets yet
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
            Upload a CSV or Excel file to start analyzing your data with AI
          </p>
          <button className="btn-primary mx-auto" onClick={() => navigate('/upload')}>
            <Upload size={14} /> Upload your first file
          </button>
        </motion.div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
              YOUR DATASETS
            </h2>
            <button
              onClick={() => navigate('/upload')}
              className="btn-ghost text-xs py-1.5 px-3"
            >
              <Upload size={12} /> Add dataset
            </button>
          </div>

          <div className="space-y-2">
            {files.map((file, i) => (
              <motion.div
                key={file.file_id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => navigate(`/chat/${file.file_id}`)}
                className="card card-hover p-4 cursor-pointer flex items-center gap-4 group"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'var(--accent-dim)' }}>
                  <FileText size={16} style={{ color: 'var(--accent)' }} strokeWidth={1.8} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {file.filename}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span>{file.row_count?.toLocaleString()} rows</span>
                    <span>·</span>
                    <span>{file.column_count} columns</span>
                    <span>·</span>
                    <span>{formatBytes(file.file_size)}</span>
                    <span>·</span>
                    <span>{formatRelative(file.created_at)}</span>
                    {file.missing_values > 0 && (
                      <><span>·</span><span className="text-amber-400">{file.missing_values} missing</span></>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={e => handleDelete(e, file.file_id)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#f87171' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
                  >
                    <Trash2 size={13} />
                  </button>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                    <ArrowRight size={13} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
