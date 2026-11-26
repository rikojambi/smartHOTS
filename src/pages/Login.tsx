import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { BookOpenCheck, GraduationCap, ShieldCheck, Sparkles } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { Button, Field } from '../components/ui'

const DEMOS = [
  { label: 'Guru', username: 'guru', password: 'guru123', icon: BookOpenCheck },
  { label: 'Siswa', username: 'siswa', password: 'siswa123', icon: GraduationCap },
  { label: 'Admin', username: 'admin', password: 'admin123', icon: ShieldCheck }
]

export default function Login() {
  const { login, user } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  if (user) return <Navigate to="/dashboard" replace />

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true)
    const res = await login(username, password)
    setLoading(false)
    if (!res.ok) setError(res.message || 'Gagal masuk.')
    else navigate('/dashboard', { replace: true })
  }

  async function demoLogin(username: string, password: string) {
    setUsername(username); setPassword(password); setError(''); setLoading(true)
    const res = await login(username, password)
    setLoading(false)
    if (!res.ok) setError(res.message || 'Gagal masuk.')
    else navigate('/dashboard', { replace: true })
  }

  return <div className="grid min-h-screen lg:grid-cols-2">
    <div className="flex items-center justify-center p-6 sm:p-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-700 text-lg font-black text-white">SH</div>
          <div><div className="text-xl font-extrabold text-teal-800">SMART HOTS</div><div className="text-xs font-semibold uppercase tracking-widest text-slate-400">SMA Class X</div></div>
        </div>
        <h1 className="text-2xl font-bold text-slate-800">Selamat datang kembali</h1>
        <p className="mt-1 text-sm text-slate-500">Masuk untuk melatih dan menganalisis kemampuan berpikir tingkat tinggi.</p>
        <form onSubmit={submit} className="mt-7 space-y-4">
          <Field label="Username"><input className="input" value={username} onChange={e => setUsername(e.target.value)} placeholder="username" autoComplete="username" required /></Field>
          <Field label="Kata sandi"><input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" required /></Field>
          {error && <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
          <Button className="w-full" disabled={loading}>{loading ? 'Memeriksa…' : 'Masuk'}</Button>
        </form>
        <div className="mt-8">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400"><Sparkles size={14} /> Akun demo</div>
          <div className="grid grid-cols-3 gap-2">
            {DEMOS.map(d => <button key={d.username} disabled={loading} onClick={() => demoLogin(d.username, d.password)}
              className="rounded-xl border border-slate-200 bg-white p-3 text-center text-xs font-semibold text-slate-600 hover:border-teal-500 hover:text-teal-700 disabled:opacity-60">
              <d.icon size={18} className="mx-auto mb-1" />{d.label}
            </button>)}
          </div>
        </div>
      </div>
    </div>
    <div className="hidden bg-gradient-to-br from-teal-800 via-teal-700 to-slate-900 p-12 text-white lg:flex lg:flex-col lg:justify-center">
      <div className="max-w-lg">
        <h2 className="text-4xl font-extrabold leading-tight">Latihan HOTS yang <span className="text-teal-200">terarah</span>, bukan sekadar nilai.</h2>
        <p className="mt-5 text-teal-50/80">SMART HOTS memetakan penguasaan siswa per materi, TP, dan indikator—lalu memberi rekomendasi remedial yang spesifik.</p>
        <div className="mt-10 grid grid-cols-2 gap-4">
          {['100 soal HOTS awal', '10 mata pelajaran', 'Analisis per indikator', 'Mode offline PWA'].map(x => <div key={x} className="rounded-2xl border border-white/15 bg-white/10 p-4 text-sm font-semibold">✓ {x}</div>)}
        </div>
      </div>
    </div>
  </div>
}
