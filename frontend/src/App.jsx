import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useState, useEffect, createContext, useContext } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/ui/Layout'
import Dashboard from './pages/Dashboard'
import Upload from './pages/Upload'
import Chat from './pages/Chat'
import Settings from './pages/Settings'
import Analyze from './pages/Analyze'
import ML from './pages/ML'
import SavedModels from './pages/SavedModels'
import FeatureEngineering from './pages/FeatureEngineering'
import Report from './pages/Report'
import Predict from './pages/Predict'
import ChartBuilder from './pages/ChartBuilder'
import ModelComparison from './pages/ModelComparison'
import LearningCurve from './pages/LearningCurve'
import Login from './pages/Login'
import AuthCallback from './pages/AuthCallback'
import Signup from './pages/Signup'

export const AppContext = createContext(null)
export function useApp() { return useContext(AppContext) }

function LoadingScreen() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: 'var(--bg-primary)',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        border: '2px solid var(--accent)', borderTopColor: 'transparent',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

function AppInner() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [theme,      setTheme]      = useState(() => localStorage.getItem('theme') || 'dark')
  const [apiKey,     setApiKey]     = useState(() => localStorage.getItem('openai_key') || '')
  const [activeFile, setActiveFile] = useState(null)
  const [showWelcomeModal, setShowWelcomeModal] = useState(false)

  useEffect(() => {
    const alreadyShown = localStorage.getItem('welcome_shown') === 'true'
    if (!alreadyShown) {
      setShowWelcomeModal(true)
    }
  }, [])

  const closeWelcomeModal = () => {
    setShowWelcomeModal(false)
    localStorage.setItem('welcome_shown', 'true')
  }

  const continueAsGuest = () => {
    closeWelcomeModal()
  }

  const goToSignIn = () => {
    closeWelcomeModal()
    navigate('/login')
  }

  const goToSettings = () => {
    closeWelcomeModal()
    navigate('/settings')
  }

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light')
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')
  const saveApiKey  = (key) => { setApiKey(key); localStorage.setItem('openai_key', key) }

  return (
    <AppContext.Provider value={{ theme, toggleTheme, apiKey, saveApiKey, activeFile, setActiveFile }}>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--bg-card)', color: 'var(--text-primary)',
            border: '1px solid var(--border-strong)', fontSize: '13px', borderRadius: '10px',
          },
          success: { iconTheme: { primary: 'var(--accent)', secondary: 'var(--bg-primary)' } },
        }}
      />

      <AnimatePresence>
        {showWelcomeModal && (
          <motion.div
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/65 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeWelcomeModal}
          >
            <motion.div
              className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-white">Welcome to DataWiseAI</h2>
                  <p className="mt-3 text-sm text-slate-200 leading-relaxed">
                    ⚡ For the best experience, please sign in to use all features smoothly.
                    <br />
                    🔑 To enable AI-powered analysis and chat features, add your Groq API Key in Settings.
                    <br />
                    You can continue as guest, but signing in is recommended for saving your work and accessing all features.
                  </p>
                </div>
                <button
                  onClick={closeWelcomeModal}
                  className="text-slate-300 hover:text-white rounded-full p-1 focus:outline-none"
                  aria-label="Close welcome modal"
                >
                  ✕
                </button>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <button
                  onClick={continueAsGuest}
                  className="rounded-xl border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
                >
                  Continue as Guest
                </button>
                <button
                  onClick={goToSignIn}
                  className="rounded-xl border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
                >
                  Sign In
                </button>
                <button
                  onClick={goToSettings}
                  className="rounded-xl border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
                >
                  Go to Settings
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Routes>
        <Route path="/login"  element={user ? <Navigate to="/dashboard" replace /> : <Login  />} />
        <Route path="/signup" element={user ? <Navigate to="/dashboard" replace /> : <Signup />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        <Route path="/*" element={
          <Layout>
            <Routes>
              <Route path="/"             element={<Dashboard />} />
              <Route path="/dashboard"    element={<Dashboard />} />
              <Route path="/upload"       element={<Upload />} />
              <Route path="/analyze"      element={<Analyze />} />
              <Route path="/ml"           element={<ML />} />
              <Route path="/features"     element={<FeatureEngineering />} />
              <Route path="/saved"        element={<SavedModels />} />
              <Route path="/report"       element={<Report />} />
              <Route path="/predict"      element={<Predict />} />
              <Route path="/charts"       element={<ChartBuilder />} />
              <Route path="/compare"      element={<ModelComparison />} />
              <Route path="/learning"     element={<LearningCurve />} />
              <Route path="/chat"         element={<Chat />} />
              <Route path="/chat/:fileId" element={<Chat />} />
              <Route path="/settings"     element={<Settings />} />
            </Routes>
          </Layout>
        } />
      </Routes>
    </AppContext.Provider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  )
}
