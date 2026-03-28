import { createContext, useContext, useState, useEffect } from 'react'
import api from '../lib/api'

const AuthContext = createContext(null)

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)  // checking saved token

  // On mount — check saved token
  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      api.get('/api/auth/me')
        .then(r => setUser(r.data))
        .catch(() => { localStorage.removeItem('auth_token'); delete api.defaults.headers.common['Authorization'] })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const saveToken = (token) => {
    localStorage.setItem('auth_token', token)
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
  }

  const login = async (email, password) => {
    const res = await api.post('/api/auth/login', { email, password })
    saveToken(res.data.token)
    setUser(res.data.user)
    return res.data.user
  }

  const signup = async (name, email, password, institution, role) => {
    const res = await api.post('/api/auth/signup', { name, email, password, institution, role })
    saveToken(res.data.token)
    setUser(res.data.user)
    return res.data.user
  }

  const logout = () => {
    localStorage.removeItem('auth_token')
    delete api.defaults.headers.common['Authorization']
    setUser(null)
  }

  const loginWithToken = async (token) => {
    saveToken(token)
    const res = await api.get('/api/auth/me')
    setUser(res.data)
    return res.data
  }

  const updateProfile = async (data) => {
    const res = await api.put('/api/auth/profile', data)
    setUser(res.data)
    return res.data
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, updateProfile, loginWithToken }}>
      {children}
    </AuthContext.Provider>
  )
}
