import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ScanEye, ListTree, Layers, Aperture, ShieldAlert, FileJson, ImagePlus,
  FlaskConical, Lock, AlertTriangle,
} from 'lucide-react'
import { analyzeFile } from './lib/analyze'
import Dropzone from './components/Dropzone'
import FileList from './components/FileList'
import Overview from './components/Overview'
import MetadataView from './components/MetadataView'
import HiddenView from './components/HiddenView'
import EditsView from './components/EditsView'
import PrivacyView from './components/PrivacyView'
import ReportView from './components/ReportView'
import { Note } from './components/ui'

const TABS = [
  { id: 'overview', label: 'نمای کلی', icon: ScanEye },
  { id: 'metadata', label: 'متادیتا', icon: ListTree },
  { id: 'hidden', label: 'داده‌های پنهان', icon: Layers },
  { id: 'edits', label: 'نشانه‌های ویرایش', icon: Aperture },
  { id: 'privacy', label: 'حریم خصوصی', icon: ShieldAlert },
  { id: 'report', label: 'گزارش', icon: FileJson },
]

const IMAGE_EXT = /\.(jpe?g|jfif|png|webp|heic|heif|avif|tiff?|gif|bmp)$/i

export default function App() {
  const [analyses, setAnalyses] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [tab, setTab] = useState('overview')
  const [pending, setPending] = useState(0)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  const active = analyses.find((a) => a.id === activeId) || null

  const addFiles = useCallback(async (fileList) => {
    const arr = Array.from(fileList || [])
    if (!arr.length) return
    const images = arr.filter((f) => f.type.startsWith('image/') || IMAGE_EXT.test(f.name))
    if (!images.length) {
      setError('فایل انتخاب‌شده عکس نیست. فرمت‌های پشتیبانی‌شده: JPG، PNG، WebP، HEIC، TIFF، GIF')
      return
    }
    setError(null)
    const accepted = images.slice(0, 12)
    const skipped = images.length - accepted.length
    if (skipped > 0) setError(`برای هر بار بررسی حداکثر ۱۲ عکس پذیرفته می‌شود؛ ${skipped} فایل نادیده گرفته شد.`)

    setPending((p) => p + accepted.length)
    for (const file of accepted) {
      try {
        const a = await analyzeFile(file)
        setAnalyses((prev) => [...prev, a])
        setActiveId((prev) => prev ?? a.id)
      } catch (err) {
        setError(`تحلیل «${file.name}» ممکن نشد: ${err?.message || err}`)
      } finally {
        setPending((p) => Math.max(0, p - 1))
      }
    }
  }, [])

  const removeFile = useCallback((id) => {
    setAnalyses((prev) => {
      const target = prev.find((x) => x.id === id)
      if (target) {
        URL.revokeObjectURL(target.filePreviewUrl)
        target.embedded.forEach((e) => URL.revokeObjectURL(e.url))
      }
      const next = prev.filter((x) => x.id !== id)
      setActiveId((cur) => (cur === id ? next[0]?.id ?? null : cur))
      return next
    })
  }, [])

  const clearAll = useCallback(() => {
    analyses.forEach((a) => {
      URL.revokeObjectURL(a.filePreviewUrl)
      a.embedded.forEach((e) => URL.revokeObjectURL(e.url))
    })
    setAnalyses([])
    setActiveId(null)
    setTab('overview')
  }, [analyses])

  useEffect(() => {
    const onPaste = (e) => {
      const files = Array.from(e.clipboardData?.files || [])
      if (files.length) {
        e.preventDefault()
        addFiles(files)
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [addFiles])

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><FlaskConical size={19} /></div>
          <div>
            <div className="brand-title">عکس‌کاو</div>
            <div className="brand-sub">آزمایشگاه داده‌های عکس</div>
          </div>
        </div>
        <div className="topbar-spacer" />
        <span className="privacy-pill">
          <Lock size={12} />
          همه تحلیل‌ها روی همین دستگاه انجام می‌شود
        </span>
        <input
          ref={inputRef}
          type="file"
          hidden
          multiple
          accept="image/*,.heic,.heif,.avif,.tif,.tiff"
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files)
            e.target.value = ''
          }}
        />
        <button type="button" className="btn btn-primary" onClick={() => inputRef.current?.click()}>
          <ImagePlus size={14} /> افزودن عکس
        </button>
      </header>

      <div className="layout">
        <aside className="sidebar">
          <FileList
            analyses={analyses}
            activeId={activeId}
            onSelect={(id) => { setActiveId(id); setError(null) }}
            onRemove={removeFile}
            pending={pending}
            onClear={analyses.length ? clearAll : null}
          />
        </aside>

        <main className="main">
          {error && (
            <Note>
              <AlertTriangle size={15} /> {error}
            </Note>
          )}

          {pending > 0 && (
            <div className="card">
              <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="spinner" />
                <div className="small">
                  در حال خواندن ساختار فایل، متادیتا و داده‌های پنهان…
                  <div className="muted">عکس‌ها جایی ارسال نمی‌شوند؛ همه پردازش در همین مرورگر است.</div>
                </div>
              </div>
            </div>
          )}

          {!active ? (
            <>
              <Dropzone onFiles={addFiles} />
              <div className="footer-note">
                عکس‌کاو هر چیزی را که در فایل هست بیرون می‌کشد — اما چیزی را که پیام‌رسان‌ها پیش از رسیدن فایل حذف
                کرده‌اند، هیچ برنامه‌ای نمی‌تواند برگرداند.
              </div>
            </>
          ) : (
            <>
              <nav className="tabs">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`tab ${tab === t.id ? 'active' : ''}`}
                    onClick={() => setTab(t.id)}
                  >
                    <t.icon size={14} />
                    {t.label}
                    {t.id === 'hidden' && active.recoveredCount > 0 && (
                      <span className="tab-n">{active.recoveredCount}</span>
                    )}
                    {t.id === 'edits' && active.insights.edit.strong > 0 && (
                      <span className="tab-n">{active.insights.edit.strong}</span>
                    )}
                  </button>
                ))}
              </nav>

              {tab === 'overview' && <Overview a={active} />}
              {tab === 'metadata' && <MetadataView a={active} />}
              {tab === 'hidden' && <HiddenView a={active} />}
              {tab === 'edits' && <EditsView a={active} />}
              {tab === 'privacy' && <PrivacyView a={active} />}
              {tab === 'report' && <ReportView a={active} />}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
