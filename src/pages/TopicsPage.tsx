import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react'
import { db, queueSync, uid } from '../db/db'
import { Badge, Button, Card, Confirm, EmptyState, Field, Modal } from '../components/ui'
import type { Subject, Topic } from '../types'

export default function TopicsPage() {
  const subjects = useLiveQuery(() => db.subjects.orderBy('order').toArray(), []) || []
  const topics = useLiveQuery(() => db.topics.orderBy('order').toArray(), []) || []
  const questions = useLiveQuery(() => db.questions.toArray(), []) || []
  const [subject, setSubject] = useState<Subject | null>(null)
  const [topic, setTopic] = useState<Topic | null>(null)
  const [delTopic, setDelTopic] = useState<Topic | null>(null)
  const [activeSubject, setActiveSubject] = useState('')

  function newSubject(): Subject { return { id: uid('sub-'), name: '', shortName: '', description: '', categories: [], color: '#0d9488', order: subjects.length + 1 } }
  function newTopic(): Topic { return { id: uid('top-'), subjectId: activeSubject || subjects[0]?.id || '', name: '', subTopics: [], semester: 1, order: topics.length + 1, cp: '', tp: [''] } }

  async function saveSubject() {
    if (!subject?.name.trim()) return
    await db.subjects.put(subject); await queueSync('subjects', subject.id); setSubject(null)
  }
  async function saveTopic() {
    if (!topic?.name.trim() || !topic.subjectId) return
    const fixed: Topic = { ...topic, tp: topic.tp.map(t => t.trim()).filter(Boolean) }
    await db.topics.put(fixed); await queueSync('topics', fixed.id)
    await db.learningObjectives.where('topicId').equals(fixed.id).delete()
    for (const [i, desc] of fixed.tp.entries()) {
      await db.learningObjectives.put({ id: uid('lo-'), subjectId: fixed.subjectId, topicId: fixed.id, code: `${fixed.subjectId}-TP${i + 1}`, description: desc, semester: fixed.semester })
    }
    setTopic(null)
  }
  async function move(id: string, direction: -1 | 1) {
    const sorted = [...topics].sort((a, b) => a.order - b.order)
    const i = sorted.findIndex(t => t.id === id), j = i + direction
    if (i < 0 || j < 0 || j >= sorted.length) return
    await db.topics.update(sorted[i].id, { order: j + 1 })
    await db.topics.update(sorted[j].id, { order: i + 1 })
  }
  async function removeTopic(t: Topic) {
    await db.topics.delete(t.id)
    await db.learningObjectives.where('topicId').equals(t.id).delete()
    setDelTopic(null)
  }

  return <div className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-extrabold">Mata Pelajaran, Materi & TP</h1><p className="text-sm text-slate-500">Struktur pembelajaran dapat disesuaikan dengan sekolah. Perubahan tidak menghapus riwayat pengerjaan siswa.</p></div>
      <div className="flex gap-2"><Button variant="secondary" onClick={() => setSubject(newSubject())}><Plus size={16} /> Mata pelajaran</Button><Button onClick={() => { setActiveSubject(subjects[0]?.id || ''); setTopic(newTopic()) }}><Plus size={16} /> Materi</Button></div>
    </div>

    <div className="grid gap-5 lg:grid-cols-3">
      <Card className="lg:col-span-1"><h2 className="mb-3 font-bold">Daftar mata pelajaran</h2><div className="space-y-2">{subjects.map(s => <div key={s.id} role="button" tabIndex={0} onClick={() => setActiveSubject(s.id)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setActiveSubject(s.id) }}
        className={`flex w-full cursor-pointer items-center justify-between rounded-xl border p-3 text-left text-sm ${activeSubject === s.id ? 'border-teal-500 bg-teal-50' : 'hover:bg-slate-50'}`}>
        <div><div className="font-semibold">{s.name}</div><div className="text-xs text-slate-500">{topics.filter(t => t.subjectId === s.id).length} materi • {questions.filter(q => q.subjectId === s.id).length} soal</div></div>
        <span className="flex gap-1"><button className="p-1 hover:bg-white" onClick={e => { e.stopPropagation(); setSubject(structuredClone(s)) }}><Pencil size={14} /></button></span>
      </div>)}</div></Card>

      <Card className="lg:col-span-2"><div className="mb-3 flex items-center justify-between"><h2 className="font-bold">Materi & Tujuan Pembelajaran</h2><span className="text-xs text-slate-400">{activeSubject ? subjects.find(s => s.id === activeSubject)?.name : 'Pilih mata pelajaran'}</span></div>
        {!topics.filter(t => t.subjectId === activeSubject).length ? <EmptyState title="Belum ada materi" description="Tambahkan materi untuk mata pelajaran ini." /> : <div className="space-y-3">{topics.filter(t => t.subjectId === activeSubject).sort((a, b) => a.order - b.order).map(t => <div key={t.id} className="rounded-xl border p-4">
          <div className="flex flex-wrap items-start justify-between gap-2"><div><div className="flex items-center gap-2 font-semibold">{t.name}<Badge className="bg-blue-100 text-blue-700">Semester {t.semester}</Badge></div><div className="mt-1 text-xs text-slate-500">Submateri: {t.subTopics.join(', ') || '-'}</div></div>
            <div className="flex gap-1"><button className="rounded-lg p-2 hover:bg-slate-100" onClick={() => move(t.id, -1)}><ArrowUp size={15} /></button><button className="rounded-lg p-2 hover:bg-slate-100" onClick={() => move(t.id, 1)}><ArrowDown size={15} /></button><button className="rounded-lg p-2 hover:bg-slate-100" onClick={() => setTopic(structuredClone(t))}><Pencil size={15} /></button><button className="rounded-lg p-2 text-rose-600 hover:bg-rose-50" onClick={() => setDelTopic(t)}><Trash2 size={15} /></button></div>
          </div>
          <div className="mt-3 text-xs"><div className="font-semibold text-slate-600">CP:</div><div className="text-slate-500">{t.cp}</div></div>
          <div className="mt-2 text-xs"><div className="font-semibold text-slate-600">TP:</div><ul className="list-inside list-disc text-slate-500">{t.tp.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
        </div>)}</div>}
      </Card>
    </div>

    <Modal open={!!subject} onClose={() => setSubject(null)} title={subject?.id && subjects.some(s => s.id === subject.id) ? 'Edit mata pelajaran' : 'Mata pelajaran baru'}>
      {subject && <div className="space-y-4">
        <Field label="Nama"><input className="input" value={subject.name} onChange={e => setSubject({ ...subject, name: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3"><Field label="Singkatan"><input className="input" value={subject.shortName} onChange={e => setSubject({ ...subject, shortName: e.target.value })} /></Field><Field label="Warna"><input type="color" className="h-11 w-full rounded-xl border" value={subject.color} onChange={e => setSubject({ ...subject, color: e.target.value })} /></Field></div>
        <Field label="Deskripsi"><textarea className="input" value={subject.description} onChange={e => setSubject({ ...subject, description: e.target.value })} /></Field>
        <Field label="Kategori (pisahkan dengan koma)" hint="Misalnya untuk Seni: Seni Musik, Seni Rupa, Seni Tari"><input className="input" value={subject.categories.join(', ')} onChange={e => setSubject({ ...subject, categories: e.target.value.split(',').map(x => x.trim()).filter(Boolean) })} /></Field>
        <Field label="Urutan"><input type="number" className="input" value={subject.order} onChange={e => setSubject({ ...subject, order: Number(e.target.value) })} /></Field>
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setSubject(null)}>Batal</Button><Button onClick={saveSubject}>Simpan</Button></div>
      </div>}
    </Modal>

    <Modal open={!!topic} onClose={() => setTopic(null)} title={topic?.id && topics.some(t => t.id === topic.id) ? 'Edit materi' : 'Materi baru'}>
      {topic && <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2"><Field label="Mata pelajaran"><select className="input" value={topic.subjectId} onChange={e => setTopic({ ...topic, subjectId: e.target.value })}>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field><Field label="Nama materi"><input className="input" value={topic.name} onChange={e => setTopic({ ...topic, name: e.target.value })} /></Field></div>
        <div className="grid gap-3 sm:grid-cols-3"><Field label="Semester"><select className="input" value={topic.semester} onChange={e => setTopic({ ...topic, semester: Number(e.target.value) })}><option value={1}>1</option><option value={2}>2</option></select></Field><Field label="Urutan"><input type="number" className="input" value={topic.order} onChange={e => setTopic({ ...topic, order: Number(e.target.value) })} /></Field><Field label="Kategori"><input className="input" value={topic.category || ''} onChange={e => setTopic({ ...topic, category: e.target.value })} /></Field></div>
        <Field label="Submateri (pisahkan dengan koma)"><input className="input" value={topic.subTopics.join(', ')} onChange={e => setTopic({ ...topic, subTopics: e.target.value.split(',').map(x => x.trim()).filter(Boolean) })} /></Field>
        <Field label="Capaian Pembelajaran"><textarea className="input min-h-[80px]" value={topic.cp} onChange={e => setTopic({ ...topic, cp: e.target.value })} /></Field>
        <Field label="Tujuan Pembelajaran (satu per baris)"><textarea className="input min-h-[100px]" value={topic.tp.join('\n')} onChange={e => setTopic({ ...topic, tp: e.target.value.split('\n') })} /></Field>
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setTopic(null)}>Batal</Button><Button onClick={saveTopic}>Simpan</Button></div>
      </div>}
    </Modal>
    <Confirm open={!!delTopic} onClose={() => setDelTopic(null)} onConfirm={() => delTopic && removeTopic(delTopic)} message={`Hapus materi "${delTopic?.name}"? Soal pada materi ini tetap ada tetapi perlu dipindahkan.`} />
  </div>
}
