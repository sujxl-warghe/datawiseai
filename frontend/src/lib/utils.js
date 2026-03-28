export function formatBytes(bytes) {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function formatNumber(n) {
  if (n == null) return '—'
  return new Intl.NumberFormat().format(n)
}

export function formatDate(d) {
  if (!d) return '—'
  return new Intl.DateTimeFormat('en', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(d))
}

export function formatRelative(d) {
  if (!d) return ''
  const diff = Date.now() - new Date(d).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export function getFileIcon(filename) {
  if (!filename) return '📄'
  const ext = filename.split('.').pop().toLowerCase()
  if (ext === 'csv') return '📊'
  if (['xlsx', 'xls'].includes(ext)) return '📗'
  return '📄'
}

export function getDtypeLabel(dtype) {
  if (dtype.includes('int') || dtype.includes('float')) return 'numeric'
  if (dtype.includes('datetime')) return 'date'
  if (dtype === 'bool') return 'bool'
  return 'text'
}

export function getDtypeColor(dtype) {
  const label = getDtypeLabel(dtype)
  const map = {
    numeric: 'text-blue-400',
    date: 'text-purple-400',
    bool: 'text-yellow-400',
    text: 'text-green-400',
  }
  return map[label] || 'text-gray-400'
}

export function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadCSV(records, columns, filename) {
  const header = columns.join(',')
  const rows = records.map(r => columns.map(c => {
    const v = r[c]
    if (v == null) return ''
    if (typeof v === 'string' && v.includes(',')) return `"${v}"`
    return v
  }).join(','))
  const csv = [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
