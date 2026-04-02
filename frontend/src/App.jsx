import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useState, useEffect, createContext, useContext } from 'react'
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
  const [theme,      setTheme]      = useState(() => localStorage.getItem('theme') || 'dark')
  const [apiKey,     setApiKey]     = useState(() => localStorage.getItem('openai_key') || '')
  const [activeFile, setActiveFile] = useState(null)

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
