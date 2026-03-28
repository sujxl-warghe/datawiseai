import { motion } from 'framer-motion'
import { Database } from 'lucide-react'

export default function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)' }}
      >
        <Database size={14} style={{ color: 'var(--text-secondary)' }} strokeWidth={1.8} />
      </div>

      <div
        className="rounded-2xl px-4 py-3.5 flex items-center gap-1.5"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderBottomLeftRadius: 4,
        }}
      >
        {[0, 0.18, 0.36].map((delay, i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: 'var(--accent)' }}
            animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.1, 0.8] }}
            transition={{ duration: 1.0, delay, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
      </div>
    </div>
  )
}
