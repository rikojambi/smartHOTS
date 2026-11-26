import { useEffect, useState } from 'react'
import katex from 'katex'
import { db } from '../db/db'

export function RichText({ text, className = '' }: { text: string; className?: string }) {
  const html = text.split(/(\$[^$]+\$)/g).map(part => {
    if (part.startsWith('$') && part.endsWith('$')) {
      try { return katex.renderToString(part.slice(1, -1), { throwOnError: false, displayMode: false }) }
      catch { return part }
    }
    return part.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }).join('')
  return <div className={`whitespace-pre-wrap leading-relaxed ${className}`} dangerouslySetInnerHTML={{ __html: html }} />
}

export function MediaView({ mediaId, className = 'max-h-72 rounded-xl border' }: { mediaId?: string; className?: string }) {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    let objectUrl: string | undefined
    let alive = true
    if (!mediaId) { setUrl(undefined); return }
    db.questionMedia.get(mediaId).then(m => {
      if (!m || !alive) return
      objectUrl = URL.createObjectURL(m.blob)
      setUrl(objectUrl)
    })
    return () => { alive = false; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [mediaId])
  if (!url) return null
  return <img src={url} alt="Gambar soal" className={className} />
}

export function MediaGallery({ mediaIds }: { mediaIds: string[] }) {
  if (!mediaIds.length) return null
  return <div className="mt-3 flex flex-wrap gap-3">{mediaIds.map(id => <MediaView key={id} mediaId={id} className="max-h-56 rounded-xl border object-contain" />)}</div>
}
