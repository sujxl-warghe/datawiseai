import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FileText, ChevronDown, Plus } from 'lucide-react'
import { listFiles } from '../../lib/api'
import { formatBytes, formatRelative } from '../../lib/utils'
import { useNavigate } from 'react-router-dom'

export default function FileSelector({ selected, onSelect }) {
  const [files, setFiles] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    listFiles()
      .then(setFiles)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all"
        style={{
          background: 'var(--bg-secondary)',
          borderColor: open ? 'var(--accent-border)' : 'var(--border)',
          color: 'var(--text-primary)',
          minWidth: 220,
        }}
      >
        <FileText size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <span className="flex-1 text-sm text-left truncate">
          {selected ? selected.filename : <span style={{ color: 'var(--text-muted)' }}>Select a dataset…</span>}
        </span>
        <ChevronDown size={14} style={{ color: 'var(--text-muted)', flexShrink: 0, transform: open ? 'rotate(180deg)' : '', transition: '0.2s' }} />
      </button>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: 4, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="absolute top-full left-0 mt-1.5 w-72 rounded-xl border shadow-xl z-50 overflow-hidden"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
        >
          {loading ? (
            <div className="p-4 text-sm text-center" style={{ color: 'var(--text-muted)' }}>Loading…</div>
          ) : files.length === 0 ? (
            <div className="p-4">
              <p className="text-sm mb-3 text-center" style={{ color: 'var(--text-muted)' }}>No datasets uploaded yet</p>
              <button
                onClick={() => navigate('/upload')}
                className="btn-primary w-full justify-center text-xs py-2"
              >
                <Plus size={13} /> Upload a file
              </button>
            </div>
          ) : (
            <div className="py-1 max-h-64 overflow-y-auto">
              {files.map(file => (
                <button
                  key={file.file_id}
                  onClick={() => { onSelect(file); setOpen(false) }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors"
                  style={{ background: selected?.file_id === file.file_id ? 'var(--accent-dim)' : 'transparent' }}
                  onMouseEnter={e => { if (selected?.file_id !== file.file_id) e.currentTarget.style.background = 'var(--bg-hover)' }}
                  onMouseLeave={e => { if (selected?.file_id !== file.file_id) e.currentTarget.style.background = 'transparent' }}
                >
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: selected?.file_id === file.file_id ? 'var(--accent-dim)' : 'var(--bg-hover)' }}>
                    <FileText size={13} style={{ color: selected?.file_id === file.file_id ? 'var(--accent)' : 'var(--text-muted)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate font-medium" style={{ color: 'var(--text-primary)' }}>{file.filename}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {file.row_count?.toLocaleString()} rows · {formatRelative(file.created_at)}
                    </p>
                  </div>
                </button>
              ))}
              <div className="border-t mx-2 my-1" style={{ borderColor: 'var(--border)' }} />
              <button
                onClick={() => { navigate('/upload'); setOpen(false) }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <Plus size={13} /> Upload new file
              </button>
            </div>
          )}
        </motion.div>
      )}

      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
    </div>
  )
}
