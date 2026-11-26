import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useParams } from 'react-router-dom'
import { Download, Printer } from 'lucide-react'
import { db } from '../db/db'
import { levelLabel, statusLabel } from '../lib/remedial'
import { Badge, Button, Card, ProgressBar } from '../components/ui'
import type { Question, RemedialStatus } from '../types'

function escapeHtml(value: unknown): string {
  const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
  return String(value ?? '').replace(/[&<>"']/g, char => entities[char] || char)
}

function statusClass(status: RemedialStatus) {
  switch (status) {
    case 'tuntas': return 'bg-emerald-100 text-emerald-800'
    case 'berjalan': return 'bg-teal-100 text-teal-800'
    case 'pengayaan': return 'bg-purple-100 text-purple-800'
    case 'dihentikan': return 'bg-slate-200 text-slate-700'
    default: return 'bg-amber-100 text-amber-800'
  }
}

export default function RemedialReportPage() {
  const { planId } = useParams()
  const [notice, setNotice] = useState('')
  const plan = useLiveQuery(() => db.remedialPlans.get(planId || ''), [planId])
  const students = useLiveQuery(() => db.students.toArray(), []) || []
  const subjects = useLiveQuery(() => db.subjects.toArray(), []) || []
  const topics = useLiveQuery(() => db.topics.toArray(), []) || []
  const questions = useLiveQuery(() => db.questions.toArray(), []) || []
  const attempts = useLiveQuery(() => db.studentAttempts.toArray(), []) || []
  const evidence = useLiveQuery(() => db.skillEvidence.where('studentId').equals(plan?.studentId || '').toArray(), [plan?.studentId]) || []
  const plans = useLiveQuery(() => db.remedialPlans.where('studentId').equals(plan?.studentId || '').toArray(), [plan?.studentId]) || []

  if (!plan) return <Card>Memuat laporan remedial…</Card>
  const currentPlan = plan

  const student = students.find(item => item.id === currentPlan.studentId)
  const subject = subjects.find(item => item.id === currentPlan.subjectId)
  const topic = topics.find(item => item.id === currentPlan.topicId)
  const last = currentPlan.history[currentPlan.history.length - 1]
  const relatedAttempts = attempts.filter(attempt => attempt.remedialPlanId === currentPlan.id).sort((a, b) => a.startedAt - b.startedAt)
  const orderedQuestions = currentPlan.questionIds
    .map(id => questions.find(question => question.id === id))
    .filter((question): question is Question => !!question)
  const scopedEvidence = evidence.filter(row => row.indicatorKey === currentPlan.indicatorKey)
  const evidenceCorrect = scopedEvidence.filter(row => row.correct).length
  const next = plans.filter(item => item.indicatorKey === currentPlan.indicatorKey && item.createdAt > currentPlan.createdAt && item.status !== 'dihentikan')
    .sort((a, b) => a.createdAt - b.createdAt)[0]

  function printReport() {
    const win = window.open('', '_blank')
    if (!win) { setNotice('Cetak diblokir browser. Izinkan popup untuk membuka laporan.'); return }
    const materials = currentPlan.materials.map(text => `<li>${escapeHtml(text)}</li>`).join('')
    const timeline = currentPlan.history.map(entry => `<li><b>${escapeHtml(new Date(entry.at).toLocaleString('id-ID'))}</b> — nilai ${escapeHtml(entry.score)}. Tuntas: ${escapeHtml(entry.mastered.join(', ') || '-')}. Belum tuntas: ${escapeHtml(entry.remaining.join(', ') || '-')}. ${escapeHtml(entry.note)}</li>`).join('')
    const questionRows = orderedQuestions.map(question => `<tr><td>${escapeHtml(question.code)}</td><td>${escapeHtml(question.indicator)}</td><td>${escapeHtml(question.subTopic)}</td><td>${escapeHtml(question.cognitive)} / ${escapeHtml(question.difficulty)}</td></tr>`).join('')
    const html = `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Laporan Remedial Adaptif</title><style>
      body{font-family:Arial,sans-serif;color:#1e293b;margin:32px;line-height:1.5}
      h1{font-size:20px;margin-bottom:4px}h2{font-size:15px;margin-top:24px;border-bottom:1px solid #cbd5e1;padding-bottom:4px}
      table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #cbd5e1;padding:6px;text-align:left}
      ul{margin:6px 0 0 20px}li{margin-bottom:4px}.muted{color:#64748b;font-size:12px}
    </style></head><body>
      <h1>Laporan Remedial Adaptif</h1>
      <div class="muted">Dicetak ${escapeHtml(new Date().toLocaleString('id-ID'))}</div>
      <h2>Ringkasan</h2>
      <table><tbody>
        <tr><th>Siswa</th><td>${escapeHtml(student?.name || '-')} (${escapeHtml(student?.className || '-')})</td></tr>
        <tr><th>Mata pelajaran</th><td>${escapeHtml(subject?.name || '-')}</td></tr>
        <tr><th>Topik</th><td>${escapeHtml(topic?.name || '-')}</td></tr>
        <tr><th>Indikator</th><td>${escapeHtml(currentPlan.indicator)}</td></tr>
        <tr><th>Level / status</th><td>${escapeHtml(levelLabel(currentPlan.level))} / ${escapeHtml(statusLabel(currentPlan.status))}</td></tr>
        <tr><th>Dibuat</th><td>${escapeHtml(new Date(currentPlan.createdAt).toLocaleString('id-ID'))}</td></tr>
        <tr><th>Jatuh tempo</th><td>${currentPlan.dueAt ? escapeHtml(new Date(currentPlan.dueAt).toLocaleDateString('id-ID')) : '-'}</td></tr>
        <tr><th>Nilai awal / akhir</th><td>${escapeHtml(currentPlan.scoreBefore)}% / ${currentPlan.scoreAfter !== undefined ? `${escapeHtml(currentPlan.scoreAfter)}%` : '-'}</td></tr>
      </tbody></table>
      <h2>Kondisi awal</h2><p>${escapeHtml(currentPlan.reason)}</p>
      <p class="muted">Bukti respons: benar ${escapeHtml(evidenceCorrect)}/${escapeHtml(scopedEvidence.length)} pada indikator ini.</p>
      <h2>Materi yang ditugaskan</h2><ul>${materials || `<li>${escapeHtml('Tidak ada materi tercatat.')}</li>`}</ul>
      ${currentPlan.teacherNote ? `<h2>Catatan guru</h2><p>${escapeHtml(currentPlan.teacherNote)}</p>` : ''}
      <h2>Latihan dan soal</h2><p>Jumlah percobaan: ${escapeHtml(relatedAttempts.length)}. Jumlah soal dalam rencana: ${escapeHtml(orderedQuestions.length)}.</p>
      <table><thead><tr><th>Kode</th><th>Indikator</th><th>Subtopik</th><th>Kognisi / kesulitan</th></tr></thead><tbody>${questionRows}</tbody></table>
      <h2>Hasil evaluasi</h2>
      <p>Tuntas: ${escapeHtml(last?.mastered.join(', ') || '-')}<br>Belum tuntas: ${escapeHtml(last?.remaining.join(', ') || '-')}</p>
      <h2>Rekomendasi berikutnya</h2><p>${escapeHtml(next ? `${levelLabel(next.level)} (${statusLabel(next.status)}): ${next.indicator}` : 'Belum ada rekomendasi lanjutan.')}</p>
      <h2>Riwayat evaluasi</h2><ul>${timeline || `<li>${escapeHtml('Belum ada evaluasi.')}</li>`}</ul>
    </body></html>`
    win.document.open()
    win.document.write(html)
    win.document.close()
    win.focus()
    win.print()
  }

  function downloadJson() {
    const payload = {
      generatedAt: new Date().toISOString(),
      student: student ? { id: student.id, name: student.name, className: student.className, school: student.school } : null,
      subject: subject?.name || null,
      topic: topic?.name || null,
      plan,
      questions: orderedQuestions.map(question => ({
        id: question.id, code: question.code, prompt: question.prompt, indicator: question.indicator,
        subTopic: question.subTopic, cognitive: question.cognitive, difficulty: question.difficulty
      })),
      attempts: relatedAttempts.map(attempt => ({
        id: attempt.id, startedAt: attempt.startedAt, finishedAt: attempt.finishedAt,
        score: attempt.score, kind: attempt.kind, status: attempt.status,
        answered: attempt.answers.filter(answer => answer.selected.length).length,
        total: attempt.answers.length
      })),
      evidence: scopedEvidence.map(row => ({
        questionId: row.questionId, correct: row.correct, points: row.points,
        errorType: row.errorType, misconception: row.misconception, createdAt: row.createdAt
      })),
      nextRecommendation: next ? { id: next.id, level: next.level, status: next.status, indicator: next.indicator } : null
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `laporan-remedial-${currentPlan.id}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return <div className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-2xl font-extrabold">Laporan Remedial Adaptif</h1>
        <div className="text-sm text-slate-500">{student?.name || 'Siswa'} • {subject?.name || '-'} • {new Date(currentPlan.createdAt).toLocaleDateString('id-ID')}</div></div>
      <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={printReport}><Printer size={16} /> Cetak laporan</Button><Button onClick={downloadJson}><Download size={16} /> Unduh JSON</Button></div>
    </div>
    {notice && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{notice}</div>}

    <Card><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div><div className="text-xs text-slate-500">Indikator</div><div className="mt-1 font-bold">{currentPlan.indicator}</div></div>
      <div><div className="text-xs text-slate-500">Level / status</div><div className="mt-1 flex flex-wrap gap-2"><Badge className="bg-slate-100 text-slate-700">{levelLabel(currentPlan.level)}</Badge><Badge className={statusClass(currentPlan.status)}>{statusLabel(currentPlan.status)}</Badge></div></div>
      <div><div className="text-xs text-slate-500">Nilai awal</div><div className="mt-1 text-2xl font-extrabold text-amber-700">{currentPlan.scoreBefore}%</div></div>
      <div><div className="text-xs text-slate-500">Nilai akhir</div><div className="mt-1 text-2xl font-extrabold text-teal-700">{currentPlan.scoreAfter ?? '-'}{currentPlan.scoreAfter !== undefined ? '%' : ''}</div></div>
    </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3 text-xs text-slate-500"><div>Topik: <b className="text-slate-700">{topic?.name || '-'}</b></div><div>Jatuh tempo: <b className="text-slate-700">{currentPlan.dueAt ? new Date(currentPlan.dueAt).toLocaleDateString('id-ID') : '-'}</b></div><div>Percobaan: <b className="text-slate-700">{relatedAttempts.length}</b></div></div>
    </Card>

    <div className="grid gap-5 lg:grid-cols-2">
      <Card><h2 className="mb-2 font-bold">Kondisi awal & alasan</h2><p className="text-sm text-slate-600">{currentPlan.reason}</p>
        <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm">Bukti respons pada indikator ini: <b>{evidenceCorrect}/{scopedEvidence.length}</b> benar
          <div className="mt-2"><ProgressBar value={scopedEvidence.length ? Math.round(evidenceCorrect / scopedEvidence.length * 100) : 0} label="Penguasaan awal dari bukti" /></div></div>
        {currentPlan.teacherNote && <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900"><b>Catatan guru:</b> {currentPlan.teacherNote}</div>}
      </Card>
      <Card><h2 className="mb-2 font-bold">Materi yang ditugaskan</h2><ol className="list-inside list-decimal space-y-1 text-sm text-slate-600">{currentPlan.materials.map((text, index) => <li key={index}>{text}</li>)}</ol></Card>
    </div>

    <Card><h2 className="mb-3 font-bold">Latihan & soal ({orderedQuestions.length} soal, {relatedAttempts.length} percobaan)</h2>
      <div className="overflow-x-auto"><table className="table text-xs"><thead><tr><th>Kode</th><th>Indikator</th><th>Subtopik</th><th>Kognisi</th><th>Kesulitan</th></tr></thead>
        <tbody>{orderedQuestions.map(question => <tr key={question.id}><td>{question.code}</td><td>{question.indicator}</td><td>{question.subTopic}</td><td>{question.cognitive}</td><td>{question.difficulty}</td></tr>)}</tbody></table></div>
      {!orderedQuestions.length && <p className="text-sm text-slate-500">Belum ada soal tercatat pada rencana ini.</p>}
    </Card>

    <div className="grid gap-5 lg:grid-cols-2">
      <Card><h2 className="mb-3 font-bold">Hasil evaluasi</h2>
        <div className="space-y-3"><ProgressBar value={currentPlan.scoreBefore} label="Sebelum remedial" />
          {currentPlan.scoreAfter !== undefined && <ProgressBar value={currentPlan.scoreAfter} label="Sesudah remedial" />}</div>
        <div className="mt-4 grid gap-3 text-sm"><div><b className="text-emerald-700">Tuntas:</b> {last?.mastered.join(', ') || '-'}</div><div><b className="text-rose-700">Belum tuntas:</b> {last?.remaining.join(', ') || '-'}</div></div>
        <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{last?.note || 'Belum ada catatan evaluasi.'}</div>
      </Card>
      <Card><h2 className="mb-3 font-bold">Rekomendasi berikutnya</h2>
        {next ? <div className="rounded-xl border border-teal-100 bg-teal-50 p-3 text-sm"><div className="flex flex-wrap gap-2"><Badge className="bg-white text-teal-800">{levelLabel(next.level)}</Badge><Badge className="bg-white text-teal-800">{statusLabel(next.status)}</Badge></div>
          <div className="mt-2 font-semibold">{next.indicator}</div><div className="mt-1 text-xs text-slate-500">Dibuat {new Date(next.createdAt).toLocaleDateString('id-ID')} • {next.questionIds.length} soal</div></div>
          : <p className="text-sm text-slate-500">Belum ada rekomendasi lanjutan untuk indikator ini.</p>}
      </Card>
    </div>

    <Card><h2 className="mb-3 font-bold">Riwayat evaluasi</h2>
      {!currentPlan.history.length ? <p className="text-sm text-slate-500">Belum ada evaluasi. Evaluasi dibuat otomatis setelah attempt remedial dinilai.</p> :
        <ol className="relative space-y-4 border-l-2 border-teal-100 pl-5">{currentPlan.history.map((entry, index) => <li key={`${entry.attemptId}-${index}`} className="relative">
          <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full bg-teal-600" />
          <div className="text-sm font-bold">Evaluasi {index + 1} — nilai {entry.score} <span className="text-xs font-normal text-slate-500">• {new Date(entry.at).toLocaleString('id-ID')}</span></div>
          <div className="mt-1 text-xs text-slate-600"><div>Tuntas: {entry.mastered.join(', ') || '-'}</div><div>Belum tuntas: {entry.remaining.join(', ') || '-'}</div><div className="mt-1">{entry.note}</div></div>
        </li>)}</ol>}
    </Card>
  </div>
}
