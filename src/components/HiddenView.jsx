import { useMemo, useState } from 'react'
import {
  Layers, Download, Search, Terminal, FileStack, MessageSquare, AlertTriangle,
  Link2, FolderOpen, Binary, Info,
} from 'lucide-react'
import { Badge, Card, Empty, Note } from './ui'
import { formatBytes } from '../lib/format'

function download(url, name) {
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
}

export default function HiddenView({ a }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')

  const strings = useMemo(() => {
    let list = a.strings
    if (filter === 'url') list = list.filter((s) => s.kind === 'url')
    if (filter === 'path') list = list.filter((s) => s.kind === 'path')
    const q = query.trim().toLowerCase()
    if (q) list = list.filter((s) => s.text.toLowerCase().includes(q))
    return list
  }, [a.strings, filter, query])

  const comments = a.segments.filter((s) => s.kind === 'comment' && s.text)
  const empty = !a.embedded.length && !a.trailing && !comments.length && !a.pngText.length && !strings.length

  return (
    <>
      {a.recoveredCount === 0 && (
        <Note>
          <div>
            <b>در این فایل داده پنهانی باقی نمانده است.</b>
            <div style={{ marginTop: 4 }}>
              این یعنی چیزی که در فایل هست را خوانده‌ایم و چیزی پیدا نشد — نه اینکه برنامه ضعیف است. وقتی عکسی از
              واتساپ، اینستاگرام یا تلگرام برای شما می‌آید، آن سرور آن را دوباره فشرده می‌کند و متادیتا و
              پیش‌نمایش اصلی را حذف می‌کند. چیزی که آن‌جا حذف شده، دیگر در فایل نیست و هیچ برنامه‌ای نمی‌تواند
              آن را از این فایل بیرون بکشد.
            </div>
          </div>
        </Note>
      )}

      {a.embedded.length > 0 && (
        <Card
          icon={Layers}
          title="پیش‌نمایش‌های جاسازی‌شده"
          desc="تصویرهایی که داخل فایل قایم شده‌اند — گاهی نسخه قبل از ویرایش"
        >
          {a.insights.edit.evidence.some(
            (e) => e.detail.includes('برش') || e.source === 'IFD1 thumbnail',
          ) && (
            <Note tone="cyan">
              <div>
                نسبت ابعاد این پیش‌نمایش با تصویر نهایی یکی نیست؛ یعنی تصویر بعد از ساخته‌شدن پیش‌نمایش برش خورده
                است. پیش‌نمایش، بخشی از کادر اصلی را نشان می‌دهد که در نسخه نهایی نیست.
              </div>
            </Note>
          )}
          <div className="thumb-grid" style={{ marginTop: 10 }}>
            {a.embedded.map((e, i) => (
              <div className="thumb-card" key={e.offset}>
                <img src={e.url} alt={`preview ${i + 1}`} />
                <div className="thumb-info">
                  <b>پیش‌نمایش {i + 1}</b>
                  <span>
                    {e.width ? `${e.width}×${e.height}` : 'ابعاد نامشخص'} · {formatBytes(e.length)}
                  </span>
                  <span>offset {e.offset}</span>
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{ marginTop: 7, width: '100%' }}
                    onClick={() => download(e.url, `پیش‌نمایش-${i + 1}-${a.name.replace(/\.[^.]+$/, '')}.jpg`)}
                  >
                    <Download size={12} /> ذخیره تصویر
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {a.trailing && (
        <Card icon={Binary} title="داده پس از پایان تصویر" desc="محتوایی که بعد از EOI در فایل مانده">
          <div className="chip-row" style={{ marginBottom: 8 }}>
            <Badge tone={a.trailing.kind === 'padding' ? '' : 'amber'}>{a.trailing.label}</Badge>
            <Badge>{formatBytes(a.trailing.length)}</Badge>
            <Badge>آفست {a.trailing.offset}</Badge>
          </div>
          {a.trailing.preview && (
            <pre className="report-pre" style={{ minHeight: 80 }}>{a.trailing.preview}</pre>
          )}
          <div className="small muted" style={{ marginTop: 6 }}>
            <span className="mono ltr">{a.trailing.hex}</span>
          </div>
        </Card>
      )}

      {(comments.length > 0 || a.pngText.length > 0) && (
        <div className="two-col">
          {comments.length > 0 && (
            <Card icon={MessageSquare} title="بلوک توضیح (COM)" desc="متن نوشته‌شده داخل فایل">
              {comments.map((c) => (
                <div key={c.offset} style={{ marginBottom: 8 }}>
                  <div className="raw">offset {c.offset} · {c.length} bytes</div>
                  <div className="small">{c.text}</div>
                </div>
              ))}
            </Card>
          )}
          {a.pngText.length > 0 && (
            <Card icon={FileStack} title="متن داخل PNG" desc="بلوک‌های tEXt / iTXt / tIME">
              <table className="kv">
                <tbody>
                  {a.pngText.map((t, i) => (
                    <tr key={i}>
                      <th>{t.keyword || t.type}</th>
                      <td>
                        {t.text || '—'}
                        {t.compressed && <div className="raw">فشرده‌شده (zTXt)</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {strings.length > 0 && (
        <Card
          icon={Terminal}
          title="رشته‌های خام فایل"
          desc={`${a.strings.length} رشته متنی از دل بایت‌ها بیرون کشیده شد`}
          actions={
            <div className="searchbox" style={{ maxWidth: 220 }}>
              <Search size={13} />
              <input placeholder="جست‌وجو در رشته‌ها…" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
          }
        >
          <div className="chip-row" style={{ marginBottom: 10 }}>
            {[
              ['all', `همه (${a.strings.length})`],
              ['url', `نشانی وب (${a.strings.filter((s) => s.kind === 'url').length})`],
              ['path', `مسیر فایل (${a.strings.filter((s) => s.kind === 'path').length})`],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`btn btn-sm ${filter === id ? 'btn-primary' : ''}`}
                onClick={() => setFilter(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="strings">
            {strings.slice(0, 300).map((s) => (
              <div className={`string-row ${s.kind ? 'hit' : ''}`} key={s.offset + s.text.slice(0, 8)}>
                <span className="off">{s.offset}</span>
                <span className="txt">
                  {s.kind === 'url' && <Link2 size={11} color="#35d6e8" style={{ marginInlineEnd: 4 }} />}
                  {s.kind === 'path' && <FolderOpen size={11} color="#a78bfa" style={{ marginInlineEnd: 4 }} />}
                  {s.text}
                </span>
              </div>
            ))}
          </div>
          {strings.length > 300 && (
            <div className="small muted" style={{ marginTop: 6 }}>
              فقط ۳۰۰ رشته اول نمایش داده شد. برای دیدن بقیه از جست‌وجو استفاده کنید.
            </div>
          )}
        </Card>
      )}

      <Card icon={FileStack} title="ساختار فایل" desc="تکتک بلوک‌ها با آفست و اندازه">
        <table className="seg-table">
          <thead>
            <tr>
              <th>بخش</th>
              <th>آفست</th>
              <th>اندازه</th>
              <th>داده</th>
            </tr>
          </thead>
          <tbody>
            {a.segments.map((s, i) => (
              <tr key={i} className={['exif', 'xmp', 'comment', 'mpf', 'iptc'].includes(s.kind) ? 'hl' : ''}>
                <td className="seg-name">{s.name}</td>
                <td>{s.offset}</td>
                <td>{formatBytes(s.length)}</td>
                <td className="seg-name">{s.text || (s.scanLength ? `${formatBytes(s.scanLength)} داده فشرده` : '')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {a.trailing && (
          <div className="small" style={{ marginTop: 8 }}>
            <AlertTriangle size={12} color="#fbbf24" /> پس از پایان تصویر {formatBytes(a.trailing.length)} داده اضافی
            وجود دارد.
          </div>
        )}
      </Card>

      {empty && (
        <Card icon={Info} title="راهنما">
          <p className="small muted" style={{ marginTop: 0 }}>
            برای دیدن داده واقعی، یک عکس اصل (مثلاً مستقیم از گالری گوشی یا دریافت‌شده به‌صورت «فایل») امتحان کنید.
            روی همان عکس معمولاً ده‌ها تگ، پیش‌نمایش داخلی و گاهی تاریخچه ویرایش پیدا می‌شود.
          </p>
          <Empty title="هیچ داده اضافه‌ای پیدا نشد">این فایل کاملاً تمیز است یا توسط پیام‌رسان بازنویسی شده است.</Empty>
        </Card>
      )}
    </>
  )
}
