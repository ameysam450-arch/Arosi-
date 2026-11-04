import { useState } from 'react'
import { Copy, Check, Info, AlertTriangle, ShieldAlert, Sparkles } from 'lucide-react'
import { copyText } from '../lib/format'

export function Card({ icon: Icon, title, desc, actions, children, tone = '' }) {
  return (
    <section className={`card ${tone}`}>
      {(title || actions) && (
        <header className="card-head">
          {Icon && <Icon size={15} />}
          <h3>{title}</h3>
          {desc && <div className="card-desc">{desc}</div>}
          {actions}
        </header>
      )}
      <div className="card-body">{children}</div>
    </section>
  )
}

export function Badge({ tone = '', children }) {
  return <span className={`badge ${tone}`}>{children}</span>
}

export function Note({ tone = '', icon: Icon = Info, children }) {
  return (
    <div className={`note ${tone}`}>
      <Icon size={16} />
      <div>{children}</div>
    </div>
  )
}

export function Empty({ title, children }) {
  return (
    <div className="empty-state">
      <b>{title}</b>
      {children}
    </div>
  )
}

export function CopyButton({ text, label = 'کپی' }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      className="btn btn-sm"
      onClick={async () => {
        const ok = await copyText(text)
        setDone(ok)
        setTimeout(() => setDone(false), 1600)
      }}
    >
      {done ? <Check size={12} /> : <Copy size={12} />}
      {done ? 'کپی شد' : label}
    </button>
  )
}

export function Gauge({ score = 0, size = 78 }) {
  const radius = size / 2 - 6
  const circ = 2 * Math.PI * radius
  const pct = Math.max(0, Math.min(100, score)) / 100
  const color = score >= 60 ? '#fb7185' : score >= 28 ? '#fbbf24' : '#4ade80'
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1b2730" strokeWidth="7" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={`${circ * pct} ${circ}`}
      />
    </svg>
  )
}

export function SeverityIcon({ severity }) {
  if (severity === 'strong') return <AlertTriangle size={16} color="#fb7185" />
  if (severity === 'medium') return <ShieldAlert size={16} color="#fbbf24" />
  if (severity === 'info') return <Info size={16} color="#7d8da3" />
  if (severity === 'weak') return <Sparkles size={16} color="#a78bfa" />
  return <Info size={16} color="#7d8da3" />
}

export function KV({ rows }) {
  return (
    <table className="kv">
      <tbody>
        {rows.map((r) => (
          <tr key={r.key || r.label}>
            <th>{r.label}</th>
            <td>{r.children || r.text}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
