import { formatBytes, escapeHtml } from './format'
import { isDateValue } from './metadata'

export function buildReportData(a) {
  if (!a) return null
  return {
    app: 'عکس‌کاو — آزمایشگاه داده‌های عکس',
    generatedAt: new Date().toISOString(),
    file: {
      name: a.name,
      size: a.size,
      mime: a.mime,
      format: a.formatLabel,
      lastModified: new Date(a.lastModified).toISOString(),
      dimensions: a.dims,
    },
    verdict: {
      messenger: a.insights.messenger,
      edit: a.insights.edit,
      ai: a.insights.ai,
      privacy: a.insights.privacy,
    },
    metadata: Object.fromEntries(
      (a.groups || []).map((g) => [
        g.title,
        Object.fromEntries(g.rows.map((r) => [r.key, isDateValue(r.value) ? r.value.toISOString() : r.value])),
      ]),
    ),
    xmp: {
      history: a.xmp?.history || [],
      creatorTool: a.xmp?.creatorTool || null,
      documentID: a.xmp?.documentID || null,
      originalDocumentID: a.xmp?.originalDocumentID || null,
      fields: a.xmp?.fields || [],
    },
    structure: {
      segments: a.segments,
      trailing: a.trailing,
      quantizationTables: (a.quant?.tables || []).map((t) => ({ id: t.id, quality: t.quality })),
    },
    recovered: {
      count: a.recoveredCount,
      embeddedPreviews: (a.embedded || []).map((e) => ({
        offset: e.offset, bytes: e.length, width: e.width, height: e.height,
      })),
      comments: (a.segments || []).filter((s) => s.kind === 'comment').map((s) => s.text),
      pngText: a.pngText,
      interestings: (a.strings || []).filter((s) => s.kind),
    },
    disclaimer:
      'این گزارش از داده‌هایی ساخته شده که در همان فایل وجود دارد. داده‌ای که پیام‌رسان یا ویرایشگر حذف کرده باشد، قابل بازیابی نیست.',
  }
}

function rowsHtml(groups) {
  return groups
    .map(
      (g) => `
      <section>
        <h3>${escapeHtml(g.title)}</h3>
        <table>
          ${g.rows
            .map(
              (r) => `<tr><th>${escapeHtml(r.label)}</th><td>${
                r.isDate ? escapeHtml(r.value.toISOString()) : escapeHtml(r.text)
              }</td></tr>`,
            )
            .join('')}
        </table>
      </section>`,
    )
    .join('')
}

export function buildReportHtml(a) {
  if (!a) return ''
  const ins = a.insights
  const gps = ins.privacy.hasGps
    ? `<p class="warn">مختصات ثبت‌شده: ${ins.privacy.lat.toFixed(6)}, ${ins.privacy.lon.toFixed(6)} —
       <a href="https://www.openstreetmap.org/?mlat=${ins.privacy.lat}&mlon=${ins.privacy.lon}#map=17/${ins.privacy.lat}/${ins.privacy.lon}">مشاهده روی نقشه</a></p>`
    : ''

  return `<!doctype html>
<html lang="fa" dir="rtl"><head><meta charset="utf-8">
<title>گزارش عکس‌کاو — ${escapeHtml(a.name)}</title>
<style>
  body{font-family:Vazirmatn,Tahoma,sans-serif;background:#0b1017;color:#e8eef7;margin:0;padding:32px;line-height:1.8}
  .wrap{max-width:900px;margin:0 auto}
  h1{font-size:22px;margin:0 0 4px}
  h2{font-size:15px;margin:26px 0 8px;border-bottom:1px solid #24303f;padding-bottom:6px;color:#8fd8e6}
  h3{font-size:13px;margin:16px 0 6px;color:#b6c3d4}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th,td{text-align:right;padding:5px 8px;border-bottom:1px solid #1c2735;vertical-align:top}
  th{color:#7d8da3;font-weight:600;width:38%}
  .mono{font-family:monospace;direction:ltr;text-align:left}
  .badge{display:inline-block;padding:2px 9px;border-radius:999px;border:1px solid #2a3a4d;font-size:11px;margin-inline-end:6px}
  .warn{background:#2a1f0c;border:1px solid #6b5219;color:#ffe3a3;padding:9px 12px;border-radius:8px;font-size:12px}
  a{color:#6fd6e6}
  .muted{color:#7d8da3;font-size:11px}
  ul{margin:6px 0;padding-inline-start:20px;font-size:12px}
</style></head><body><div class="wrap">
  <h1>گزارش عکس‌کاو</h1>
  <div class="muted">${escapeHtml(a.name)} — ${formatBytes(a.size)} — ${escapeHtml(a.formatLabel)}${
    a.dims?.width ? ` — ${a.dims.width}×${a.dims.height}` : ''
  }</div>
  <div class="muted">تاریخ گزارش: ${new Date().toISOString()}</div>

  <h2>نتیجه تحلیل</h2>
  <div>
    <span class="badge">مسیر ارسال: ${escapeHtml(ins.messenger.label)} (${ins.messenger.confidence}٪)</span>
    <span class="badge">ویرایش: ${
      ins.edit.verdict === 'edited' ? 'نشانه‌های قوی ویرایش' :
      ins.edit.verdict === 'likely' ? 'احتمال ویرایش' :
      ins.edit.verdict === 'clean' ? 'نشانه‌ای پیدا نشد' : 'نامشخص'
    }</span>
    <span class="badge">حریم خصوصی: ${ins.privacy.score}/100</span>
  </div>
  ${gps}

  <h2>نشانه‌ها</h2>
  <ul>${ins.edit.evidence.map((e) => `<li><b>${escapeHtml(e.title)}</b> — ${escapeHtml(e.detail)}</li>`).join('') || '<li>نشانه‌ای ثبت نشد.</li>'}</ul>

  ${a.xmp?.history?.length ? `<h2>تاریخچه ویرایش XMP</h2><ul>${a.xmp.history
    .map((h) => `<li>${escapeHtml(h.when || '?')} — ${escapeHtml(h.softwareAgent || h.action || '?')}${
      h.parameters ? ` (${escapeHtml(h.parameters)})` : ''
    }</li>`)
    .join('')}</ul>` : ''}

  <h2>متادیتا</h2>
  ${rowsHtml(a.groups || [])}

  <h2>ساختار فایل</h2>
  <table>
    <tr><th>بخش</th><th>آفست</th><th>اندازه (بایت)</th></tr>
    ${(a.segments || []).map((s) => `<tr><td>${escapeHtml(s.name)}</td><td class="mono">${s.offset}</td><td class="mono">${s.length}</td></tr>`).join('')}
  </table>
  ${a.trailing ? `<p class="warn">${a.trailing.length} بایت داده پس از پایان رسمی تصویر پیدا شد (${escapeHtml(a.trailing.label)}).</p>` : ''}

  <p class="muted" style="margin-top:28px">این گزارش فقط داده‌های موجود در همین فایل را توصیف می‌کند. داده‌ای که پیش از رسیدن فایل به شما حذف شده باشد، در فایل وجود ندارد و قابل بازیابی نیست.</p>
</div></body></html>`
}
