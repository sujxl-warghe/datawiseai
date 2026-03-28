import { motion } from 'framer-motion'

export default function MetricsCard({ metrics, taskType }) {
  if (!metrics) return null

  const classificationMetrics = [
    { key: 'accuracy',  label: 'Accuracy',  color: '#86efac' },
    { key: 'precision', label: 'Precision', color: '#6ee7b7' },
    { key: 'recall',    label: 'Recall',    color: '#34d399' },
    { key: 'f1_score',  label: 'F1 Score',  color: '#10b981' },
  ]

  const regressionMetrics = [
    { key: 'r2_score', label: 'R² Score', color: '#86efac', pct: true },
    { key: 'mae',      label: 'MAE',      color: '#fbbf24', pct: false },
    { key: 'rmse',     label: 'RMSE',     color: '#f87171', pct: false },
  ]

  const clusterMetrics = [
    { key: 'silhouette_score', label: 'Silhouette', color: '#86efac', pct: true },
    { key: 'n_clusters',       label: 'Clusters',   color: '#6ee7b7', pct: false },
    { key: 'inertia',          label: 'Inertia',    color: '#fbbf24', pct: false },
  ]

  const metricList =
    taskType === 'classification' ? classificationMetrics :
    taskType === 'regression'     ? regressionMetrics :
    clusterMetrics

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {metricList.map(({ key, label, color, pct }, i) => {
        const val = metrics[key]
        if (val == null) return null
        const isPct = pct !== false && val <= 1
        const display = isPct ? `${(val * 100).toFixed(1)}%` : val.toLocaleString()

        return (
          <motion.div
            key={key}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.06 }}
            className="card p-4 text-center"
          >
            <div className="text-xl font-bold mb-1" style={{ color }}>
              {display}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</div>
          </motion.div>
        )
      })}

      {/* CV Score */}
      {metrics.cv_mean != null && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="card p-4 text-center col-span-2 md:col-span-1"
          style={{ borderColor: 'var(--accent-border)' }}
        >
          <div className="text-xl font-bold mb-1" style={{ color: 'var(--accent)' }}>
            {(metrics.cv_mean * 100).toFixed(1)}%
          </div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
            CV Score <span className="opacity-60">±{(metrics.cv_std * 100).toFixed(1)}%</span>
          </div>
        </motion.div>
      )}
    </div>
  )
}
