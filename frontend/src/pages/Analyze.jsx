import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BarChart2, RefreshCw } from 'lucide-react'
import { listFiles, getEDA } from '../lib/api'
import FileSelector from '../components/chat/FileSelector'
import ChartImage from '../components/charts/ChartImage'
import { Skeleton } from '../components/ui/Skeleton'
import toast from 'react-hot-toast'

export default function Analyze() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [edaData, setEdaData]           = useState(null)
  const [loading, setLoading]           = useState(false)

  const loadEDA = async (file) => {
    if (!file) return
    setLoading(true)
    setEdaData(null)
    try {
      const data = await getEDA(file.file_id)
      setEdaData(data)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (file) => {
    setSelectedFile(file)
    loadEDA(file)
  }

  const CHART_TITLES = {
    correlation:  'Correlation Heatmap',
    distributions:'Feature Distributions',
    categorical:  'Categorical Distributions',
    missing:      'Missing Values',
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight mb-1.5" style={{ color: 'var(--text-primary)' }}>
          Analyze Data
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Exploratory data analysis — distributions, correlations, missing values
        </p>
      </motion.div>

      {/* File Selector */}
      <div className="flex items-center gap-3 mb-8">
        <FileSelector selected={selectedFile} onSelect={handleFileSelect} />
        {selectedFile && (
          <button
            onClick={() => loadEDA(selectedFile)}
            disabled={loading}
            className="btn-ghost py-2 px-3 text-xs"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        )}
      </div>

      {/* Empty State */}
      {!selectedFile && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'var(--accent-dim)' }}>
            <BarChart2 size={24} style={{ color: 'var(--accent)' }} strokeWidth={1.5} />
          </div>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            Select a dataset
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Choose a file to generate exploratory charts
          </p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card overflow-hidden">
              <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="p-3" style={{ background: 'var(--bg-secondary)' }}>
                <Skeleton className="h-56 w-full rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Charts Grid */}
      {edaData && !loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-5"
        >
          {Object.entries(edaData.charts).map(([key, src], i) => (
            <ChartImage
              key={key}
              src={src}
              title={CHART_TITLES[key] || key}
              delay={i * 0.08}
            />
          ))}

          {Object.keys(edaData.charts).length === 0 && (
            <div className="col-span-2 text-center py-12" style={{ color: 'var(--text-muted)' }}>
              No charts could be generated for this dataset.
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}
