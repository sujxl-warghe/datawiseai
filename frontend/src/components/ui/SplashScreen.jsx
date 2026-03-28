import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Database, BarChart2, Brain, Zap } from 'lucide-react'

const ICONS = [
  { Icon: BarChart2, delay: 0.4  },
  { Icon: Brain,     delay: 0.55 },
  { Icon: Zap,       delay: 0.7  },
]

export default function SplashScreen({ onDone }) {
  const [phase, setPhase] = useState('in')   // in | hold | out

  useEffect(() => {
    // hold for 1.8s then fade out
    const t1 = setTimeout(() => setPhase('out'), 1800)
    // after fade-out done (0.6s) call onDone
    const t2 = setTimeout(() => onDone?.(), 2400)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  return (
    <AnimatePresence>
      {phase !== 'done' && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          onAnimationComplete={() => { if (phase === 'out') setPhase('done') }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg-primary)',
            overflow: 'hidden',
          }}
        >
          {/* Background glow orbs */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              width: 600, height: 600,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(134,239,172,0.08) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.4, delay: 0.2, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              width: 400, height: 400,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(134,239,172,0.05) 0%, transparent 60%)',
              pointerEvents: 'none',
              top: '30%', left: '60%',
            }}
          />

          {/* Floating icon ring */}
          <div style={{ position: 'relative', marginBottom: 40 }}>
            {/* Orbit ring */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5, rotate: -30 }}
              animate={{ opacity: 0.15, scale: 1, rotate: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 140, height: 140, borderRadius: '50%',
                border: '1px solid var(--accent)',
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 0.07, scale: 1 }}
              transition={{ duration: 0.9, delay: 0.3 }}
              style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 200, height: 200, borderRadius: '50%',
                border: '1px solid var(--accent)',
              }}
            />

            {/* Floating mini icons around the logo */}
            {ICONS.map(({ Icon, delay }, i) => {
              const angle = (i / ICONS.length) * 2 * Math.PI - Math.PI / 2
              const r = 90
              const x = Math.cos(angle) * r
              const y = Math.sin(angle) * r
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                  animate={{ opacity: 1, scale: 1, x, y }}
                  transition={{ duration: 0.6, delay, type: 'spring', stiffness: 200 }}
                  style={{
                    position: 'absolute', top: '50%', left: '50%',
                    marginTop: -16, marginLeft: -16,
                    width: 32, height: 32, borderRadius: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                  }}
                >
                  <Icon size={14} style={{ color: 'var(--accent)' }} strokeWidth={1.8} />
                </motion.div>
              )
            })}

            {/* Main logo icon */}
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.6, delay: 0.1, type: 'spring', stiffness: 260, damping: 20 }}
              style={{
                width: 72, height: 72, borderRadius: 20,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--accent)', boxShadow: '0 0 40px rgba(134,239,172,0.3)',
              }}
            >
              <Database size={32} color="#0a2e15" strokeWidth={2.5} />
            </motion.div>
          </div>

          {/* Brand name */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            style={{ textAlign: 'center' }}
          >
            <h1 style={{
              fontSize: 36, fontWeight: 800, letterSpacing: '-0.03em',
              color: 'var(--text-primary)', marginBottom: 8, lineHeight: 1,
            }}>
              DataWise
              <span style={{ color: 'var(--accent)' }}>AI</span>
            </h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.75 }}
              style={{ fontSize: 13, color: 'var(--text-muted)', letterSpacing: '0.05em' }}
            >
              AI-Powered Data Analysis Platform
            </motion.p>
          </motion.div>

          {/* Loading bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            style={{ marginTop: 48, width: 200 }}
          >
            <div style={{
              height: 2, borderRadius: 99,
              background: 'var(--bg-hover)', overflow: 'hidden',
            }}>
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 1.2, delay: 0.9, ease: 'easeInOut' }}
                style={{ height: '100%', borderRadius: 99, background: 'var(--accent)' }}
              />
            </div>
            <motion.p
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', marginTop: 10, letterSpacing: '0.08em' }}
            >
              INITIALIZING…
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
