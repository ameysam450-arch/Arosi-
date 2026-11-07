import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Aperture, Sparkles, Table2, History, AlertTriangle, ScanLine, Settings2, Waves,
} from 'lucide-react'
import { Badge, Card, Note, SeverityIcon } from './ui'
import { computeEla, computeHistogram } from '../lib/image'
import { clamp } from '../lib/format'

function ElaViewer({ file }) {
  const [quality, setQuality] = useState(0.9)
  const [gain, setGain] = useState(12)
  const [state, setState] = useState({ loading: true })

  useEffect(() => {
    let alive = true
    setState({ loading: true })
    const timer = setTimeout(() => {
      computeEla(file, { quality, gain })
        .then((r) => { if (alive) setState({ loading: false, ...r }) })
        .catch((err) => { if (alive) setState({ loading: false, error: String(err?.message || err) }) })
    }, 200)
    return () => { alive = false; clearTimeout(timer) }
  }, [file, quality, gain])

  return (
    <>
      <div className="ela-wrap">
        {state.loading && <div className="spinner" />}
        {!state.loading && state.error && <div className="small muted" style={{ padding: 20 }}>{state.error}</div>}
        {!state.loading && state.dataUrl && <img src={state.dataUrl} alt="ELA" />}
      </div>
      <div className="slider-row">
        <span>کیفیت بازفشرده‌سازی</span>
        <input
          type="range" min="0.5" max="0.99" step="0.01"
          value={quality}
          onChange={(e) => setQuality(Number(e.target.value))}
        />
        <b>{Math.round(quality * 100)}</b>
      </div>
      <div className="slider-row">
        <span>بزرگ‌نمایی اختلاف</span>
        <input
          type="range" min="2" max="40" step="1"
          value={gain}
          onChange={(e) => setGain(Number(e.target.value))}
        />
        <b>×{gain}</b>
      </div>
      {state.stats && (
        <div className="chip-row" style={{ marginTop: 10 }}>
          <Badge>میانگین اختلاف {state.stats.mean.toFixed(2)}</Badge>
          <Badge>بیشترین اختلاف {state.stats.max.toFixed(0)}</Badge>
          <Badge tone={state.stats.hotRatio > 0.25 ? 'amber' : ''}>
            پیکسل‌های فعال {Math.round(state.stats.hotRatio * 100)}٪
          </Badge>
          <Badge>یکنواختی {Math.round(state.stats.uniformity * 100)}٪</Badge>
        </div>
      )}
      <p className="small muted" style={{ marginBottom: 0 }}>
        نواحی روشن یعنی آن قسمت پس از آخرین بازفشرده‌سازی تغییر کرده یا جزئیات بالایی دارد. ELA نشانه است، نه
        مدرک قطعی.
      </p>
    </>
  )
}

function Histogram({ file }) {
  const canvasRef = useRef(null)
  const [data, setData] = useState(null)

  useEffect(() => {
    let alive = true
    computeHistogram(file).then((r) => { if (alive) setData(r) })
    return () => { alive = false }
  }, [file])

  useEffect(() => {
    if (!data || !canvasRef.current) return
    const canvas = canvasRef.current
    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth || 600
    const h = 160
    canvas.width = w * dpr
    canvas.height = h * dpr
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, w, h)
    const max = Math.max(...data.lum, 1)
    const barW = w / 256
    for (let i = 0; i < 256; i++) {
      const v = data.lum[i] / max
      const grad = ctx.createLinearGradient(0, h, 0, 0)
      grad.addColorStop(0, 'rgba(53,214,232,0.15)')
      grad.addColorStop(1, 'rgba(53,214,232,0.95)')
      ctx.fillStyle = grad
      ctx.fillRect(i * barW, h - v * (h - 6), Math.max(1, barW - 0.5), v * (h - 6))
    }
    ctx.strokeStyle = 'rgba(251,113,133,0.75)'
    ctx.beginPath()
    for (let i = 0; i < 256; i++) {
      const v = (data.r[i] / Math.max(...data.r, 1)) * (h - 6)
      if (i === 0) ctx.moveTo(0, h - v)
      else ctx.lineTo(i * barW, h - v)
    }
    ctx.stroke()
  }, [data])

  if (!data) return <div className="ela-wrap" style={{ minHeight: 120 }}><div className="spinner" /></div>

  return (
    <>
      <canvas ref={canvasRef} style={{ width: '100%', height: 160, display: 'block' }} />
      <div className="chip-row" style={{ marginTop: 8 }}>
        <Badge tone={data.shadowClip > 0.02 ? 'amber' : ''}>
          سایه‌های بسته {Math.round(data.shadowClip * 100)}٪
        </Badge>
        <Badge tone={data.highlightClip > 0.02 ? 'amber' : ''}>
          نورهای سوخته {Math.round(data.highlightClip * 100)}٪
        </Badge>
        <Badge>{data.total.toLocaleString('en-US')} پیکسل نمونه</Badge>
      </div>
    </>
  )
}

function QuantTable({ table }) {
  const max = Math.max(...table.values)
  return (
    <div>
      <div className="chip-row" style={{ marginBottom: 8 }}>
        <Badge tone="cyan">جدول {table.id === 0 ? 'روشنایی' : `رنگ ${table.id}`}</Badge>
        {table.quality?.quality != null && (
          <Badge tone={table.quality.quality < 70 ? 'amber' : 'green'}>
            کیفیت تقریبی {table.quality.quality}
          </Badge>
        )}
        {table.quality?.custom && <Badge tone="violet">جدول غیراستاندارد</Badge>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 3, direction: 'ltr' }}>
        {table.values.map((v, i) => {
          const t = clamp(v / max, 0, 1)
          return (
            <div
              key={i}
              title={`ضریب ${v}`}
              style={{
                fontSize: 9.5,
                fontFamily: 'var(--mono)',
                textAlign: 'center',
                padding: '4px 0',
                borderRadius: 5,
                background: `rgba(53,214,232,${0.06 + t * 0.5})`,
                color: t > 0.55 ? '#041318' : '#b6c3d4',
                fontWeight: 600,
              }}
            >
              {v}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function EditsView({ a }) {
  const ins = a.insights
  const tables = a.quant?.tables || []

  const grouped = useMemo(() => {
    const order = { strong: 0, medium: 1, weak: 2, info: 3 }
    return [...ins.edit.evidence].sort((x, y) => (order[x.severity] ?? 9) - (order[y.severity] ?? 9))
  }, [ins.edit.evidence])

  const headline = ins.edit.verdict === 'edited'
    ? { tone: 'red', text: 'این عکس نشانه‌های روشن ویرایش دارد' }
    : ins.edit.verdict === 'likely'
      ? { tone: 'amber', text: 'چند نشانه کوچک از تغییر دیده می‌شود' }
      : ins.edit.verdict === 'clean'
        ? { tone: 'green', text: 'نشانه‌ای از ویرایش پیدا نشد' }
        : { tone: 'gray', text: 'داده کافی برای قضاوت نیست' }

  return (
    <>
      <div className="hero" style={{ gridTemplateColumns: '1fr', padding: 16 }}>
        <div>
          <span className={`verdict ${headline.tone}`}>
            <AlertTriangle size={13} /> {headline.text}
          </span>
          <div className="chip-row" style={{ marginTop: 10 }}>
            <Badge tone="cyan">{ins.edit.strong} نشانه قوی</Badge>
            <Badge tone="amber">{ins.edit.medium} نشانه متوسط</Badge>
            <Badge>{ins.edit.evidence.length} نشانه کل</Badge>
          </div>
        </div>
      </div>

      <Card icon={ScanLine} title="شواهد ویرایش" desc="هر مورد با منبع داده‌اش">
        {grouped.length ? grouped.map((e, i) => (
          <div className="evidence" key={i}>
            <span className="icon"><SeverityIcon severity={e.severity} /></span>
            <div>
              <b>{e.title}</b>
              <span>{e.detail}</span>
              <span className="mono" style={{ color: '#4d6b85', marginTop: 2 }}>{e.source}</span>
            </div>
          </div>
        )) : (
          <p className="small muted" style={{ margin: 0 }}>
            هیچ ردی از ویرایش در متادیتا، ساختار یا پیش‌نمایش این فایل پیدا نشد.
          </p>
        )}
      </Card>

      {a.xmp.history.length > 0 && (
        <Card icon={History} title="تاریخچه ویرایش XMP" desc="قدم‌به‌قدم، همان‌طور که ابزار ویرایش ثبت کرده">
          <table className="kv">
            <tbody>
              {a.xmp.history.map((h, i) => (
                <tr key={i}>
                  <th>{h.when || `مرحله ${i + 1}`}</th>
                  <td>
                    <b>{h.softwareAgent || h.action || 'نامشخص'}</b>
                    {h.parameters && <div className="small muted">{h.parameters}</div>}
                    {h.instanceID && <div className="raw">instanceID: {h.instanceID}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {a.xmp.creatorTool && (
            <div className="small muted" style={{ marginTop: 8 }}>ابزار سازنده: {a.xmp.creatorTool}</div>
          )}
        </Card>
      )}

      <div className="two-col">
        <Card icon={Aperture} title="نقشه ELA" desc="Error Level Analysis — اختلاف بازفشرده‌سازی">
          <ElaViewer file={a.file} />
        </Card>
        <Card icon={Waves} title="هیستوگرام نور" desc="توزیع روشنایی پیکسل‌ها">
          <Histogram file={a.file} />
        </Card>
      </div>

      <Card
        icon={Table2}
        title="جدول کوانتیزه فشرده‌سازی"
        desc={`${a.quant?.dqtCount || 0} بلوک DQT — امضای فشرده‌سازی`}
      >
        {tables.length ? (
          <div className="two-col">
            {tables.map((t) => <QuantTable key={`${t.id}-${t.offset}`} table={t} />)}
          </div>
        ) : (
          <p className="small muted" style={{ margin: 0 }}>
            این فرمت جدول کوانتیزه به سبک JPEG ندارد (PNG و WebP جدول DQT ندارند).
          </p>
        )}
        <Note tone="cyan">
          <div>
            جدول کوانتیزه فشرده‌سازیِ فایل را نشان می‌دهد. اگر با جدول استاندارد دوربین فرق کند یا کیفیتش پایین
            باشد، احتمال دوباره ذخیره‌شدن فایل بالا می‌رود. تعداد زیاد بلوک DQT هم نشانه چندبار ذخیره شدن است.
          </div>
        </Note>
      </Card>

      <Card icon={Settings2} title="اطلاعات پردازش" desc="نرم‌افزار و مسیر ذخیره">
        <table className="kv">
          <tbody>
            <tr><th>نرم‌افزار</th><td>{a.raw.Software || a.raw.ProcessingSoftware || '—'}</td></tr>
            <tr><th>رایانه میزبان</th><td>{a.raw.HostComputer || '—'}</td></tr>
            <tr><th>نسخه EXIF</th><td>{a.raw.ExifVersion || '—'}</td></tr>
            <tr><th>ابزار XMP</th><td>{a.xmp.creatorTool || '—'}</td></tr>
            <tr><th>شناسه سند</th><td className="mono">{a.xmp.documentID || '—'}</td></tr>
            <tr><th>شناسه سند اصلی</th><td className="mono">{a.xmp.originalDocumentID || '—'}</td></tr>
          </tbody>
        </table>
      </Card>

      {ins.ai.detected && (
        <Card icon={Sparkles} title="نشانه تولید با هوش مصنوعی" desc="این‌ها نشانه‌اند، نه اثبات">
          <div className="chip-row" style={{ marginBottom: 8 }}>
            {ins.ai.hits.map((h) => <Badge key={h.label} tone="violet">{h.label}</Badge>)}
          </div>
          <p className="small muted" style={{ margin: 0 }}>
            نام ابزارهای تولید تصویر در داده‌های فایل دیده شد. نبودِ این نام‌ها هم ثابت نمی‌کند عکس واقعی است؛
            بیشتر ابزارها هیچ اثری باقی نمی‌گذارند.
          </p>
        </Card>
      )}
    </>
  )
}
