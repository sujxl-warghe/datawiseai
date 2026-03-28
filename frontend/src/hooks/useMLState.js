import { useState, useEffect } from 'react'

const STORAGE_KEY = 'datawise_ml_state'

const defaultState = {
  selectedFile: null,
  taskType:     'classification',
  targetCol:    '',
  featureCols:  [],
  algorithm:    'auto',
  autoTune:     false,
  testSize:     0.2,
  result:       null,
  saved:        false,
  modelName:    '',
}

export function useMLState() {
  const [state, setState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? { ...defaultState, ...JSON.parse(stored) } : defaultState
    } catch {
      return defaultState
    }
  })

  // Persist on every change (skip base64 charts — too large)
  useEffect(() => {
    try {
      const toStore = { ...state }
      if (toStore.result) {
        toStore.result = { ...toStore.result, charts: null }
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore))
    } catch {
      // quota exceeded — skip silently
    }
  }, [state])

  const set    = (key, val) => setState(prev => ({ ...prev, [key]: val }))
  const reset  = ()         => { setState(defaultState); localStorage.removeItem(STORAGE_KEY) }

  return { state, set, reset }
}
