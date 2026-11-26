import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { CheckCircle2, GraduationCap, Search, Users } from 'lucide-react'
import { db, queueSync } from '../db/db'
import { useAuth } from '../lib/auth'
import { Badge, Button, Card, EmptyState, Field, Modal } from '../components/ui'
import type { Student } from '../types'

export default function StudentSubjectsPage() {
  const { user, teacher } = useAuth()
  const students = useLiveQuery(() => db.students.toArray(), []) || []
  const subjects = useLiveQuery(() => db.subjects.toArray(), []) || []
  const exercises = useLiveQuery(() => db.exercises.toArray(), []) || []
  const classes = useLiveQuery(() => db.classes.toArray(), []) || []

  const [query, setQuery] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [editing, setEditing] = useState<Student | null>(null)
  const [draftIds, setDraftIds] = useState<string[]>([])
  const [message, setMessage] = useState('')

  const isAdmin = user?.role === 'admin'
  const allowedIds = isAdmin ? subjects.map(s => s.id) : (teacher?.subjects || [])
  const selectable = subjects.filter(s => allowedIds.includes(s.id)).sort((a, b) => a.order - b.order)

  const visible = students
    .filter(s => !classFilter || s.className === classFilter)
    .filter(s => {
      const q = query.trim().toLowerCase()
      return !q || s.name.toLowerCase().includes(q) || s.className.toLowerCase().includes(q)
    })
    .sort((a, b) => a.className.localeCompare(b.className) || a.name.localeCompare(b.name))

  function subjectName(id: string) {
    return subjects.find(s => s.id === id)?.shortName || id
  }

  function assigned(s: Student) {
    return (s.subjectIds || subjects.map(x => x.id)).filter(id => subjects.some(x => x.id === id))
  }

  function exerciseCount(s: Student) {
    const ids = assigned(s)
    return exercises.filter(e => e.active && ids.includes(e.subjectId)).length
  }

  function openEditor(s: Student) {
    const current = assigned(s)
    setEditing(s)
    setDraftIds(isAdmin ? current : current.filter(id => allowedIds.includes(id)))
    setMessage('')
  }

  function toggle(id: string) {
    setDraftIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function save() {
    if (!editing) return
    const outsideScope = isAdmin ? [] : assigned(editing).filter(id => !allowedIds.includes(id))
    const subjectIds = subjects.map(s => s.id).filter(id => outsideScope.includes(id) || draftIds.includes(id))
    await db.students.update(editing.id, { subjectIds })
    await queueSync('students', editing.id)
    setMessage(`Akses mapel ${editing.name} berhasil diperbarui.`)
    setEditing(null)
  }

  return <div className="space-y-5">
    <div>
      <h1 className="text-2xl font-extrabold">Akses Mapel Siswa</h1>
      <p className="mt-1 text-sm text-slate-500">Tentukan mata pelajaran yang boleh dikerjakan siswa. Perubahan langsung memengaruhi daftar latihan di akun siswa.</p>
    </div>

    {message && <div className="rounded-xl bg-teal-50 p-3 text-sm text-teal-800">{message}</div>}

    <Card className="flex flex-wrap items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><Users size={20} /></div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold">Cakupan pengaturan</div>
        <div className="text-xs text-slate-500">
          {isAdmin
            ? 'Admin dapat mengatur semua mata pelajaran untuk semua siswa.'
            : `Guru hanya dapat mengatur mapel yang diampu: ${selectable.map(s => s.name).join(', ') || 'belum ada'}.`}
        </div>
      </div>
      <Badge className="bg-blue-100 text-blue-700">{selectable.length} mapel dapat diatur</Badge>
    </Card>

    {!selectable.length && <Card><EmptyState title="Belum ada mapel yang dapat diatur" description="Hubungi admin untuk menetapkan mata pelajaran yang diampu guru." /></Card>}

    <Card>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Field label="Cari siswa">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-3 text-slate-400" />
            <input className="input pl-9" placeholder="Nama atau kelas" value={query} onChange={e => setQuery(e.target.value)} />
          </div>
        </Field>
        <Field label="Kelas">
          <select className="input min-w-40" value={classFilter} onChange={e => setClassFilter(e.target.value)}>
            <option value="">Semua kelas</option>
            {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </Field>
        <div className="ml-auto text-xs text-slate-500">{visible.length} siswa ditampilkan</div>
      </div>

      {visible.length ? <div className="overflow-x-auto"><table className="table">
        <thead><tr><th>Siswa</th><th>Kelas</th><th>Mapel aktif</th><th>Latihan</th><th>Aksi</th></tr></thead>
        <tbody>{visible.map(s => {
          const ids = assigned(s)
          return <tr key={s.id}>
            <td><div className="font-semibold">{s.name}</div><div className="text-xs text-slate-500">{s.school}</div></td>
            <td>{s.className}</td>
            <td><div className="flex flex-wrap gap-1">{ids.length ? <>{ids.slice(0, 4).map(id => <Badge key={id} className="bg-teal-100 text-teal-700">{subjectName(id)}</Badge>)}{ids.length > 4 && <Badge>+{ids.length - 4}</Badge>}</> : <span className="text-xs text-rose-600">Belum ada mapel</span>}</div></td>
            <td><Badge className="bg-blue-100 text-blue-700">{exerciseCount(s)} paket</Badge></td>
            <td><Button variant="secondary" disabled={!selectable.length} onClick={() => openEditor(s)}><GraduationCap size={15} /> Atur mapel</Button></td>
          </tr>
        })}</tbody>
      </table></div> : <EmptyState title="Siswa tidak ditemukan" description="Ubah kata kunci atau filter kelas." />}
    </Card>

    <Modal open={!!editing} onClose={() => setEditing(null)} title={editing ? `Akses mapel – ${editing.name}` : 'Akses mapel'} wide>
      {editing && <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 p-3 text-sm">
          <div><b>{editing.name}</b> <span className="text-slate-500">• {editing.className}</span></div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setDraftIds(selectable.map(s => s.id))}>Pilih semua</Button>
            <Button variant="secondary" onClick={() => setDraftIds([])}>Kosongkan</Button>
          </div>
        </div>

        <Field label="Mata pelajaran yang dapat dikerjakan siswa" hint="Centang mapel yang ingin diberikan. Siswa hanya melihat latihan dari mapel yang dipilih.">
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {selectable.map(s => <label key={s.id} className="flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm hover:bg-slate-50">
              <input type="checkbox" checked={draftIds.includes(s.id)} onChange={() => toggle(s.id)} className="mt-0.5 accent-teal-700" />
              <span className="flex-1"><span className="block font-semibold">{s.name}</span><span className="text-xs text-slate-500">{subjects.find(x => x.id === s.id)?.description}</span></span>
              <span className="h-3 w-3 flex-none rounded-full" style={{ background: s.color }} />
            </label>)}
          </div>
        </Field>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <div className="flex items-center gap-2 text-sm text-slate-600"><CheckCircle2 size={16} className="text-teal-600" /> {draftIds.length} mapel dipilih</div>
          <div className="flex gap-2"><Button variant="secondary" onClick={() => setEditing(null)}>Batal</Button><Button onClick={save}>Simpan akses</Button></div>
        </div>
      </div>}
    </Modal>
  </div>
}
