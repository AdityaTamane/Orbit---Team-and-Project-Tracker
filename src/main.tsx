import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { applyTheme, useUI } from './lib/store'
import './index.css'

applyTheme(useUI.getState().theme)
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (useUI.getState().theme === 'system') applyTheme('system')
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
