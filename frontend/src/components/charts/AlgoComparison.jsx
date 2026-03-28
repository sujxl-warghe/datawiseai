import { motion } from 'framer-motion'
import { Trophy } from 'lucide-react'

export default function AlgoComparison({ scores, best }) {
  if (!scores || !Object.keys(scores).length) return null

  const sorted = Object.entries(scores).sort((a, b) => b[1].mean - a[1].mean)
  const max = sorted[0][1].mean

  const LABELS = {
    random_forest: 'Random Forest',
    gradient_boosting: 'Gradient Boosting',
    logistic_regression: 'Logistic Regression',
    linear_regression: 'Linear Regression',
    xgboost: 'XGBoost',
    svm: 'SVM',
    ridge: 'Ridge',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-5"
    >
      <div className="flex items-center gap-2 mb-4">
        <Trophy size={15} style={{ color: 'var(--accent)' }} />
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Algorithm Comparison
        </h3>
        <span className="text-xs px-2 py-0.5 rounded-full ml-auto"
          style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
          Auto Selected: {LABELS[best] || best}
        </span>
      </div>

      <div className="space-y-3">
        {sorted.map(([name, score], i) => {
          const pct = (score.mean / max) * 100
          const isWinner = name === best
          return (
            <div key={name}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium flex items-center gap-1.5"
                  style={{ color: isWinner ? 'var(--accent)' : 'var(--text-secondary)' }}>
                  {isWinner && <Trophy size={11} />}
                  {LABELS[name] || name}
                </span>
                <span className="text-xs font-mono"
                  style={{ color: isWinner ? 'var(--accent)' : 'var(--text-muted)' }}>
                  {(score.mean * 100).toFixed(1)}%
                  <span className="ml-1 opacity-60">±{(score.std * 100).toFixed(1)}</span>
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-hover)' }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: isWinner ? 'var(--accent)' : 'var(--text-muted)', opacity: isWinner ? 1 : 0.4 }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, delay: i * 0.08 }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}
