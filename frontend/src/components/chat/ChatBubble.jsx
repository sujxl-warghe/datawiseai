import { useState } from 'react'
import { motion } from 'framer-motion'
import { Database, User, ChevronDown, ChevronUp, Download, BarChart2, Table } from 'lucide-react'
import { formatRelative, downloadCSV, downloadJSON } from '../../lib/utils'
import DataTable from '../ui/DataTable'
import ResultChart from './ResultChart'

export default function ChatBubble({ message, index }) {
  const isUser = message.role === 'user'
  const [showSQL, setShowSQL] = useState(false)
  const [viewMode, setViewMode] = useState('table') // table | chart

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
        style={{
          background: isUser ? 'var(--accent-dim)' : 'var(--bg-hover)',
          border: '1px solid var(--border)',
        }}
      >
        {isUser
          ? <User size={14} style={{ color: 'var(--accent)' }} strokeWidth={2} />
          : <Database size={14} style={{ color: 'var(--text-secondary)' }} strokeWidth={1.8} />
        }
      </div>

      {/* Content */}
      <div className={`flex-1 max-w-3xl ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
        {/* Message bubble */}
        <div
          className="rounded-2xl px-4 py-3 text-sm leading-relaxed"
          style={{
            background: isUser ? 'var(--accent-dim)' : 'var(--bg-card)',
            border: `1px solid ${isUser ? 'var(--accent-border)' : 'var(--border)'}`,
            color: isUser ? 'var(--accent)' : 'var(--text-primary)',
            borderBottomRightRadius: isUser ? 4 : undefined,
            borderBottomLeftRadius: !isUser ? 4 : undefined,
          }}
        >
          {message.content}
        </div>

        {/* Error */}
        {message.error && (
          <div className="text-xs px-3 py-2 rounded-lg text-red-400" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            ⚠ {message.error}
          </div>
        )}

        {/* SQL toggle */}
        {!isUser && message.sql && (
          <button
            onClick={() => setShowSQL(s => !s)}
            className="flex items-center gap-1.5 text-xs transition-colors"
            style={{ color: showSQL ? 'var(--accent)' : 'var(--text-muted)' }}
          >
            <Database size={11} />
            {showSQL ? 'Hide SQL' : 'View SQL'}
            {showSQL ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
        )}

        {showSQL && message.sql && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="w-full rounded-xl overflow-hidden border"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between px-3 py-2 border-b" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
              <span className="text-xs font-mono font-medium" style={{ color: 'var(--text-muted)' }}>SQL</span>
            </div>
            <pre className="px-4 py-3 text-xs font-mono overflow-x-auto" style={{ background: 'var(--bg-card)', color: 'var(--accent)', lineHeight: 1.7 }}>
              {message.sql}
            </pre>
          </motion.div>
        )}

        {/* Results */}
        {!isUser && message.result && message.result.records?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="w-full"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {message.result.records.length} rows returned
              </span>
              <div className="flex items-center gap-2">
                <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
                  <button
                    onClick={() => setViewMode('table')}
                    className="px-2.5 py-1.5 text-xs flex items-center gap-1 transition-colors"
                    style={{
                      background: viewMode === 'table' ? 'var(--accent-dim)' : 'var(--bg-secondary)',
                      color: viewMode === 'table' ? 'var(--accent)' : 'var(--text-muted)',
                    }}
                  >
                    <Table size={11} /> Table
                  </button>
                  <button
                    onClick={() => setViewMode('chart')}
                    className="px-2.5 py-1.5 text-xs flex items-center gap-1 transition-colors"
                    style={{
                      background: viewMode === 'chart' ? 'var(--accent-dim)' : 'var(--bg-secondary)',
                      color: viewMode === 'chart' ? 'var(--accent)' : 'var(--text-muted)',
                    }}
                  >
                    <BarChart2 size={11} /> Chart
                  </button>
                </div>
                <button
                  onClick={() => downloadCSV(message.result.records, message.result.columns, 'results.csv')}
                  className="px-2.5 py-1.5 text-xs flex items-center gap-1 rounded-lg border transition-colors"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'var(--bg-secondary)' }}
                >
                  <Download size={11} /> CSV
                </button>
              </div>
            </div>

            {viewMode === 'table' ? (
              <DataTable
                columns={message.result.columns}
                rows={message.result.records}
                filename="results"
                maxHeight="280px"
              />
            ) : (
              <ResultChart data={message.result} />
            )}
          </motion.div>
        )}

        {/* Timestamp */}
        <span className="text-xs" style={{ color: 'var(--text-muted)', fontSize: 10 }}>
          {formatRelative(message.created_at)}
        </span>
      </div>
    </motion.div>
  )
}
