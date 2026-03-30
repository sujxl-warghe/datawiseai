import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'https://datawiseai.onrender.com'

const api = axios.create({ baseURL: BASE_URL, timeout: 120000 })

api.interceptors.response.use(
  r => r,
  err => Promise.reject(new Error(err.response?.data?.detail || err.message || 'Request failed'))
)

// Files
export const uploadFile   = (formData, onProgress) =>
  api.post('/api/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: e => onProgress?.(Math.round((e.loaded * 100) / e.total)),
  }).then(r => r.data)
export const listFiles    = ()            => api.get('/api/files/').then(r => r.data)
export const getFile      = (id)          => api.get(`/api/files/${id}`).then(r => r.data)
export const previewFile  = (id, rows=50) => api.get(`/api/files/${id}/preview?rows=${rows}`).then(r => r.data)
export const deleteFile   = (id)          => api.delete(`/api/files/${id}`).then(r => r.data)

// Query
export const askQuery      = (payload)            => api.post('/api/query/ask', payload).then(r => r.data)
export const createSession = (fileId)             => api.post(`/api/query/session/new?file_id=${fileId}`).then(r => r.data)
export const getSession    = (sessionId)          => api.get(`/api/query/session/${sessionId}`).then(r => r.data)
export const sendMessage   = (sessionId, payload) => api.post(`/api/query/session/${sessionId}/message`, payload).then(r => r.data)

// History
export const getQueryHistory = (fileId) => api.get(`/api/history/queries/${fileId}`).then(r => r.data)
export const getSessions     = (fileId) => api.get(`/api/history/sessions/${fileId}`).then(r => r.data)
export const clearHistory    = (fileId) => api.delete(`/api/history/queries/${fileId}`).then(r => r.data)

// ML
export const trainModel      = (payload)  => api.post('/api/ml/train', payload).then(r => r.data)
export const autoSelect      = (fileId, targetCol, featureCols, taskType) =>
  api.get(`/api/ml/auto-select?file_id=${fileId}&target_col=${targetCol}&feature_cols=${featureCols.join(',')}&task_type=${taskType}`).then(r => r.data)
export const getEDA          = (fileId)   => api.get(`/api/ml/eda/${fileId}`).then(r => r.data)
export const listModels      = (fileId)   => api.get(`/api/ml/models/${fileId}`).then(r => r.data)
export const deleteModel     = (modelId)  => api.delete(`/api/ml/models/${modelId}`).then(r => r.data)
export const predictModel    = (modelId, data) => api.post(`/api/ml/predict/${modelId}`, { model_id: modelId, data }).then(r => r.data)
export const saveModel       = (modelId, name) => api.post(`/api/ml/models/${modelId}/save${name ? `?name=${encodeURIComponent(name)}` : ''}`).then(r => r.data)
export const listSavedModels = ()         => api.get('/api/ml/saved').then(r => r.data)
export const downloadModel   = (fileId, modelId) => `${BASE_URL}/api/ml/models/${fileId}/${modelId}/download`

// Feature Engineering
export const getFeatureInfo       = (fileId)          => api.get(`/api/features/info/${fileId}`).then(r => r.data)
export const previewTransform     = (payload)         => api.post('/api/features/preview', payload).then(r => r.data)
export const applyTransform       = (payload)         => api.post('/api/features/apply', payload).then(r => r.data)
export const getFeatureSession    = (fileId)          => api.get(`/api/features/session/${fileId}`).then(r => r.data)
export const previewEngineered    = (fileId, rows=50) => api.get(`/api/features/preview/${fileId}?rows=${rows}`).then(r => r.data)
export const resetFeatureSession  = (fileId)          => api.delete(`/api/features/session/${fileId}`).then(r => r.data)
export const downloadEngineered   = (fileId)          => `${BASE_URL}/api/features/download/${fileId}`

export const learningCurve  = (payload) => api.post('/api/ml/learning-curve', payload).then(r => r.data)
export const compareModels = (payload) => api.post('/api/ml/compare', payload).then(r => r.data)

export default api
