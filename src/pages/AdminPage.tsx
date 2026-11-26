import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { db, queueSync, uid } from '../db/db'
import { useAuth } from '../lib/auth'
import { Badge, Button, Card, Confirm, EmptyState, Field, Modal } from '../components/ui'
import type { ClassRoom, Role, Student, Teacher, User } from '../types'

type UserDraft = User & { className?: string; school?: string; subjects?: string[] }

export default function AdminPage() {
  const { user: me } = useAuth()
  const users = useLiveQuery(() => db.users.toArray(), []) || []
  const students = useLiveQuery(() => db.students.toArray(), []) || []
  const teachers = useLiveQuery(() => db.teachers.toArray(), []) || []
  const classes = useLiveQuery(() => db.classes.toArray(), []) || []
  const subjects = useLiveQuery(() => db.subjects.toArray(), []) || []
  const [draft, setDraft] = useState<UserDraft | null>(null)
  const [del, setDel] = useState<User | null>(null)
  const [classDraft, setClassDraft] = useState<ClassRoom | null>(null)
  const [message, setMessage] = useState('')

  function blankUser(): UserDraft {
    return { id: uid('user-'), username: '', password: '', name: '', role: 'student', active: true, createdAt: Date.now(), className: classes[0]?.name || 'X-A', school: 'SMA Negeri 1', subjects: [] }
  }

  async function saveUser() {
    if (!draft?.username.trim() || !draft.password || !draft.name.trim()) { setMessage('Username, kata sandi, dan nama wajib diisi.'); return }
    const exists = users.find(u => u.username === draft.username && u.id !== draft.id)
    if (exists) { setMessage('Username sudah digunakan.'); return }
    const { className, school, subjects: subs, ...u } = draft
    const lower = { ...u, username: u.username.toLowerCase() }
    await db.users.put(lower); await queueSync('users', lower.id)
    if (lower.role === 'student') {
      await db.students.put({ id: lower.id, userId: lower.id, name: lower.name, className: className || 'X-A', school: school || '', createdAt: Date.now() })
    } else if (lower.role === 'teacher') {
      await db.teachers.put({ id: lower.id, userId: lower.id, name: lower.name, subjects: subs || [], createdAt: Date.now() })
    }
    setMessage(`Akun ${lower.username} berhasil disimpan.`); setDraft(null)
  }
  async function removeUser(u: User) {
    await db.users.delete(u.id); await db.students.where('userId').equals(u.id).delete(); await db.teachers.where('userId').equals(u.id).delete()
    setMessage(`Akun ${u.username} dihapus.`)
  }
  async function saveClass() {
    if (!classDraft?.name.trim()) return
    await db.classes.put(classDraft); setClassDraft(null); setMessage('Kelas berhasil disimpan.')
  }

  const roleBadge: Record<Role, string> = { admin: 'bg-rose-100 text-rose-700', teacher: 'bg-blue-100 text-blue-700', student: 'bg-teal-100 text-teal-700' }

  return <div className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-extrabold">Kelola Pengguna</h1><p className="text-sm text-slate-500">Akun admin, guru, dan siswa dengan hak akses berbeda.</p></div><div className="flex gap-2"><Button variant="secondary" onClick={() => setClassDraft({ id: uid('class-'), name: '', grade: 'X', semester: 1, teacherIds: [] })}>+ Kelas</Button><Button onClick={() => setDraft(blankUser())}><Plus size={16} /> Akun baru</Button></div></div>
    {message && <div className="rounded-xl bg-teal-50 p-3 text-sm text-teal-800">{message}</div>}
    <div className="grid gap-5 lg:grid-cols-3">
      <Card className="lg:col-span-2"><h2 className="mb-3 font-bold">Daftar akun</h2><div className="overflow-x-auto"><table className="table"><thead><tr><th>Nama</th><th>Username</th><th>Peran</th><th>Kelas/Mapel</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{users.map(u => <tr key={u.id}><td className="font-semibold">{u.name}</td><td>{u.username}</td><td><Badge className={roleBadge[u.role]}>{u.role}</Badge></td><td className="text-xs">{students.find(s => s.userId === u.id)?.className || teachers.find(t => t.userId === u.id)?.subjects.join(', ') || '-'}</td><td><button className="text-xs font-semibold text-teal-700" disabled={u.id === me?.id} onClick={async () => { await db.users.update(u.id, { active: !u.active }); }}>{u.active ? 'Aktif' : 'Nonaktif'}</button></td><td><div className="flex gap-1"><button className="p-1 hover:bg-slate-100" onClick={() => setDraft({ ...u, className: students.find(s => s.userId === u.id)?.className, subjects: teachers.find(t => t.userId === u.id)?.subjects })}><Pencil size={14} /></button><button className="p-1 text-rose-600" disabled={u.id === me?.id} onClick={() => setDel(u)}><Trash2 size={14} /></button></div></td></tr>)}</tbody></table></div></Card>
      <div className="space-y-5"><Card><h2 className="mb-3 font-bold">Kelas</h2>{classes.length ? <div className="space-y-2">{classes.map(c => <div key={c.id} className="flex items-center justify-between rounded-xl border p-3 text-sm"><div><b>{c.name}</b><div className="text-xs text-slate-500">Tingkat {c.grade} • Semester {c.semester}</div></div><button className="p-1" onClick={() => setClassDraft(structuredClone(c))}><Pencil size={14} /></button></div>)}</div> : <EmptyState title="Belum ada kelas" />}</Card>
        <Card><h2 className="font-bold">Statistik</h2><div className="mt-3 space-y-2 text-sm">{[
          ['Total akun', users.length], ['Siswa', students.length], ['Guru', teachers.length], ['Kelas', classes.length]
        ].map(([k, v]) => <div key={String(k)} className="flex justify-between"><span className="text-slate-500">{k}</span><b>{v}</b></div>)}</div></Card></div>
    </div>

    <Modal open={!!draft} onClose={() => setDraft(null)} title={draft && users.some(u => u.id === draft.id) ? 'Edit akun' : 'Akun baru'}>
      {draft && <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2"><Field label="Nama"><input className="input" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></Field><Field label="Username"><input className="input" value={draft.username} onChange={e => setDraft({ ...draft, username: e.target.value })} /></Field></div>
        <div className="grid gap-3 sm:grid-cols-3"><Field label="Kata sandi"><input className="input" value={draft.password} onChange={e => setDraft({ ...draft, password: e.target.value })} /></Field><Field label="Peran"><select className="input" value={draft.role} onChange={e => setDraft({ ...draft, role: e.target.value as Role })}><option value="student">Siswa</option><option value="teacher">Guru</option><option value="admin">Admin</option></select></Field><Field label="Status"><select className="input" value={draft.active ? '1' : '0'} onChange={e => setDraft({ ...draft, active: e.target.value === '1' })}><option value="1">Aktif</option><option value="0">Nonaktif</option></select></Field></div>
        {draft.role === 'student' && <div className="grid gap-3 sm:grid-cols-2"><Field label="Kelas"><select className="input" value={draft.className || ''} onChange={e => setDraft({ ...draft, className: e.target.value })}>{classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select></Field><Field label="Sekolah"><input className="input" value={draft.school || ''} onChange={e => setDraft({ ...draft, school: e.target.value })} /></Field></div>}
        {draft.role === 'teacher' && <Field label="Mata pelajaran yang diampu"><div className="mt-2 flex flex-wrap gap-3">{subjects.map(s => <label key={s.id} className="flex items-center gap-1 text-sm"><input type="checkbox" checked={(draft.subjects || []).includes(s.id)} onChange={() => setDraft({ ...draft, subjects: (draft.subjects || []).includes(s.id) ? (draft.subjects || []).filter(x => x !== s.id) : [...(draft.subjects || []), s.id] })} className="accent-teal-700" />{s.name}</label>)}</div></Field>}
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setDraft(null)}>Batal</Button><Button onClick={saveUser}>Simpan</Button></div>
      </div>}
    </Modal>

    <Modal open={!!classDraft} onClose={() => setClassDraft(null)} title="Data kelas">
      {classDraft && <div className="space-y-4"><Field label="Nama kelas"><input className="input" value={classDraft.name} onChange={e => setClassDraft({ ...classDraft, name: e.target.value })} /></Field><div className="grid grid-cols-2 gap-3"><Field label="Tingkat"><input className="input" value={classDraft.grade} onChange={e => setClassDraft({ ...classDraft, grade: e.target.value })} /></Field><Field label="Semester"><select className="input" value={classDraft.semester} onChange={e => setClassDraft({ ...classDraft, semester: Number(e.target.value) })}><option value={1}>1</option><option value={2}>2</option></select></Field></div><div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setClassDraft(null)}>Batal</Button><Button onClick={saveClass}>Simpan</Button></div></div>}
    </Modal>
    <Confirm open={!!del} onClose={() => setDel(null)} onConfirm={() => del && removeUser(del)} message={`Hapus akun ${del?.name}? Data latihan siswa tetap disimpan sebagai riwayat anonim.`} />
  </div>
}
