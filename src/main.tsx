import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { seedDatabase } from './data/seed'
import './index.css'

const root = createRoot(document.getElementById('root')!)

root.render(<div className="flex h-screen items-center justify-center text-sm text-slate-500">Menyiapkan SMART HOTS…</div>)

seedDatabase()
  .then(() => root.render(<StrictMode><App /></StrictMode>))
  .catch(err => {
    console.error(err)
    root.render(<div className="p-10 text-rose-600">Gagal menyiapkan database: {String(err)}</div>)
  })
