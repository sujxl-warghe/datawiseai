import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import SplashScreen from './components/ui/SplashScreen.jsx'
import './index.css'

function Root() {
  // Show splash only on first load — not on HMR reloads
  const [splashDone, setSplashDone] = useState(
    () => sessionStorage.getItem('splash_shown') === 'true'
  )

  const handleSplashDone = () => {
    sessionStorage.setItem('splash_shown', 'true')
    setSplashDone(true)
  }

  return (
    <>
      {!splashDone && <SplashScreen onDone={handleSplashDone} />}
      {/* App renders underneath — instant when splash done */}
      <div style={{ opacity: splashDone ? 1 : 0, transition: 'opacity 0.3s' }}>
        <App />
      </div>
    </>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Root />
    </BrowserRouter>
  </React.StrictMode>
)
