import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useState, useEffect, createContext, useContext } from 'react'
import Layout from './components/ui/Layout'
import Dashboard from './pages/Dashboard'
import Upload from './pages/Upload'
import Chat from './pages/Chat'
import Settings from './pages/Settings'
import Analyze from './pages/Analyze'
import ML from './pages/ML'

export const AppContext = createContext(null)
export function useApp() { return useContext(AppContext) }

export default function App() {
  const [theme, setTheme]         = useState(() => localStorage.getItem('theme') || 'dark')
  const [apiKey, setApiKey]       = useState(() => localStorage.getItem('openai_key') || '')
  const [activeFile, setActiveFile] = useState(null)

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light')
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')
  const saveApiKey  = (key) => { setApiKey(key); localStorage.setItem('openai_key', key) }

  return (
    <AppContext.Provider value={{ theme, toggleTheme, apiKey, saveApiKey, activeFile, setActiveFile }}>
      <Toaster position="top-right" toastOptions={{
        style: { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-strong)', fontSize: '13px', borderRadius: '10px' },
        success: { iconTheme: { primary: 'var(--accent)', secondary: 'var(--bg-primary)' } },
      }} />
      <Layout>
        <Routes>
          <Route path="/"              element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard"     element={<Dashboard />} />
          <Route path="/upload"        element={<Upload />} />
          <Route path="/analyze"       element={<Analyze />} />
          <Route path="/ml"            element={<ML />} />
          <Route path="/chat"          element={<Chat />} />
          <Route path="/chat/:fileId"  element={<Chat />} />
          <Route path="/settings"      element={<Settings />} />
        </Routes>
      </Layout>
    </AppContext.Provider>
  )
}
