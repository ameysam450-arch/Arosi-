import {
  Camera, Clock, MapPin, Binary, Layers, Aperture, AlertTriangle, CheckCircle2,
  HelpCircle, Sparkles, ShieldAlert, ScanEye, FileImage,
} from 'lucide-react'
import { Badge, Card, Note, SeverityIcon } from './ui'
import { formatBytes, formatDate, formatDateFull, formatIso } from '../lib/format'

const VERDICT = {
  edited: { cls: 'red', text: 'نشانه‌های قوی ویرایش', icon: AlertTriangle },
  likely: { cls: 'amber', text: 'احتمال ویرایش', icon: HelpCircle },
  clean: { cls: 'green', text: 'نشانه ویرایش پیدا نشد', icon: CheckCircle2 },
  unknown: { cls: 'gray', text: 'بدون داده کافی', icon: HelpCircle },
}

function Fact({ icon: Icon, label, value, mono }) {
  return (
    <div className="fact">
      <div className="fact-label">{Icon && <Icon size={11} />} {label}</div>
      <div className={`fact-value ${mono ? 'mono' : ''}`}>{value || '—'}</div>
    </div>
  )
}

export default function Overview({ a }) {
  const ins = a.insights
  const v = VERDICT[ins.edit.verdict] || VERDICT.unknown
  const VIcon = v.icon
  const capture = a.raw.DateTimeOriginal || a.raw.CreateDate
  const device = [a.raw.Make, a.raw.Model].filter(Boolean).join(' ')
  const gps = ins.privacy.hasGps

  const recovered = [
    { n: a.embedded.length, label: 'پیش‌نمایش / تصویر جاسازی‌شده' },
    { n: a.xmp.history.length, label: 'مرحله تاریخچه ویرایش' },
    { n: a.segments.filter((s) => s.kind === 'comment' && s.text).length, label: 'بلوک توضیح (COM)' },
    { n: a.pngText.length, label: 'متن داخل PNG' },
    { n: a.trailing ? 1 : 0, label: 'داده پس از پایان تصویر' },
    { n: a.strings.filter((s) => s.kind).length, label: 'نشانی/مسیر قابل استخراج' },
    { n: Object.keys(a.raw).length, label: 'تگ متادیتا' },
    { n: a.segments.filter((s) => ['exif', 'xmp'].includes(s.kind)).length, label: 'بلوک EXIF/XMP' },
  ]

  return (
    <>
      <div className="hero">
        <div className="hero-img-wrap">
          <img src={a.filePreviewUrl} alt="" onError={(e) => { e.currentTarget.style.display = 'none' }} />
          <span className="hero-badge">{a.formatLabel}</span>
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="chip-row" style={{ marginBottom: 10 }}>
            <span className={`verdict ${v.cls}`}>
              <VIcon size={13} /> {v.text}
            </span>
            <span className="verdict gray"><ScanEye size={13} /> {ins.messenger.label}</span>
            {gps && <span className="verdict red"><MapPin size={13} /> مکان ثبت‌شده</span>}
          </div>
          <div className="hero-title">{a.name}</div>
          <div className="hero-sub">
            {formatBytes(a.size)} · {a.formatLabel}
            {a.dims?.width ? ` · ${a.dims.width}×${a.dims.height} پیکسل` : ''}
            {a.mime ? ` · ${a.mime}` : ''}
          </div>

          <div className="fact-grid">
            <Fact icon={Camera} label="دستگاه" value={device || 'ثبت نشده'} />
            <Fact
              icon={Clock}
              label="زمان عکس‌برداری"
              value={capture ? formatDate(capture) : 'ثبت نشده'}
            />
            <Fact
              icon={MapPin}
              label="موقعیت"
              value={gps ? `${ins.privacy.lat.toFixed(4)}, ${ins.privacy.lon.toFixed(4)}` : 'ثبت نشده'}
              mono={gps}
            />
            <Fact icon={Aperture} label="نرم‌افزار" value={a.raw.Software || a.raw.ProcessingSoftware || 'ثبت نشده'} />
            <Fact icon={Binary} label="تگ متادیتا" value={`${Object.keys(a.raw).length}`} />
            <Fact icon={Layers} label="داده بازیابی‌شده" value={`${a.recoveredCount} مورد`} />
          </div>
        </div>
      </div>

      <div className="two-col" style={{ marginTop: 14 }}>
        <Card icon={AlertTriangle} title="قوی‌ترین نشانه‌ها" desc="آنچه از فایل بیرون آمد">
          {ins.edit.evidence.length ? (
            ins.edit.evidence.slice(0, 4).map((e, i) => (
              <div className="evidence" key={i}>
                <span className="icon"><SeverityIcon severity={e.severity} /></span>
                <div>
                  <b>{e.title}</b>
                  <span>{e.detail}</span>
                </div>
              </div>
            ))
          ) : (
            <p className="small muted" style={{ margin: 0 }}>
              در این فایل نشانه‌ای از ویرایش دیده نشد. این یعنی «چیزی پیدا نشد»، نه «قطعاً دست‌نخورده است».
            </p>
          )}
        </Card>

        <Card icon={Layers} title="آنچه بازیابی شد" desc="همه چیزهایی که در فایل پنهان بود">
          <table className="kv">
            <tbody>
              {recovered.map((r) => (
                <tr key={r.label}>
                  <th>{r.label}</th>
                  <td style={{ fontWeight: 700, color: r.n ? '#35d6e8' : '#5b6b7f' }}>{r.n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      {ins.ai.detected && (
        <Card icon={Sparkles} title="نشانه تولید با هوش مصنوعی" desc="این‌ها نشانه‌اند، نه اثبات">
          <div className="chip-row">
            {ins.ai.hits.map((h) => <Badge key={h.label} tone="violet">{h.label}</Badge>)}
          </div>
        </Card>
      )}

      {a.timeline.length > 0 && (
        <Card icon={Clock} title="خط زمانی فایل" desc="همه زمان‌های ثبت‌شده، از قدیم به جدید">
          <table className="kv">
            <tbody>
              {a.timeline.map((t) => (
                <tr key={t.key + t.date.toISOString()}>
                  <th>{t.label}</th>
                  <td>
                    <span title={formatIso(t.date)}>{formatDateFull(t.date)}</span>
                    {t.kind === 'edit' && t.date && a.raw.DateTimeOriginal instanceof Date &&
                      t.date.getTime() - a.raw.DateTimeOriginal.getTime() > 120000 && (
                        <Badge tone="amber" style={{ marginInlineStart: 8 }}>بعد از عکس‌برداری</Badge>
                      )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <div className="two-col">
        <Card icon={ScanEye} title="مسیر احتمالی ارسال" desc="بر پایه نشانه‌های فایل">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: 22, fontWeight: 800 }}>{ins.messenger.label}</span>
            <Badge tone={ins.messenger.confidence >= 50 ? 'amber' : ''}>
              اطمینان {ins.messenger.confidence}٪
            </Badge>
          </div>
          {ins.messenger.signs.length > 0 ? (
            <ul className="small" style={{ margin: 0, paddingInlineStart: 18, color: 'var(--ink-2)' }}>
              {ins.messenger.signs.map((s, i) => (
                <li key={i}><b>{s.label}</b> — {s.detail}</li>
              ))}
            </ul>
          ) : (
            <p className="small muted" style={{ margin: 0 }}>نشانه‌ای از پیام‌رسان‌ها پیدا نشد.</p>
          )}
          <p className="small muted" style={{ marginBottom: 0 }}>{ins.messenger.note}</p>
        </Card>

        <Card icon={ShieldAlert} title="حریم خصوصی" desc="اگر این عکس را بفرستید چه چیزی لو می‌رود">
          <div className="gauge" style={{ marginBottom: 10 }}>
            <div className="gauge-num" style={{ color: ins.privacy.score >= 60 ? '#fb7185' : ins.privacy.score >= 28 ? '#fbbf24' : '#4ade80' }}>
              {ins.privacy.score}
            </div>
            <div className="small muted">
              از ۱۰۰ — {ins.privacy.level === 'high' ? 'خطر بالا' : ins.privacy.level === 'medium' ? 'خطر متوسط' : ins.privacy.level === 'low' ? 'خطر کم' : 'بدون داده حساس'}
            </div>
          </div>
          {ins.privacy.findings.slice(0, 4).map((f) => (
            <div className="evidence" key={f.title}>
              <span className="icon"><ShieldAlert size={14} color="#fb7185" /></span>
              <div>
                <b>{f.title}</b>
                <span>{f.detail}</span>
              </div>
            </div>
          ))}
          {!ins.privacy.findings.length && (
            <Note tone="cyan"><CheckCircle2 size={15} /> هیچ داده حساسی در این فایل پیدا نشد.</Note>
          )}
        </Card>
      </div>
    </>
  )
}
