import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileText, CheckCircle, AlertCircle, X } from 'lucide-react'
import { uploadFile } from '../../lib/api'
import { formatBytes } from '../../lib/utils'

export default function FileUpload({ onSuccess }) {
  const [status, setStatus] = useState('idle') // idle | uploading | success | error
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [preview, setPreview] = useState(null)

  const onDrop = useCallback(async (accepted) => {
    if (!accepted.length) return
    const file = accepted[0]
    setPreview(file)
    setStatus('uploading')
    setProgress(0)
    setError('')

    try {
      const fd = new FormData()
      fd.append('file', file)
      const data = await uploadFile(fd, pct => setProgress(pct))
      setResult(data)
      setStatus('success')
      onSuccess?.(data)
    } catch (e) {
      setError(e.message)
      setStatus('error')
    }
  }, [onSuccess])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'], 'application/vnd.ms-excel': ['.xls'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
    multiple: false,
    maxSize: 50 * 1024 * 1024,
  })

  const reset = () => {
    setStatus('idle')
    setProgress(0)
    setError('')
    setResult(null)
    setPreview(null)
  }

  return (
    <div>
      <AnimatePresence mode="wait">
        {status === 'idle' && (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            {...getRootProps()}
            className="relative cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition-all duration-200"
            style={{
              borderColor: isDragActive ? 'var(--accent)' : 'var(--border-strong)',
              background: isDragActive ? 'var(--accent-dim)' : 'var(--bg-secondary)',
            }}
          >
            <input {...getInputProps()} />
            <motion.div
              animate={{ y: isDragActive ? -6 : 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center gap-4"
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: isDragActive ? 'var(--accent-dim)' : 'var(--bg-hover)' }}
              >
                <Upload
                  size={24}
                  style={{ color: isDragActive ? 'var(--accent)' : 'var(--text-muted)' }}
                  strokeWidth={1.5}
                />
              </div>
              <div>
                <p className="font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  {isDragActive ? 'Drop to upload' : 'Drag & drop your file'}
                </p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  or <span style={{ color: 'var(--accent)' }}>browse files</span> · CSV, XLSX up to 50MB
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}

        {(status === 'uploading') && (
          <motion.div
            key="uploading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl border p-8"
            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-dim)' }}>
                <FileText size={18} style={{ color: 'var(--accent)' }} strokeWidth={1.8} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                  {preview?.name}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {formatBytes(preview?.size)}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
                <span>Uploading & processing…</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-hover)' }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'var(--accent)' }}
                  initial={{ width: '0%' }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          </motion.div>
        )}

        {status === 'success' && result && (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border p-6"
            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--accent-border)' }}
          >
            <div className="flex items-start gap-4">
              <CheckCircle size={20} style={{ color: 'var(--accent)', marginTop: 1 }} />
              <div className="flex-1">
                <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                  {result.filename}
                </p>
                <div className="flex flex-wrap gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span>{result.row_count?.toLocaleString()} rows</span>
                  <span>·</span>
                  <span>{result.column_count} columns</span>
                  <span>·</span>
                  <span>{formatBytes(result.file_size)}</span>
                  {result.missing_values > 0 && (
                    <><span>·</span><span className="text-amber-400">{result.missing_values} missing values</span></>
                  )}
                </div>
              </div>
              <button onClick={reset} className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Upload another
              </button>
            </div>
          </motion.div>
        )}

        {status === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border p-6"
            style={{ background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.2)' }}
          >
            <div className="flex items-start gap-3">
              <AlertCircle size={18} className="text-red-400 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-sm text-red-400 mb-1">Upload failed</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{error}</p>
              </div>
              <button onClick={reset} style={{ color: 'var(--text-muted)' }}>
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
