import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  BarChart3, BookOpen, ClipboardList, Database, FileDown, GraduationCap,
  History, LayoutDashboard, LogOut, Menu, Settings, Upload, Users, X, WifiOff
} from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '../lib/auth'
import type { Role } from '../types'

const NAV: Record<Role, { to: string; label: string; icon: typeof LayoutDashboard }[]> = {
  admin: [
    { to: '/dashboard', label: 'Ringkasan', icon: LayoutDashboard },
    { to: '/pengguna', label: 'Kelola Pengguna', icon: Users },
    { to: '/materi', label: 'Mata Pelajaran & Materi', icon: BookOpen },
    { to: '/bank-soal', label: 'Bank Soal', icon: Database },
    { to: '/analisis', label: 'Analisis', icon: BarChart3 },
    { to: '/pengaturan', label: 'Pengaturan & Backup', icon: Settings }
  ],
  teacher: [
    { to: '/dashboard', label: 'Dashboard Guru', icon: LayoutDashboard },
    { to: '/bank-soal', label: 'Bank Soal', icon: Database },
    { to: '/import', label: 'Import DOCX', icon: Upload },
    { to: '/materi', label: 'Materi & TP', icon: BookOpen },
    { to: '/latihan', label: 'Latihan', icon: ClipboardList },
    { to: '/analisis', label: 'Analisis Siswa', icon: BarChart3 },
    { to: '/ekspor', label: 'Ekspor & Cetak', icon: FileDown }
  ],
  student: [
    { to: '/dashboard', label: 'Dashboard Siswa', icon: GraduationCap },
    { to: '/latihan-siswa', label: 'Mulai Latihan', icon: ClipboardList },
    { to: '/riwayat', label: 'Riwayat Latihan', icon: History },
    { to: '/laporan', label: 'Laporan Belajar', icon: BarChart3 },
    { to: '/profil', label: 'Profil', icon: Users }
  ]
}

export default function Layout() {
  const { user, logout } = useAuth()
  const nav = user ? NAV[user.role] : []
  const [open, setOpen] = useState(false)
  const [online, setOnline] = useState(navigator.onLine)
  const [installEvent, setInstallEvent] = useState<Event | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false)
    window.addEventListener('online', on); window.addEventListener('offline', off)
    const handler = (e: Event) => { e.preventDefault(); setInstallEvent(e) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); window.removeEventListener('beforeinstallprompt', handler) }
  }, [])

  function doLogout() { logout(); navigate('/login') }
  async function install() {
    const e = installEvent as (Event & { prompt?: () => Promise<void> }) | null
    if (e?.prompt) { await e.prompt(); setInstallEvent(null) }
  }

  return <div className="min-h-screen lg:flex">
    {open && <div className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" onClick={() => setOpen(false)} />}
    <aside className={clsx('fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-white transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0', open ? 'translate-x-0' : '-translate-x-full')}>
      <div className="flex h-16 items-center justify-between border-b px-5">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-700 text-sm font-black text-white">SH</div>
          <div><div className="text-sm font-extrabold leading-tight text-teal-800">SMART HOTS</div><div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">SMA Class X</div></div>
        </div>
        <button className="lg:hidden" onClick={() => setOpen(false)}><X size={20} /></button>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {nav.map(item => <NavLink key={item.to} to={item.to} onClick={() => setOpen(false)}
          className={({ isActive }) => clsx('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
            isActive ? 'bg-teal-50 text-teal-800' : 'text-slate-600 hover:bg-slate-50')}>
          <item.icon size={18} /> {item.label}
        </NavLink>)}
      </nav>
      <div className="border-t p-3">
        {installEvent && <button onClick={install} className="mb-2 w-full rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white">Install aplikasi</button>}
        <div className="mb-2 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs">
          {online ? <span className="h-2 w-2 rounded-full bg-emerald-500" /> : <WifiOff size={14} className="text-rose-500" />}
          <span className="text-slate-600">{online ? 'Online • tersinkron' : 'Offline • data lokal'}</span>
        </div>
        <button onClick={doLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50"><LogOut size={18} /> Keluar</button>
      </div>
    </aside>

    <div className="min-w-0 flex-1">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-white/95 px-4 backdrop-blur sm:px-6">
        <button className="rounded-lg p-2 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(true)}><Menu size={22} /></button>
        <div className="hidden text-sm font-semibold text-slate-700 sm:block">Kurikulum Merdeka • Fase E • Semester 1</div>
        <div className="flex items-center gap-3">
          <div className="text-right"><div className="text-sm font-semibold">{user?.name}</div><div className="text-[11px] uppercase tracking-wide text-slate-400">{user?.role}</div></div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-800">{user?.name.charAt(0)}</div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-4 sm:p-6"><Outlet /></main>
    </div>
  </div>
}
