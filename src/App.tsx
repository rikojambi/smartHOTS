import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, hasRole, useAuth } from './lib/auth'
import Layout from './components/Layout'
import type { Role } from './types'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import QuestionBank from './pages/QuestionBank'
import ImportPage from './pages/ImportPage'
import TopicsPage from './pages/TopicsPage'
import ExercisesPage from './pages/ExercisesPage'
import AnalyticsPage from './pages/AnalyticsPage'
import AdminPage from './pages/AdminPage'
import SettingsPage from './pages/SettingsPage'
import ExportPage from './pages/ExportPage'
import StudentExercises from './pages/StudentExercises'
import Practice from './pages/Practice'
import ResultPage from './pages/ResultPage'
import HistoryPage from './pages/HistoryPage'
import ReportPage from './pages/ReportPage'
import ProfilePage from './pages/ProfilePage'

function Guard({ roles, children }: { roles?: Role[]; children: React.ReactNode }) {
  const { user, ready } = useAuth()
  if (!ready) return <div className="flex h-screen items-center justify-center text-sm text-slate-500">Memuat…</div>
  if (!user) return <Navigate to="/login" replace />
  if (roles && !hasRole(roles, user)) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function AppRoutes() {
  return <Routes>
    <Route path="/login" element={<Login />} />
    <Route element={<Guard><Layout /></Guard>}>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/bank-soal" element={<Guard roles={['teacher', 'admin']}><QuestionBank /></Guard>} />
      <Route path="/import" element={<Guard roles={['teacher', 'admin']}><ImportPage /></Guard>} />
      <Route path="/materi" element={<Guard roles={['teacher', 'admin']}><TopicsPage /></Guard>} />
      <Route path="/latihan" element={<Guard roles={['teacher', 'admin']}><ExercisesPage /></Guard>} />
      <Route path="/analisis" element={<Guard roles={['teacher', 'admin']}><AnalyticsPage /></Guard>} />
      <Route path="/ekspor" element={<Guard roles={['teacher', 'admin']}><ExportPage /></Guard>} />
      <Route path="/pengguna" element={<Guard roles={['admin']}><AdminPage /></Guard>} />
      <Route path="/pengaturan" element={<Guard roles={['admin', 'teacher']}><SettingsPage /></Guard>} />
      <Route path="/latihan-siswa" element={<Guard roles={['student']}><StudentExercises /></Guard>} />
      <Route path="/practice/:attemptId" element={<Guard roles={['student']}><Practice /></Guard>} />
      <Route path="/hasil/:attemptId" element={<Guard roles={['student', 'teacher', 'admin']}><ResultPage /></Guard>} />
      <Route path="/riwayat" element={<Guard roles={['student']}><HistoryPage /></Guard>} />
      <Route path="/laporan" element={<Guard roles={['student']}><ReportPage /></Guard>} />
      <Route path="/profil" element={<Guard roles={['student']}><ProfilePage /></Guard>} />
    </Route>
    <Route path="/" element={<Navigate to="/dashboard" replace />} />
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes>
}

export default function App() {
  return <BrowserRouter><AuthProvider><AppRoutes /></AuthProvider></BrowserRouter>
}
