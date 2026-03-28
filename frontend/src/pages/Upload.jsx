import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { MessageSquare, Eye, Info } from 'lucide-react'
import FileUpload from '../components/upload/FileUpload'
import DataTable from '../components/ui/DataTable'
import ColumnPanel from '../components/ui/ColumnPanel'
import { previewFile } from '../lib/api'
import { TableSkeleton } from '../components/ui/Skeleton'

export default function Upload() {
  const navigate = useNavigate()
  const [uploadedFile, setUploadedFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [tab, setTab] = useState('preview')

  const handleSuccess = async (fileData) => {
    setUploadedFile(fileData)
    setLoadingPreview(true)
    try {
      const data = await previewFile(fileData.file_id, 100)
      setPreview(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingPreview(false)
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight mb-1.5" style={{ color: 'var(--text-primary)' }}>
          Upload Data
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Upload a CSV or Excel file to start your analysis
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mb-6">
        <FileUpload onSuccess={handleSuccess} />
      </motion.div>

      {/* Post-upload panel */}
      {uploadedFile && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {/* Action buttons */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => navigate(`/chat/${uploadedFile.file_id}`)}
              className="btn-primary"
            >
              <MessageSquare size={14} /> Analyze with AI
            </button>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Start asking questions about your data
            </span>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-4 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-secondary)' }}>
            {[
              { id: 'preview', label: 'Data Preview', icon: Eye },
              { id: 'schema', label: 'Schema', icon: Info },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: tab === id ? 'var(--bg-card)' : 'transparent',
                  color: tab === id ? 'var(--text-primary)' : 'var(--text-muted)',
                  boxShadow: tab === id ? '0 1px 4px rgba(0,0,0,0.15)' : 'none',
                }}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>

          {tab === 'preview' && (
            <div className="card p-5">
              {loadingPreview ? (
                <TableSkeleton rows={6} cols={5} />
              ) : preview ? (
                <DataTable
                  columns={preview.columns}
                  rows={preview.rows}
                  filename={uploadedFile.filename.replace(/\.[^.]+$/, '')}
                  maxHeight="480px"
                />
              ) : (
                <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>
                  Preview unavailable
                </p>
              )}
            </div>
          )}

          {tab === 'schema' && (
            <div className="card p-5">
              <div className="mb-4">
                <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>COLUMNS ({uploadedFile.columns?.length})</h3>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Detected data types and null counts
                </p>
              </div>
              <ColumnPanel columns={uploadedFile.columns} />
            </div>
          )}
        </motion.div>
      )}

      {/* Tips */}
      {!uploadedFile && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-8 rounded-2xl border p-5"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
        >
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
            Tips for best results
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { title: 'Clean headers', desc: 'Use descriptive column names without special characters' },
              { title: 'Consistent types', desc: 'Keep the same data type within each column' },
              { title: 'Handle dates', desc: 'Use ISO format (YYYY-MM-DD) for date columns' },
            ].map(tip => (
              <div key={tip.title}>
                <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{tip.title}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{tip.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}
