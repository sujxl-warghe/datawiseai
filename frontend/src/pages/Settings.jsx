import { useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Check, Key, Palette, Info } from 'lucide-react'
import { useApp } from '../App'
import toast from 'react-hot-toast'

export default function Settings() {
  const { apiKey, saveApiKey, theme, toggleTheme } = useApp()
  const [keyInput, setKeyInput] = useState(apiKey || '')
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    saveApiKey(keyInput.trim())
    setSaved(true)
    toast.success('API key saved')
    setTimeout(() => setSaved(false), 2000)
  }

  const maskKey = (k) => {
    if (!k) return ''
    return k.slice(0, 7) + '•'.repeat(Math.max(0, k.length - 11)) + k.slice(-4)
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight mb-1.5" style={{ color: 'var(--text-primary)' }}>
          Settings
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Configure your DataWiseAI workspace
        </p>
      </motion.div>

      <div className="space-y-5">
        {/* API Key */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'var(--accent-dim)' }}>
              <Key size={15} style={{ color: 'var(--accent)' }} strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-sm font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>
                Groq API Key
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Required for natural language queries. Stored locally in your browser.
              </p>
            </div>
          </div>

          <div className="relative mb-3">
            <input
              type={showKey ? 'text' : 'password'}
              value={keyInput}
              onChange={e => setKeyInput(e.target.value)}
              placeholder="gsk_..."
              className="input-base pr-10 font-mono text-sm"
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
            <button
              onClick={() => setShowKey(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--text-muted)' }}
            >
              {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={handleSave} className="btn-primary">
              {saved ? <><Check size={13} /> Saved!</> : 'Save Key'}
            </button>
            {apiKey && (
              <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                Current: {maskKey(apiKey)}
              </span>
            )}
          </div>

          <div className="mt-4 rounded-lg p-3 flex gap-2.5" style={{ background: 'var(--bg-secondary)' }}>
            <Info size={13} style={{ color: 'var(--text-muted)', marginTop: 1, flexShrink: 0 }} />
            <p className="text-xs" style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Your API key is stored only in your browser's localStorage and sent directly to Groq. It is never stored on our servers. You can get a free API key from{' '}
              <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer"
                style={{ color: 'var(--accent)' }}>
                console.groq.com
              </a>
            </p>
          </div>
        </motion.div>

        {/* Model info */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
          className="card p-5">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'var(--bg-hover)' }}>
              <span className="text-sm">⚡</span>
            </div>
            <div>
              <h2 className="text-sm font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>
                Active Model
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Configured in backend <code className="font-mono">.env</code>
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {[
              { model: 'llama-3.3-70b-versatile', label: 'Best quality (default)', badge: 'recommended' },
              { model: 'llama-3.1-8b-instant', label: 'Fastest & cheapest', badge: 'fast' },
              { model: 'mixtral-8x7b-32768', label: 'Good balance', badge: '' },
            ].map(({ model, label, badge }) => (
              <div key={model} className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                style={{ background: 'var(--bg-secondary)' }}>
                <code className="text-xs font-mono flex-1" style={{ color: 'var(--accent)' }}>{model}</code>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
                {badge && (
                  <span className="tag text-xs px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--accent-dim)', color: 'var(--accent)', fontSize: 10 }}>
                    {badge}
                  </span>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Theme */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="card p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'var(--bg-hover)' }}>
              <Palette size={15} style={{ color: 'var(--text-secondary)' }} strokeWidth={1.8} />
            </div>
            <div>
              <h2 className="text-sm font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>
                Appearance
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Choose your preferred color scheme
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            {['dark', 'light'].map(t => (
              <button
                key={t}
                onClick={() => t !== theme && toggleTheme()}
                className="flex-1 py-3 rounded-xl border text-sm font-medium transition-all"
                style={{
                  background: theme === t ? 'var(--accent-dim)' : 'var(--bg-secondary)',
                  borderColor: theme === t ? 'var(--accent-border)' : 'var(--border)',
                  color: theme === t ? 'var(--accent)' : 'var(--text-muted)',
                }}
              >
                {t === 'dark' ? '🌙 Dark' : '☀️ Light'}
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
