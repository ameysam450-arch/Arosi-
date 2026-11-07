import { useRef, useState } from 'react'
import {
  UploadCloud, Fingerprint, Layers, ScanEye, Lock, ListTree, Aperture,
} from 'lucide-react'

const FEATURES = [
  { icon: Fingerprint, title: 'همه متادیتا', desc: 'EXIF، GPS، XMP، IPTC، ICC و MakerNote — بدون هیچ حذفی.' },
  { icon: Layers, title: 'داده پنهان', desc: 'پیش‌نمایش جاسازی‌شده، تصاویر دوم، داده پس از پایان فایل و رشته‌های خام.' },
  { icon: Aperture, title: 'رد ویرایش', desc: 'تاریخچه ویرایش، اختلاف پیش‌نمایش، جدول فشرده‌سازی و نقشه ELA.' },
  { icon: ScanEye, title: 'مسیر ارسال', desc: 'رد پای واتساپ، تلگرام، اینستاگرام و iMessage در فایل.' },
  { icon: ListTree, title: 'ساختار فایل', desc: 'تکتک بلوک‌های JPEG/PNG با آفست و اندازه.' },
  { icon: Lock, title: 'کاملاً محلی', desc: 'عکس‌ها از دستگاه شما بیرون نمی‌روند؛ همه تحلیل در مرورگر است.' },
]

export default function Dropzone({ onFiles }) {
  const inputRef = useRef(null)
  const [over, setOver] = useState(false)

  const handleDrop = (e) => {
    e.preventDefault()
    setOver(false)
    if (e.dataTransfer?.files?.length) onFiles(e.dataTransfer.files)
  }

  return (
    <div
      className={`dropzone ${over ? 'over' : ''}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={handleDrop}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click() }}
    >
      <input
        ref={inputRef}
        type="file"
        hidden
        multiple
        accept="image/*,.heic,.heif,.avif,.tif,.tiff"
        onChange={(e) => {
          if (e.target.files?.length) onFiles(e.target.files)
          e.target.value = ''
        }}
      />
      <div className="dz-icon"><UploadCloud size={26} /></div>
      <div className="dz-title">عکس را اینجا رها کنید یا کلیک کنید</div>
      <div className="dz-sub">
        JPEG، PNG، WebP، HEIC، TIFF — می‌توانید چند عکس را همزمان بریزید، یا با Ctrl+V از کلیپ‌بورد بچسبانید.
      </div>
      <div className="feature-grid">
        {FEATURES.map((f) => (
          <div className="feature" key={f.title}>
            <f.icon size={14} color="#35d6e8" style={{ marginBottom: 6 }} />
            <b>{f.title}</b>
            <span>{f.desc}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
