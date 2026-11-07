import { Trash2, ImageIcon, AlertTriangle, ShieldAlert } from 'lucide-react'
import { formatBytes } from '../lib/format'

export default function FileList({ analyses, activeId, onSelect, onRemove, pending = 0, onClear }) {
  const withGps = analyses.filter((a) => a.insights?.privacy?.hasGps).length
  const edited = analyses.filter((a) => ['edited', 'likely'].includes(a.insights?.edit?.verdict)).length
  const recovered = analyses.reduce((s, a) => s + (a.recoveredCount || 0), 0)

  return (
    <>
      <div className="panel">
        <div className="panel-head">
          <span>عکس‌های بررسی‌شده</span>
          <span className="count">{analyses.length}</span>
        </div>
        <div className="file-list">
          {!analyses.length && !pending && (
            <div className="empty-side">هنوز عکسی اضافه نشده است.</div>
          )}
          {analyses.map((a) => {
            const danger = a.insights?.privacy?.level === 'high'
            const warn = a.insights?.edit?.verdict === 'edited'
            return (
              <button
                key={a.id}
                type="button"
                className={`file-item ${activeId === a.id ? 'active' : ''}`}
                onClick={() => onSelect(a.id)}
              >
                <img className="file-thumb" src={a.filePreviewUrl} alt="" />
                <div style={{ minWidth: 0 }}>
                  <div className="file-name">{a.name}</div>
                  <div className="file-meta">
                    {formatBytes(a.size)} · {a.formatLabel}
                    {a.dims?.width ? ` · ${a.dims.width}×${a.dims.height}` : ''}
                  </div>
                </div>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className={`dot ${danger ? 'red' : warn ? 'amber' : a.recoveredCount ? 'cyan' : 'green'}`} />
                  <span
                    className="icon-btn"
                    role="button"
                    tabIndex={0}
                    title="حذف از فهرست"
                    onClick={(e) => { e.stopPropagation(); onRemove(a.id) }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onRemove(a.id) } }}
                  >
                    <Trash2 size={12} />
                  </span>
                </span>
              </button>
            )
          })}
          {pending > 0 && (
            <div className="file-item" style={{ cursor: 'default', gridTemplateColumns: '42px 1fr' }}>
              <div className="skeleton" style={{ width: 42, height: 42, borderRadius: 9 }} />
              <div>
                <div className="skeleton" style={{ width: '70%', marginBottom: 6 }} />
                <div className="skeleton" style={{ width: '45%', height: 10 }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {analyses.length > 0 && (
        <div className="panel">
          <div className="panel-head">
            <span>جمع‌بندی</span>
            {onClear && (
              <button type="button" className="btn btn-ghost btn-sm btn-danger" onClick={onClear}>
                پاک‌سازی همه
              </button>
            )}
          </div>
          <div className="stats-grid">
            <div className="stat-cell">
              <b>{analyses.length}</b>
              <span>عکس</span>
            </div>
            <div className="stat-cell">
              <b style={{ color: withGps ? '#fb7185' : undefined }}>{withGps}</b>
              <span><ShieldAlert size={10} /> با مکان</span>
            </div>
            <div className="stat-cell">
              <b style={{ color: edited ? '#fbbf24' : undefined }}>{edited}</b>
              <span><AlertTriangle size={10} /> با رد ویرایش</span>
            </div>
            <div className="stat-cell">
              <b style={{ color: '#35d6e8' }}>{recovered}</b>
              <span><ImageIcon size={10} /> داده بازیابی‌شده</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
