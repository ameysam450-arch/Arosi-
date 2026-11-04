export function formatBytes(n) {
  if (n == null) return '—'
  if (n < 1024) return `${n} B`
  const units = ['KB', 'MB', 'GB']
  let v = n / 1024
  let i = 0
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${v.toFixed(v >= 100 ? 0 : v >= 10 ? 1 : 2)} ${units[i]}`
}

const faDate = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' })
const faDateFull = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'full', timeStyle: 'medium' })
const enDate = new Intl.DateTimeFormat('en-GB', {
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
})

export function formatDate(d) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return null
  return faDate.format(d)
}

export function formatDateFull(d) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return null
  return faDateFull.format(d)
}

export function formatIso(d) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return null
  return enDate.format(d)
}

export function num(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return String(n ?? '—')
  return n.toLocaleString('en-US', { maximumFractionDigits: 4 })
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export function downloadText(text, filename, mime = 'text/plain;charset=utf-8') {
  downloadBlob(new Blob([text], { type: mime }), filename)
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n))
}
