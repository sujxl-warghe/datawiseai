import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Database, Eye, EyeOff, UserPlus, AlertCircle, Check } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const BASE_URL = 'https://datawiseai.onrender.com'

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 20-9 20-20 0-1.3-.1-2.7-.4-4z"/>
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 18.9 13 24 13c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5.1l-6.2-5.2C29.5 35.5 26.9 36 24 36c-5.2 0-9.7-3-11.4-7.4l-6.5 5C9.5 40.4 16.3 44 24 44z"/>
    <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.4-2.5 4.4-4.6 5.8l6.2 5.2C40.6 35.5 44 30.2 44 24c0-1.3-.1-2.7-.4-4z"/>
  </svg>
)

const ROLES = [
  { value: 'student',      label: '🎓 Student'      },
  { value: 'researcher',   label: '🔬 Researcher'   },
  { value: 'professional', label: '💼 Professional' },
]

export default function Signup() {
  const { signup } = useAuth()
  const navigate   = useNavigate()

  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    institution: '', role: 'student',
  })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [step,    setStep]    = useState(1)

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleNext = e => {
    e.preventDefault()
    if (!form.name.trim())          return setError('Name is required')
    if (!form.email.trim())         return setError('Email is required')
    if (form.password.length < 6)   return setError('Password must be at least 6 characters')
    if (form.password !== form.confirmPassword) return setError('Passwords do not match')
    setError('')
    setStep(2)
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await signup(form.name, form.email, form.password, form.institution, form.role)
      navigate('/dashboard')
    } catch (e) {
      setError(e.message)
      setStep(1)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = () => {
    window.location.href = `${BASE_URL}/api/auth/google`
  }

  const pwdStrength = form.password.length === 0 ? 0
    : form.password.length < 6 ? 1
    : form.password.length < 10 ? 2 : 3
  const strengthColor = ['transparent','#f87171','#fbbf24','#86efac'][pwdStrength]
  const strengthLabel = ['','Weak','Good','Strong'][pwdStrength]

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--bg-primary)' }}>

      <div style={{
        position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)',
        width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(134,239,172,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ width: '100%', maxWidth: 440 }}
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--accent)', color: '#0a2e15' }}>
            <Database size={18} strokeWidth={2.5} />
          </div>
          <span className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            DataWise<span style={{ color: 'var(--accent)' }}>AI</span>
          </span>
        </div>

        <div className="card p-8">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            {[1, 2].map(s => (
              <div key={s} className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                  style={{ background: step >= s ? 'var(--accent)' : 'var(--bg-hover)', color: step >= s ? '#0a2e15' : 'var(--text-muted)' }}>
                  {step > s ? <Check size={12} /> : s}
                </div>
                <span className="text-xs" style={{ color: step >= s ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                  {s === 1 ? 'Account' : 'Profile'}
                </span>
                {s < 2 && <div className="w-8 h-px" style={{ background: step > s ? 'var(--accent)' : 'var(--border)' }} />}
              </div>
            ))}
          </div>

          <h1 className="text-xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
            {step === 1 ? 'Create account' : 'Complete profile'}
          </h1>
          <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
            {step === 1 ? 'Set up your DataWiseAI account' : 'Tell us a bit about yourself'}
          </p>

          {step === 1 && (
            <>
              {/* Google Sign Up */}
              <button onClick={handleGoogle}
                className="w-full flex items-center justify-center gap-3 py-2.5 rounded-xl border transition-all mb-4 text-sm font-medium"
                style={{ borderColor: 'var(--border-strong)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-secondary)'}>
                <GoogleIcon /> Continue with Google
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>or register with email</span>
                <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
              </div>

              <form onSubmit={handleNext} className="space-y-4">
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Full Name</label>
                  <input name="name" value={form.name} onChange={handleChange}
                    placeholder="Your full name" className="input-base text-sm" autoFocus />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Email</label>
                  <input name="email" type="email" value={form.email} onChange={handleChange}
                    placeholder="you@example.com" className="input-base text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Password</label>
                  <div className="relative">
                    <input name="password" type={showPwd ? 'text' : 'password'}
                      value={form.password} onChange={handleChange}
                      placeholder="Min. 6 characters" className="input-base text-sm pr-10" />
                    <button type="button" onClick={() => setShowPwd(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                      {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {form.password && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex gap-1 flex-1">
                        {[1,2,3].map(i => (
                          <div key={i} className="h-1 flex-1 rounded-full transition-all"
                            style={{ background: pwdStrength >= i ? strengthColor : 'var(--bg-hover)' }} />
                        ))}
                      </div>
                      <span className="text-xs" style={{ color: strengthColor }}>{strengthLabel}</span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Confirm Password</label>
                  <input name="confirmPassword" type="password" value={form.confirmPassword}
                    onChange={handleChange} placeholder="Re-enter password" className="input-base text-sm" />
                </div>

                {error && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
                    <AlertCircle size={13} /> {error}
                  </motion.div>
                )}

                <button type="submit" className="btn-primary w-full justify-center py-2.5 text-sm">
                  Continue →
                </button>
              </form>
            </>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Institution / College</label>
                <input name="institution" value={form.institution} onChange={handleChange}
                  placeholder="e.g. IIT Bombay, VIT, etc." className="input-base text-sm" autoFocus />
              </div>
              <div>
                <label className="text-xs font-medium mb-3 block" style={{ color: 'var(--text-secondary)' }}>I am a…</label>
                <div className="grid grid-cols-3 gap-2">
                  {ROLES.map(r => (
                    <button key={r.value} type="button"
                      onClick={() => setForm(f => ({ ...f, role: r.value }))}
                      className="py-3 px-2 rounded-xl border text-center transition-all"
                      style={{
                        background:  form.role === r.value ? 'var(--accent-dim)' : 'var(--bg-secondary)',
                        borderColor: form.role === r.value ? 'var(--accent-border)' : 'var(--border)',
                        color:       form.role === r.value ? 'var(--accent)' : 'var(--text-secondary)',
                      }}>
                      <div className="text-lg mb-1">{r.label.split(' ')[0]}</div>
                      <div className="text-xs font-medium">{r.label.split(' ')[1]}</div>
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
                  <AlertCircle size={13} /> {error}
                </motion.div>
              )}

              <div className="flex gap-2">
                <button type="button" onClick={() => setStep(1)} className="btn-ghost flex-1 justify-center py-2.5 text-sm">
                  ← Back
                </button>
                <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center py-2.5 text-sm">
                  {loading
                    ? <><span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> Creating…</>
                    : <><UserPlus size={14} /> Create Account</>
                  }
                </button>
              </div>
            </form>
          )}

          <p className="text-center text-xs mt-5" style={{ color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 500 }}>Sign in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
