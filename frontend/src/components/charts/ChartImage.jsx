import { motion } from 'framer-motion'
import { Download } from 'lucide-react'

export default function ChartImage({ src, title, delay = 0 }) {
  if (!src) return null

  const handleDownload = () => {
    const a = document.createElement('a')
    a.href = src
    a.download = `${title || 'chart'}.png`
    a.click()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="card overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: 'var(--border)' }}>
        <span className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: 'var(--text-muted)' }}>{title}</span>
        <button onClick={handleDownload} className="btn-ghost py-1 px-2 text-xs">
          <Download size={11} /> PNG
        </button>
      </div>
      <div className="p-3" style={{ background: 'var(--bg-secondary)' }}>
        <img src={src} alt={title} className="w-full rounded-lg" style={{ maxHeight: 360, objectFit: 'contain' }} />
      </div>
    </motion.div>
  )
}
