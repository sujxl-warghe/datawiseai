import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Upload, MessageSquare, Settings, Sun, Moon,
  Database, ChevronRight, BarChart2, Brain, HardDrive, Wrench,
  FileText, Zap, PieChart, Trophy, TrendingUp, LogOut, User, Menu, X
} from 'lucide-react'
import { useApp } from '../../App'
import { useAuth } from '../../context/AuthContext'
import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard'      },
  { to: '/upload',    icon: Upload,          label: 'Upload Data'    },
  { to: '/analyze',   icon: BarChart2,       label: 'Analyze'        },
  { to: '/charts',    icon: PieChart,        label: 'Chart Builder'  },
  { to: '/features',  icon: Wrench,          label: 'Feature Eng.'   },
  { to: '/ml',        icon: Brain,           label: 'ML Training'    },
  { to: '/compare',   icon: Trophy,          label: 'Compare Models' },
  { to: '/learning',  icon: TrendingUp,      label: 'Learning Curve' },
  { to: '/predict',   icon: Zap,             label: 'Predict'        },
  { to: '/saved',     icon: HardDrive,       label: 'Saved Models'   },
  { to: '/report',    icon: FileText,        label: 'PDF Report'     },
  { to: '/chat',      icon: MessageSquare,   label: 'Chat with Data' },
  { to: '/settings',  icon: Settings,        label: 'Settings'       },
]

// Bottom nav items for mobile (most used)
const MOBILE_NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Home'    },
  { to: '/upload',    icon: Upload,          label: 'Upload'  },
  { to: '/chat',      icon: MessageSquare,   label: 'Chat'    },
  { to: '/ml',        icon: Brain,           label: 'ML'      },
  { to: '/settings',  icon: Settings,        label: 'Settings'},
]

export default function Layout({ children }) {
  const { theme, toggleTheme, apiKey } = useApp()
  const { user, logout }               = useAuth()
  const [collapsed,    setCollapsed]   = useState(false)
  const [showProfile,  setShowProfile] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate  = useNavigate()
  const location  = useLocation()

  // Close mobile menu on route change
  useEffect(() => { setMobileMenuOpen(false) }, [location.pathname])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-primary)' }}>

      {/* ── DESKTOP SIDEBAR ── */}
      <motion.aside
        animate={{ width: collapsed ? 64 : 224 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="hidden md:flex flex-col border-r shrink-0 overflow-hidden"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-14 border-b shrink-0"
          style={{ borderColor: 'var(--border)' }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'var(--accent)', color: '#0a2e15' }}>
            <Database size={14} strokeWidth={2.5} />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.span initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.2 }}
                className="font-bold text-sm tracking-tight whitespace-nowrap"
                style={{ color: 'var(--text-primary)' }}>
                DataWise<span style={{ color: 'var(--accent)' }}>AI</span>
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-0.5">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} style={{ textDecoration: 'none' }}>
              {({ isActive }) => (
                <div
                  className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer group relative transition-all"
                  style={{
                    background:  isActive ? 'var(--accent-dim)' : 'transparent',
                    color:       isActive ? 'var(--accent)' : 'var(--text-secondary)',
                    borderLeft:  isActive ? '2px solid var(--accent)' : '2px solid transparent',
                    fontWeight:  isActive ? 500 : 400,
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)' }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                >
                  <Icon size={15} strokeWidth={isActive ? 2.2 : 1.8} className="shrink-0" />
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }} className="text-sm whitespace-nowrap truncate">
                        {label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {collapsed && (
                    <div className="absolute left-full ml-2 px-2.5 py-1.5 rounded-md text-xs font-medium
                      opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50"
                      style={{ background: 'var(--bg-card)', color: 'var(--text-primary)',
                        border: '1px solid var(--border)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                      {label}
                    </div>
                  )}
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom Controls */}
        <div className="px-2 py-3 border-t space-y-1" style={{ borderColor: 'var(--border)' }}>
          {/* User Profile or Sign In */}
          {user ? (
            <div className="relative">
              <button onClick={() => setShowProfile(s => !s)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: 'var(--accent)', color: '#0a2e15' }}>
                  {(user.avatar || user.name?.[0] || 'U').toUpperCase()}
                </div>
                <AnimatePresence>
                  {!collapsed && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="flex-1 min-w-0 text-left">
                      <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {user.name}
                      </p>
                      <p className="truncate" style={{ color: 'var(--text-muted)', fontSize: 10 }}>
                        {user.email}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>

              <AnimatePresence>
                {showProfile && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="absolute bottom-full left-0 mb-1 w-52 rounded-xl border shadow-xl z-50 overflow-hidden"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border)',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
                    <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                          style={{ background: 'var(--accent)', color: '#0a2e15' }}>
                          {(user.avatar || user.name?.[0] || 'U').toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{user.name}</p>
                          <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                            {user.role || 'Student'}{user.institution ? ` · ${user.institution}` : ''}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="py-1">
                      <button onClick={() => { navigate('/settings'); setShowProfile(false) }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors"
                        style={{ color: 'var(--text-secondary)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <User size={14} /> Profile & Settings
                      </button>
                      <button onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors"
                        style={{ color: '#f87171' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.06)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <LogOut size={14} /> Sign Out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              {showProfile && <div className="fixed inset-0 z-40" onClick={() => setShowProfile(false)} />}
            </div>
          )}

          {/* Sign In Button for Guests */}
          {!user && (
            <button onClick={() => navigate('/login')}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <User size={15} strokeWidth={1.8} className="shrink-0" />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }} className="text-sm whitespace-nowrap">
                    Sign In
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          )}

          {/* API key status */}
          {!collapsed && (
            <div className="px-3 py-1.5 rounded-lg"
              style={{ background: apiKey ? 'rgba(134,239,172,0.06)' : 'rgba(251,191,36,0.06)' }}>
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${apiKey ? 'bg-green-400' : 'bg-amber-400'}`} />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {apiKey ? 'Groq key set' : 'No API key'}
                </span>
              </div>
            </div>
          )}

          {/* Theme */}
          <button onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            {theme === 'dark' ? <Sun size={15} strokeWidth={1.8} /> : <Moon size={15} strokeWidth={1.8} />}
            <AnimatePresence>
              {!collapsed && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}>
                  {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          {/* Collapse */}
          <button onClick={() => setCollapsed(c => !c)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <motion.div animate={{ rotate: collapsed ? 0 : 180 }} transition={{ duration: 0.25 }}>
              <ChevronRight size={15} strokeWidth={1.8} />
            </motion.div>
            <AnimatePresence>
              {!collapsed && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}>
                  Collapse
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </motion.aside>

      {/* ── MOBILE FULL MENU DRAWER ── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 z-40"
              style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
              onClick={() => setMobileMenuOpen(false)}
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="md:hidden fixed left-0 top-0 bottom-0 z-50 flex flex-col"
              style={{
                width: 280, background: 'var(--bg-secondary)',
                borderRight: '1px solid var(--border)',
              }}
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between px-4 h-14 border-b"
                style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: 'var(--accent)', color: '#0a2e15' }}>
                    <Database size={14} strokeWidth={2.5} />
                  </div>
                  <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                    DataWise<span style={{ color: 'var(--accent)' }}>AI</span>
                  </span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)}
                  style={{ color: 'var(--text-muted)' }}>
                  <X size={20} />
                </button>
              </div>

              {/* User Info */}
              {user && (
                <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{ background: 'var(--accent)', color: '#0a2e15' }}>
                      {(user.avatar || user.name?.[0] || 'U').toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                        {user.name}
                      </p>
                      <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                        {user.role || 'Student'}
                        {user.institution ? ` · ${user.institution}` : ''}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* All Nav Links */}
              <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
                {NAV.map(({ to, icon: Icon, label }) => (
                  <NavLink key={to} to={to} style={{ textDecoration: 'none' }}>
                    {({ isActive }) => (
                      <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all"
                        style={{
                          background:  isActive ? 'var(--accent-dim)' : 'transparent',
                          color:       isActive ? 'var(--accent)' : 'var(--text-secondary)',
                          borderLeft:  isActive ? '2px solid var(--accent)' : '2px solid transparent',
                          fontWeight:  isActive ? 500 : 400,
                        }}>
                        <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} className="shrink-0" />
                        <span className="text-sm">{label}</span>
                      </div>
                    )}
                  </NavLink>
                ))}
              </nav>

              {/* Drawer Footer */}
              <div className="px-3 py-3 border-t space-y-1" style={{ borderColor: 'var(--border)' }}>
                {!user && (
                  <button onClick={() => { navigate('/login'); setMobileMenuOpen(false) }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm"
                    style={{ color: 'var(--accent)' }}>
                    <User size={15} /> Sign In
                  </button>
                )}
                <button onClick={toggleTheme}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm"
                  style={{ color: 'var(--text-secondary)' }}>
                  {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
                  {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                </button>
                {user && (
                  <button onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm"
                    style={{ color: '#f87171' }}>
                    <LogOut size={15} /> Sign Out
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Mobile Top Bar */}
        <div className="md:hidden flex items-center justify-between px-4 h-14 border-b shrink-0"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
          <button onClick={() => setMobileMenuOpen(true)}
            style={{ color: 'var(--text-secondary)' }}>
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--accent)', color: '#0a2e15' }}>
              <Database size={12} strokeWidth={2.5} />
            </div>
            <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
              DataWise<span style={{ color: 'var(--accent)' }}>AI</span>
            </span>
          </div>
          <button onClick={toggleTheme} style={{ color: 'var(--text-secondary)' }}>
            {theme === 'dark' ? <Sun size={18} strokeWidth={1.8} /> : <Moon size={18} strokeWidth={1.8} />}
          </button>
        </div>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          {children}
        </main>

        {/* ── MOBILE BOTTOM NAV ── */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-around px-2 py-1.5">
            {MOBILE_NAV.map(({ to, icon: Icon, label }) => (
              <NavLink key={to} to={to} style={{ textDecoration: 'none', flex: 1 }}>
                {({ isActive }) => (
                  <div className="flex flex-col items-center gap-0.5 py-1.5 rounded-xl transition-all"
                    style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }}>
                    <div className="w-6 h-6 flex items-center justify-center">
                      {isActive && (
                        <motion.div layoutId="mobile-nav-pill"
                          className="absolute w-8 h-8 rounded-xl"
                          style={{ background: 'var(--accent-dim)' }} />
                      )}
                      <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} style={{ position: 'relative', zIndex: 1 }} />
                    </div>
                    <span style={{ fontSize: 9, fontWeight: isActive ? 600 : 400 }}>{label}</span>
                  </div>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
