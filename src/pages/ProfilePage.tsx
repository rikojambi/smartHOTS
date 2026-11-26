import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, queueSync } from '../db/db'
import { useAuth } from '../lib/auth'
import { Badge, Button, Card, Field } from '../components/ui'

export default function ProfilePage() {
  const { user, student } = useAuth()
  const classes = useLiveQuery(() => db.classes.toArray(), []) || []
  const [name, setName] = useState('')
  const [className, setClassName] = useState('')
  const [school, setSchool] = useState('')
  const [message, setMessage] = useState('')
  useEffect(() => { setName(student?.name || ''); setClassName(student?.className || ''); setSchool(student?.school || '') }, [student])

  async function save() {
    if (!student || !name.trim()) return
    await db.students.update(student.id, { name: name.trim(), className, school })
    await db.users.update(student.userId, { name: name.trim() })
    await queueSync('students', student.id)
    setMessage('Profil berhasil diperbarui.')
  }

  return <div className="max-w-3xl space-y-5">
    <div><h1 className="text-2xl font-extrabold">Profil Siswa</h1><p className="text-sm text-slate-500">Perbarui data diri yang ditampilkan pada laporan belajar.</p></div>
    {message && <div className="rounded-xl bg-teal-50 p-3 text-sm text-teal-800">{message}</div>}
    <Card><div className="mb-5 flex items-center gap-4"><div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-100 text-2xl font-extrabold text-teal-800">{name.charAt(0) || 'S'}</div><div><div className="text-lg font-bold">{name}</div><div className="text-sm text-slate-500">@{user?.username} • <Badge className="bg-teal-100 text-teal-700">Siswa</Badge></div></div></div>
      <div className="grid gap-4 sm:grid-cols-2"><Field label="Nama lengkap"><input className="input" value={name} onChange={e => setName(e.target.value)} /></Field><Field label="Kelas"><select className="input" value={className} onChange={e => setClassName(e.target.value)}>{classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select></Field><Field label="Sekolah"><input className="input" value={school} onChange={e => setSchool(e.target.value)} /></Field></div>
      <div className="mt-5 flex justify-end"><Button onClick={save}>Simpan profil</Button></div>
    </Card>
  </div>
}
