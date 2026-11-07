import { useMemo, useState } from 'react'
import { ListTree, Clock, Search, FileJson, Info } from 'lucide-react'
import { Badge, Card, CopyButton, Empty, Note } from './ui'
import { formatDate, formatIso } from '../lib/format'

function safeJson(raw) {
  return JSON.stringify(
    raw,
    (key, value) => {
      if (value instanceof Date) return value.toISOString()
      if (value instanceof Uint8Array) return `<${value.length} bytes>`
      return value
    },
    2,
  )
}

export default function MetadataView({ a }) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()

  const groups = useMemo(() => {
    if (!q) return a.groups
    return a.groups
      .map((g) => ({
        ...g,
        rows: g.rows.filter((r) =>
          `${r.label} ${r.key} ${r.isDate ? r.value.toISOString() : r.text}`.toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.rows.length)
  }, [a.groups, q])

  const total = a.groups.reduce((s, g) => s + g.rows.length, 0)

  return (
    <>
      {a.timeline.length > 0 && (
        <Card icon={Clock} title="خط زمانی" desc="ترتیب زمانی همه رکوردهای تاریخ">
          <table className="kv">
            <tbody>
              {a.timeline.map((t) => (
                <tr key={t.key + t.date.toISOString()}>
                  <th>{t.label}</th>
                  <td>
                    <span title={formatIso(t.date)}>{formatDate(t.date)}</span>
                    <div className="raw">{t.date.toISOString()}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Card
        icon={ListTree}
        title="همه متادیتا"
        desc={`${total} تگ در ${a.groups.length} گروه`}
        actions={
          <div className="searchbox" style={{ maxWidth: 240 }}>
            <Search size={13} />
            <input
              placeholder="جست‌وجو در متادیتا…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        }
      >
        {!groups.length && <Empty title="چیزی پیدا نشد">این فایل هیچ تگ متادیتای قابل‌خواندنی ندارد.</Empty>}
        <div className="two-col">
          {groups.map((g) => (
            <div key={g.id}>
              <div className="chip-row" style={{ marginBottom: 6 }}>
                <Badge tone="cyan">{g.title}</Badge>
                <span className="small muted">{g.rows.length} تگ</span>
              </div>
              <table className="kv">
                <tbody>
                  {g.rows.map((r) => (
                    <tr key={r.key}>
                      <th>{r.label}</th>
                      <td>
                        {r.isDate ? (
                          <>
                            <span title={formatIso(r.value)}>{formatDate(r.value)}</span>
                            <div className="raw">{r.value.toISOString()}</div>
                          </>
                        ) : (
                          <>
                            {r.text}
                            {r.text !== r.key && <div className="raw">{r.key}</div>}
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </Card>

      <Card
        icon={FileJson}
        title="متادیتای خام (JSON)"
        desc="همان داده، بدون هیچ ترجمه‌ای"
        actions={<CopyButton text={safeJson(a.raw)} label="کپی JSON" />}
      >
        <pre className="report-pre" style={{ minHeight: 180 }}>{safeJson(a.raw)}</pre>
      </Card>

      {a.xmp.packets.length > 0 && (
        <Card icon={Info} title="بسته‌های XMP" desc={`${a.xmp.packets.length} بسته، ${a.xmp.fields.length} فیلد`}>
          {a.xmp.packets.map((p, i) => (
            <details key={i} style={{ marginBottom: 8 }}>
              <summary className="small" style={{ cursor: 'pointer' }}>
                بسته {i + 1} — آفست {p.offset} — {p.fields.length} فیلد
              </summary>
              <pre className="report-pre" style={{ marginTop: 8, minHeight: 120 }}>{p.xml}</pre>
            </details>
          ))}
        </Card>
      )}

      {!a.groups.length && (
        <Note>
          هیچ متادیتایی خوانده نشد. اگر این عکس از واتساپ یا اینستاگرام آمده باشد، آن برنامه‌ها متادیتا را پیش از
          ارسال حذف می‌کنند و چیزی باقی نمی‌ماند.
        </Note>
      )}
    </>
  )
}
