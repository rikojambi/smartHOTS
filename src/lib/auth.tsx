import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { db } from '../db/db'
import type { Role, Student, Teacher, User } from '../types'

const SESSION_KEY = 'smart-hots-session'

interface AuthState {
  user: User | null
  student: Student | null
  teacher: Teacher | null
  ready: boolean
  login: (username: string, password: string) => Promise<{ ok: boolean; message?: string }>
  logout: () => void
}

const AuthContext = createContext<AuthState>({} as AuthState)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(() => localStorage.getItem(SESSION_KEY))
  const [user, setUser] = useState<User | null>(null)
  const [student, setStudent] = useState<Student | null>(null)
  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let alive = true
    async function load() {
      if (!userId) { setReady(true); return }
      const u = await db.users.get(userId)
      if (!u || !u.active) {
        localStorage.removeItem(SESSION_KEY)
        setUserId(null)
      } else {
        setUser(u)
        if (u.role === 'student') {
          setStudent(await db.students.where('userId').equals(u.id).first() || null)
        } else if (u.role === 'teacher') {
          setTeacher(await db.teachers.where('userId').equals(u.id).first() || null)
        }
      }
      if (alive) setReady(true)
    }
    load()
    return () => { alive = false }
  }, [userId])

  async function login(username: string, password: string) {
    const found = await db.users.where('username').equals(username.trim().toLowerCase()).first()
    if (!found || found.password !== password) return { ok: false, message: 'Username atau kata sandi salah.' }
    if (!found.active) return { ok: false, message: 'Akun tidak aktif. Hubungi administrator.' }
    localStorage.setItem(SESSION_KEY, found.id)
    setUserId(found.id)
    return { ok: true }
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY)
    setUserId(null); setUser(null); setStudent(null); setTeacher(null)
  }

  return <AuthContext.Provider value={{ user, student, teacher, ready, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() { return useContext(AuthContext) }

export function hasRole(role: Role | Role[], user: User | null) {
  if (!user) return false
  return Array.isArray(role) ? role.includes(user.role) : user.role === role
}
