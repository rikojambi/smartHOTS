import type { ButtonHTMLAttributes, ReactNode } from 'react'
import clsx from 'clsx'
import { X } from 'lucide-react'

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('card', className)}>{children}</div>
}

export function Button({ variant = 'primary', className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }) {
  return <button className={clsx(`btn-${variant}`, className)} {...props}>{children}</button>
}

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={clsx('badge', className || 'bg-slate-100 text-slate-700')}>{children}</span>
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  if (!open) return null
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
    <div className={clsx('max-h-[94vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:rounded-2xl', wide ? 'sm:max-w-5xl' : 'sm:max-w-2xl')}>
      <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5 py-4">
        <h3 className="text-base font-bold">{title}</h3>
        <button className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" onClick={onClose} aria-label="Tutup"><X size={20} /></button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>
}

export function StatCard({ label, value, sub, icon, tone = 'teal' }: { label: string; value: string | number; sub?: string; icon?: ReactNode; tone?: 'teal' | 'blue' | 'amber' | 'rose' }) {
  const tones = { teal: 'bg-teal-50 text-teal-700', blue: 'bg-blue-50 text-blue-700', amber: 'bg-amber-50 text-amber-700', rose: 'bg-rose-50 text-rose-700' }
  return <Card className="flex items-center gap-4">
    {icon && <div className={clsx('rounded-xl p-3', tones[tone])}>{icon}</div>}
    <div><div className="text-xs font-medium text-slate-500">{label}</div><div className="text-2xl font-bold text-slate-800">{value}</div>{sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}</div>
  </Card>
}

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  return <div className="w-full">
    {label && <div className="mb-1 flex justify-between text-xs text-slate-600"><span>{label}</span><span>{value}%</span></div>}
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-600 transition-all" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>
  </div>
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">∅</div>
    <h3 className="font-semibold text-slate-700">{title}</h3>
    {description && <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="block"><span className="label">{label}</span>{children}{hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}</label>
}

export function Confirm({ open, onClose, onConfirm, message }: { open: boolean; onClose: () => void; onConfirm: () => void; message: string }) {
  return <Modal open={open} onClose={onClose} title="Konfirmasi">
    <p className="text-sm text-slate-600">{message}</p>
    <div className="mt-6 flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Batal</Button><Button variant="danger" onClick={() => { onConfirm(); onClose() }}>Ya, lanjutkan</Button></div>
  </Modal>
}
