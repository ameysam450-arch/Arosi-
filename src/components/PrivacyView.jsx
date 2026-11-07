import { ShieldAlert, MapPin, Eye, Lock, CheckCircle2, ExternalLink } from 'lucide-react'
import { Badge, Card, Gauge, Note } from './ui'
import { formatDate } from '../lib/format'

const LEVEL_TEXT = {
  high: { text: 'خطر بالا', tone: 'red' },
  medium: { text: 'خطر متوسط', tone: 'amber' },
  low: { text: 'خطر کم', tone: '' },
  none: { text: 'بی‌خطر', tone: 'green' },
}

export default function PrivacyView({ a }) {
  const p = a.insights.privacy
  const level = LEVEL_TEXT[p.level] || LEVEL_TEXT.low
  const capture = a.raw.DateTimeOriginal || a.raw.CreateDate

  const leakRows = [
    { label: 'مختصات محل', value: p.hasGps ? `${p.lat.toFixed(6)}, ${p.lon.toFixed(6)}` : 'ندارد' },
    { label: 'زمان دقیق عکس', value: capture ? formatDate(capture) : 'ندارد' },
    { label: 'مدل دستگاه', value: [a.raw.Make, a.raw.Model].filter(Boolean).join(' ') || 'ندارد' },
    { label: 'شماره سریال', value: a.raw.SerialNumber || a.raw.BodySerialNumber || 'ندارد' },
    { label: 'نام مالک', value: a.raw.CameraOwnerName || a.raw.Artist || 'ندارد' },
    { label: 'نرم‌افزار', value: a.raw.Software || 'ندارد' },
  ]

  return (
    <>
      <Card icon={ShieldAlert} title="سطح افشای اطلاعات" desc="چقدر این فایل درباره شما حرف می‌زند">
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', display: 'grid', placeItems: 'center' }}>
            <Gauge score={p.score} size={96} />
            <div
              style={{
                position: 'absolute', fontSize: 22, fontWeight: 800,
                color: p.score >= 60 ? '#fb7185' : p.score >= 28 ? '#fbbf24' : '#4ade80',
              }}
            >
              {p.score}
            </div>
          </div>
          <div>
            <Badge tone={level.tone}>{level.text}</Badge>
            <div className="small muted" style={{ marginTop: 6 }}>
              {p.score === 0
                ? 'هیچ داده حساسی پیدا نشد.'
                : `${p.findings.length} مورد اطلاعات حساس در این فایل ذخیره شده است.`}
            </div>
          </div>
        </div>

        {p.findings.length > 0 && (
          <div style={{ marginTop: 14 }}>
            {p.findings.map((f) => (
              <div className="evidence" key={f.title}>
                <span className="icon"><Eye size={14} color="#fb7185" /></span>
                <div>
                  <b>{f.title} <span className="muted">+{f.points}</span></b>
                  <span>{f.detail}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {p.hasGps && (
        <Card
          icon={MapPin}
          title="محل عکس‌برداری"
          desc="دقیقاً همان جایی که دوربین ثبت کرده"
          actions={
            <a
              className="btn btn-sm"
              href={`https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lon}#map=17/${p.lat}/${p.lon}`}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={12} /> نقشه کامل
            </a>
          }
        >
          <div className="chip-row" style={{ marginBottom: 10 }}>
            <Badge tone="red">عرض {p.lat.toFixed(6)}</Badge>
            <Badge tone="red">طول {p.lon.toFixed(6)}</Badge>
            {a.raw.GPSAltitude != null && <Badge>ارتفاع {Math.round(a.raw.GPSAltitude)} متر</Badge>}
            {a.raw.GPSHPositioningError != null && (
              <Badge>خطای موقعیت {Math.round(a.raw.GPSHPositioningError)} متر</Badge>
            )}
          </div>
          <div className="map-frame">
            <iframe
              title="map"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${p.lon - 0.004}%2C${p.lat - 0.003}%2C${p.lon + 0.004}%2C${p.lat + 0.003}&layer=mapnik&marker=${p.lat}%2C${p.lon}`}
              loading="lazy"
            />
          </div>
          {a.raw.GPSProcessingMethod && (
            <div className="small muted" style={{ marginTop: 8 }}>
              روش مکان‌یابی: {String(a.raw.GPSProcessingMethod).replace(/\0/g, '')}
            </div>
          )}
        </Card>
      )}

      <div className="two-col">
        <Card icon={Eye} title="اگر این را بفرستید چه می‌شود" desc="آنچه گیرنده می‌تواند ببیند">
          <table className="kv">
            <tbody>
              {leakRows.map((r) => (
                <tr key={r.label}>
                  <th>{r.label}</th>
                  <td style={{ color: r.value === 'ندارد' ? '#5b6b7f' : undefined }}>{r.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card icon={Lock} title="چطور امن بفرستید" desc="روش‌های عملی">
          <ul className="small" style={{ margin: 0, paddingInlineStart: 18, color: 'var(--ink-2)' }}>
            <li>در واتساپ و تلگرام گزینه ارسال به‌صورت «سند/فایل» را انتخاب کنید تا عکس فشرده و متادیتا پاک نشود.</li>
            <li>عکس را با یک برنامه حذف متادیتا پاک کنید، سپس بفرستید.</li>
            <li>در آیفون هنگام اشتراک‌گذاری گزینه «موقعیت مکانی» را خاموش کنید.</li>
            <li>اسکرین‌شات گرفتن از عکس، متادیتای اصلی را کامل از بین می‌برد.</li>
          </ul>
          <Note tone="cyan">
            <CheckCircle2 size={15} />
            <div>هر داده‌ای که در این فایل نیست را نمی‌توان از آن بیرون کشید؛ پیام‌رسان‌ها پیش از رسیدن فایل، متادیتا را حذف می‌کنند.</div>
          </Note>
        </Card>
      </div>
    </>
  )
}
