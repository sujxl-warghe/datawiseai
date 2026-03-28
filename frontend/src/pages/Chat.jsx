import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Sparkles, Trash2, Info, ChevronRight } from 'lucide-react'
import { useApp } from '../App'
import { askQuery, getFile, previewFile, clearHistory, getQueryHistory } from '../lib/api'
import ChatBubble from '../components/chat/ChatBubble'
import TypingIndicator from '../components/chat/TypingIndicator'
import FileSelector from '../components/chat/FileSelector'
import ColumnPanel from '../components/ui/ColumnPanel'
import toast from 'react-hot-toast'

const SUGGESTIONS = [
  'Show me the first 10 rows',
  'What are the summary statistics?',
  'How many missing values are there?',
  'Find the top 5 most frequent values',
  'What is the distribution of numeric columns?',
]

export default function Chat() {
  const { fileId } = useParams()
  const { apiKey } = useApp()
  const navigate = useNavigate()

  const [selectedFile, setSelectedFile] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSchema, setShowSchema] = useState(false)
  const [loadingFile, setLoadingFile] = useState(false)

  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, loading])

  // Load file from URL param
  useEffect(() => {
    if (fileId) {
      setLoadingFile(true)
      getFile(fileId)
        .then(f => {
          setSelectedFile(f)
          // Load history
          return getQueryHistory(fileId)
        })
        .then(history => {
          const msgs = []
          history.reverse().forEach(q => {
            msgs.push({ role: 'user', content: q.user_query, created_at: q.created_at })
            msgs.push({
              role: 'assistant',
              content: q.insight,
              sql: q.sql,
              result: q.result,
              error: q.error,
              created_at: q.created_at,
            })
          })
          setMessages(msgs)
        })
        .catch(() => {})
        .finally(() => setLoadingFile(false))
    }
  }, [fileId])

  const handleFileSelect = (file) => {
    setSelectedFile(file)
    setMessages([])
    navigate(`/chat/${file.file_id}`, { replace: true })
  }

  const sendMessage = async (text) => {
    const query = (text || input).trim()
    if (!query) return

    if (!selectedFile) {
      toast.error('Please select a dataset first')
      return
    }
    if (!apiKey) {
      toast.error('Please add your OpenAI API key in Settings')
      navigate('/settings')
      return
    }

    const userMsg = { role: 'user', content: query, created_at: new Date().toISOString() }
    setMessages(m => [...m, userMsg])
    setInput('')
    setLoading(true)
    textareaRef.current?.focus()

    try {
      const result = await askQuery({
        file_id: selectedFile.file_id,
        user_query: query,
        openai_api_key: apiKey,
      })

      const assistantMsg = {
        role: 'assistant',
        content: result.insight,
        sql: result.sql,
        result: result.result,
        error: result.error,
        created_at: result.created_at || new Date().toISOString(),
      }
      setMessages(m => [...m, assistantMsg])
    } catch (e) {
      const errMsg = {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${e.message}`,
        error: e.message,
        created_at: new Date().toISOString(),
      }
      setMessages(m => [...m, errMsg])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearChat = async () => {
    if (!selectedFile || !messages.length) return
    if (!confirm('Clear all chat history for this file?')) return
    try {
      await clearHistory(selectedFile.file_id)
      setMessages([])
      toast.success('Chat cleared')
    } catch (e) {
      toast.error(e.message)
    }
  }

  return (
    <div className="flex h-full">
      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div
          className="flex items-center gap-3 px-6 h-14 border-b shrink-0"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-primary)' }}
        >
          <FileSelector selected={selectedFile} onSelect={handleFileSelect} />

          <div className="flex-1" />

          {selectedFile && (
            <>
              <button
                onClick={() => setShowSchema(s => !s)}
                className="btn-ghost py-1.5 px-3 text-xs"
                style={{ color: showSchema ? 'var(--accent)' : undefined, borderColor: showSchema ? 'var(--accent-border)' : undefined }}
              >
                <Info size={12} /> Schema
              </button>
              {messages.length > 0 && (
                <button onClick={clearChat} className="btn-ghost py-1.5 px-3 text-xs">
                  <Trash2 size={12} /> Clear
                </button>
              )}
            </>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-full gap-6 text-center py-12">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: 'var(--accent-dim)' }}>
                <Sparkles size={24} style={{ color: 'var(--accent)' }} strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  {selectedFile ? `Analyzing ${selectedFile.filename}` : 'Select a dataset to begin'}
                </h2>
                <p className="text-sm max-w-xs" style={{ color: 'var(--text-muted)' }}>
                  {selectedFile
                    ? 'Ask anything about your data in natural language'
                    : 'Choose a file from the dropdown above or upload a new dataset'
                  }
                </p>
              </div>

              {selectedFile && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-md w-full">
                  {SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      className="text-left px-4 py-3 rounded-xl border text-sm transition-all"
                      style={{
                        borderColor: 'var(--border)',
                        color: 'var(--text-secondary)',
                        background: 'var(--bg-secondary)',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-border)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {messages.map((msg, i) => (
            <ChatBubble key={i} message={msg} index={i} />
          ))}

          {loading && <TypingIndicator />}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div
          className="px-6 py-4 border-t shrink-0"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-primary)' }}
        >
          <div
            className="flex items-end gap-3 rounded-2xl border px-4 py-3 transition-colors"
            style={{ borderColor: 'var(--border-strong)', background: 'var(--bg-secondary)' }}
            onFocusCapture={e => e.currentTarget.style.borderColor = 'var(--accent-border)'}
            onBlurCapture={e => e.currentTarget.style.borderColor = 'var(--border-strong)'}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={selectedFile ? `Ask about ${selectedFile.filename}…` : 'Select a dataset first…'}
              disabled={!selectedFile || loading}
              rows={1}
              className="flex-1 resize-none bg-transparent outline-none text-sm leading-relaxed"
              style={{
                color: 'var(--text-primary)',
                maxHeight: 120,
                fontFamily: 'inherit',
              }}
              onInput={e => {
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
              }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || !selectedFile || loading}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-all shrink-0"
              style={{
                background: input.trim() && selectedFile && !loading ? 'var(--accent)' : 'var(--bg-hover)',
                color: input.trim() && selectedFile && !loading ? '#0a2e15' : 'var(--text-muted)',
              }}
            >
              <Send size={14} strokeWidth={2.2} />
            </button>
          </div>
          <p className="text-xs mt-2 text-center" style={{ color: 'var(--text-muted)', fontSize: 11 }}>
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>

      {/* Schema Sidebar */}
      <AnimatePresence>
        {showSchema && selectedFile && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="border-l overflow-hidden shrink-0"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
          >
            <div style={{ width: 260 }} className="h-full flex flex-col">
              <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Schema
                </span>
                <button onClick={() => setShowSchema(false)} style={{ color: 'var(--text-muted)' }}>
                  <ChevronRight size={14} />
                </button>
              </div>
              <div className="p-3 overflow-y-auto flex-1">
                <div className="mb-3 px-1">
                  <p className="text-xs font-medium truncate mb-0.5" style={{ color: 'var(--text-primary)' }}>
                    {selectedFile.filename}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {selectedFile.row_count?.toLocaleString()} rows · {selectedFile.column_count} cols
                  </p>
                </div>
                <ColumnPanel columns={selectedFile.columns} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
