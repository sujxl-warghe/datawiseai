import { useState } from 'react'
import { motion } from 'framer-motion'
import { FileText, Download, RefreshCw, CheckCircle, BarChart2, Brain, Wrench } from 'lucide-react'
import FileSelector from '../components/chat/FileSelector'
import toast from 'react-hot-toast'

const BASE_URL = 'https://datawiseai.onrender.com'

export default function Report() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [title,        setTitle]        = useState('')
  const [name,         setName]         = useState('')
  const [institution,  setInstitution]  = useState('')
  const [includeML,    setIncludeML]    = useState(true)
  const [includeEDA,   setIncludeEDA]   = useState(true)
  const [includeFE,    setIncludeFE]    = useState(true)
  const [generating,   setGenerating]   = useState(false)
  const [done,         setDone]         = useState(false)

  const handleGenerate = async () => {
    if (!selectedFile) return toast.error('Select a dataset first')
    setGenerating(true)
    setDone(false)

    try {
      const res = await fetch(`${BASE_URL}/api/reports/generate`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_id:       selectedFile.file_id,
          project_title: title || `${selectedFile.filename} — Analysis Report`,
          student_name:  name,
          institution,
          include_ml:    includeML,
          include_eda:   includeEDA,
          include_fe:    includeFE,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'PDF generation failed')
      }

      // Trigger download
      const blob     = await res.blob()
      const url      = URL.createObjectURL(blob)
      const a        = document.createElement('a')
      a.href         = url
      a.download     = `${selectedFile.filename.replace(/\.[^.]+$/, '')}_report.pdf`
      a.click()
      URL.revokeObjectURL(url)

      setDone(true)
      toast.success('PDF report downloaded!')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setGenerating(false)
    }
  }

  const Toggle = ({ value, onChange, label, icon: Icon, desc }) => (
    <div
      onClick={() => onChange(!value)}
      className="flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all"
      style={{
        background:  value ? 'var(--accent-dim)' : 'var(--bg-secondary)',
        borderColor: value ? 'var(--accent-border)' : 'var(--border)',
      }}
    >
      <Icon size={16} style={{ color: value ? 'var(--accent)' : 'var(--text-muted)', flexShrink: 0 }} />
      <div className="flex-1">
        <p className="text-sm font-medium" style={{ color: value ? 'var(--accent)' : 'var(--text-primary)' }}>
          {label}
        </p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{desc}</p>
      </div>
      <div className="w-9 h-5 rounded-full relative shrink-0 transition-colors"
        style={{ background: value ? 'var(--accent)' : 'var(--bg-hover)' }}>
        <div className="w-3.5 h-3.5 rounded-full absolute top-0.5 transition-all"
          style={{ background: 'white', left: value ? '18px' : '2px' }} />
      </div>
    </div>
  )

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight mb-1.5" style={{ color: 'var(--text-primary)' }}>
          PDF Report Generator
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Generate a professional analysis report — perfect for college submissions
        </p>
      </motion.div>

      <div className="space-y-5">

        {/* Dataset */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="card p-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            1. Select Dataset
          </p>
          <FileSelector selected={selectedFile} onSelect={f => { setSelectedFile(f); setDone(false) }} />
        </motion.div>

        {/* Report Details */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="card p-5 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            2. Report Details
          </p>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
                Report Title
              </label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={selectedFile ? `${selectedFile.filename} — Analysis Report` : 'Enter report title…'}
                className="input-base text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
                  Student Name
                </label>
                <input value={name} onChange={e => setName(e.target.value)}
                  placeholder="Your name" className="input-base text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
                  Institution
                </label>
                <input value={institution} onChange={e => setInstitution(e.target.value)}
                  placeholder="College / University" className="input-base text-sm" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Sections to include */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="card p-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            3. Sections to Include
          </p>
          <Toggle value={includeEDA}  onChange={setIncludeEDA}  icon={BarChart2}
            label="EDA Charts"          desc="Correlation, distributions, missing values" />
          <Toggle value={includeFE}   onChange={setIncludeFE}   icon={Wrench}
            label="Feature Engineering" desc="Applied transformations log" />
          <Toggle value={includeML}   onChange={setIncludeML}   icon={Brain}
            label="ML Model Results"    desc="Metrics, charts, AI suggestions" />
        </motion.div>

        {/* What's included info */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="rounded-xl p-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
            📋 Report always includes:
          </p>
          <div className="grid grid-cols-2 gap-1">
            {[
              'Cover page with title & author',
              'Dataset overview & column types',
              'Descriptive statistics table',
              'Missing value analysis',
              'Conclusion & summary',
              'Professional formatting',
            ].map(item => (
              <div key={item} className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                <span style={{ color: 'var(--accent)' }}>✓</span> {item}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Generate Button */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <button
            onClick={handleGenerate}
            disabled={!selectedFile || generating}
            className="btn-primary w-full justify-center py-3.5 text-sm"
          >
            {generating ? (
              <><RefreshCw size={15} className="animate-spin" /> Generating PDF…</>
            ) : done ? (
              <><CheckCircle size={15} /> Generate Again</>
            ) : (
              <><Download size={15} /> Generate & Download PDF</>
            )}
          </button>

          {done && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 flex items-center gap-2 text-sm justify-center"
              style={{ color: 'var(--accent)' }}
            >
              <CheckCircle size={15} />
              PDF downloaded successfully!
            </motion.div>
          )}

          {generating && (
            <p className="text-xs text-center mt-2" style={{ color: 'var(--text-muted)' }}>
              Generating EDA charts and compiling report… this may take 10–20 seconds
            </p>
          )}
        </motion.div>

      </div>
    </div>
  )
}
