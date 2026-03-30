import axios from 'axios'

const BASE_URL = 'https://datawiseai.onrender.com'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 120000,
})

api.interceptors.response.use(
  r => r,
  err => {
    const msg = err.response?.data?.detail || err.message || 'Request failed'
    return Promise.reject(new Error(msg))
  }
)

// Files
export const uploadFile = (formData, onProgress) =>
  api.post('/api/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: e => onProgress?.(Math.round((e.loaded * 100) / e.total)),
  }).then(r => r.data)

export const listFiles   = ()           => api.get('/api/files/').then(r => r.data)
export const getFile     = (id)         => api.get(`/api/files/${id}`).then(r => r.data)
export const previewFile = (id, rows=50)=> api.get(`/api/files/${id}/preview?rows=${rows}`).then(r => r.data)
export const deleteFile  = (id)         => api.delete(`/api/files/${id}`).then(r => r.data)

// Query
export const askQuery      = (payload)           => api.post('/api/query/ask', payload).then(r => r.data)
export const createSession = (fileId)            => api.post(`/api/query/session/new?file_id=${fileId}`).then(r => r.data)
export const getSession    = (sessionId)         => api.get(`/api/query/session/${sessionId}`).then(r => r.data)
export const sendMessage   = (sessionId, payload)=> api.post(`/api/query/session/${sessionId}/message`, payload).then(r => r.data)

// History
export const getQueryHistory = (fileId) => api.get(`/api/history/queries/${fileId}`).then(r => r.data)
export const getSessions     = (fileId) => api.get(`/api/history/sessions/${fileId}`).then(r => r.data)
export const clearHistory    = (fileId) => api.delete(`/api/history/queries/${fileId}`).then(r => r.data)

// ML
export const trainModel      = (payload)                              => api.post('/api/ml/train', payload).then(r => r.data)
export const autoSelect      = (fileId, targetCol, featureCols, taskType) =>
  api.get(`/api/ml/auto-select?file_id=${fileId}&target_col=${targetCol}&feature_cols=${featureCols.join(',')}&task_type=${taskType}`).then(r => r.data)
export const getEDA          = (fileId)                               => api.get(`/api/ml/eda/${fileId}`).then(r => r.data)
export const listModels      = (fileId)                               => api.get(`/api/ml/models/${fileId}`).then(r => r.data)
export const deleteModel     = (modelId)                              => api.delete(`/api/ml/models/${modelId}`).then(r => r.data)
export const predictModel    = (modelId, data)                        => api.post(`/api/ml/predict/${modelId}`, { model_id: modelId, data }).then(r => r.data)
export const downloadModel   = (fileId, modelId)                      => `${BASE_URL}/api/ml/models/${fileId}/${modelId}/download`

export default api
