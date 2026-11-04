import { formatBytes } from './format'

export function exportSummaryText(a) {
  if (!a) return ''
  const name = a.name.replace(/\.[^.]+$/, '')
  const lines = []
  lines.push(`گزارش عکس‌کاو — ${a.name}`)
  lines.push(`اندازه: ${formatBytes(a.size)} · فرمت: ${a.formatLabel}`)
  if (a.dims?.width) lines.push(`ابعاد: ${a.dims.width} × ${a.dims.height}`)
  lines.push('')
  lines.push(`تشخیص پیام‌رسان: ${a.insights.messenger.label} (اطمینان ${a.insights.messenger.confidence}٪)`)
  lines.push(
    `وضعیت ویرایش: ${
      a.insights.edit.verdict === 'edited' ? 'نشانه‌های قوی ویرایش' :
      a.insights.edit.verdict === 'likely' ? 'احتمال ویرایش' :
      a.insights.edit.verdict === 'clean' ? 'بدون نشانه' : 'نامشخص'
    }`,
  )
  lines.push(`امتیاز حریم خصوصی: ${a.insights.privacy.score}/100`)
  if (a.insights.privacy.hasGps) {
    lines.push(`مختصات: ${a.insights.privacy.lat.toFixed(6)}, ${a.insights.privacy.lon.toFixed(6)}`)
  }
  lines.push('')
  lines.push('— متادیتا —')
  for (const g of a.groups) {
    lines.push(`\n[${g.title}]`)
    for (const r of g.rows) {
      lines.push(`${r.label}: ${r.isDate ? r.value.toISOString() : r.text}`)
    }
  }
  if (a.xmp.history.length) {
    lines.push('\n— تاریخچه ویرایش XMP —')
    a.xmp.history.forEach((h) => {
      lines.push(`${h.when || '?'} — ${h.softwareAgent || h.action || '?'}${h.parameters ? ` (${h.parameters})` : ''}`)
    })
  }
  if (a.insights.edit.evidence.length) {
    lines.push('\n— شواهد —')
    a.insights.edit.evidence.forEach((e) => lines.push(`• ${e.title}: ${e.detail}`))
  }
  lines.push('')
  lines.push(`تاریخ گزارش: ${new Date().toISOString()}`)
  lines.push('توجه: داده‌ای که پیش از رسیدن فایل حذف شده باشد، قابل بازیابی نیست.')
  return lines.join('\n')
}
