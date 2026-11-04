import { useMemo, useState } from 'react'
import { FileJson, FileCode2, Copy, Download, ShieldCheck, Info } from 'lucide-react'
import { Badge, Card, CopyButton, Note } from './ui'
import { buildReportData, buildReportHtml } from '../lib/report'
import { exportSummaryText } from '../lib/reportText'
import { downloadText, formatBytes } from '../lib/format'

export default function ReportView({ a }) {
  const [copied, setCopied] = useState(false)
  const summary = useMemo(() => exportSummaryText(a), [a])
  const json = useMemo(() => JSON.stringify(buildReportData(a), null, 2), [a])

  const saveHtml = () => {
    const name = a.name.replace(/\.[^.]+$/, '')
    downloadText(buildReportHtml(a), `${name}-forensics.html`, 'text/html;charset=utf-8')
  }
  const saveJson = () => {
    const name = a.name.replace(/\.[^.]+$/, '')
    downloadText(json, `${name}-forensics.json`, 'application/json;charset=utf-8')
  }

  return (
    <>
      <Card icon={ShieldCheck} title="گزارش نهایی" desc="همه داده‌ها در یک فایل قابل نگه‌داری">
        <div className="chip-row" style={{ marginBottom: 12 }}>
          <Badge tone="cyan">{a.name}</Badge>
          <Badge>{formatBytes(a.size)}</Badge>
          {a.dims?.width && <Badge>{a.dims.width}×{a.dims.height}</Badge>}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-primary" onClick={saveHtml}>
            <FileCode2 size={14} /> ذخیره گزارش HTML
          </button>
          <button type="button" className="btn" onClick={saveJson}>
            <FileJson size={14} /> ذخیره JSON
          </button>
          <button
            type="button"
            className="btn"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(summary)
                setCopied(true)
                setTimeout(() => setCopied(false), 1600)
              } catch { /* clipboard blocked */ }
            }}
          >
            <Copy size={14} /> {copied ? 'کپی شد' : 'کپی خلاصه متنی'}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              const w = window.open('', '_blank')
              if (w) {
                w.document.write(buildReportHtml(a))
                w.document.close()
              }
            }}
          >
            <Download size={14} /> پیش‌نمایش و چاپ
          </button>
        </div>
      </Card>

      <Card icon={FileJson} title="خلاصه متنی" desc="آماده برای ارسال یا بایگانی">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <CopyButton text={summary} label="کپی" />
        </div>
        <pre className="report-pre" style={{ direction: 'rtl', textAlign: 'right' }}>{summary}</pre>
      </Card>

      <Note tone="cyan">
        <Info size={15} />
        <div>
          این گزارش فقط داده‌های موجود در همین فایل را ثبت می‌کند. اگر عکس از واتساپ یا اینستاگرام آمده باشد، متادیتا
          پیش از رسیدن به شما حذف شده و در گزارش هم چیزی نخواهد بود.
        </div>
      </Note>
    </>
  )
}
