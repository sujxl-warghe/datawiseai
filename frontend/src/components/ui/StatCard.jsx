import { motion } from 'framer-motion'

export default function StatCard({ icon: Icon, label, value, sub, accent, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="card card-hover p-5"
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: accent ? 'var(--accent-dim)' : 'var(--bg-hover)' }}
        >
          <Icon size={16} style={{ color: accent ? 'var(--accent)' : 'var(--text-secondary)' }} strokeWidth={2} />
        </div>
      </div>
      <div className="text-2xl font-semibold tracking-tight mb-0.5" style={{ color: 'var(--text-primary)' }}>
        {value}
      </div>
      <div className="text-xs font-medium mb-0.5" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </div>
      {sub && (
        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {sub}
        </div>
      )}
    </motion.div>
  )
}
