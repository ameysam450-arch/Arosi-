// Heuristic interpretation layer: messenger fingerprints, edit evidence,
// AI-generation cues and a privacy exposure score. Everything produced here is
// a *sign*, never proof, and the UI states that.

const EDITOR_TOKENS = [
  ['adobe photoshop', 'Adobe Photoshop', 'strong'],
  ['photoshop', 'Adobe Photoshop', 'strong'],
  ['lightroom', 'Adobe Lightroom', 'strong'],
  ['snapseed', 'Snapseed', 'strong'],
  ['picsart', 'PicsArt', 'strong'],
  ['facetune', 'Facetune', 'strong'],
  ['vsco', 'VSCO', 'strong'],
  ['meitu', 'Meitu', 'strong'],
  ['pixlr', 'Pixlr', 'strong'],
  ['canva', 'Canva', 'strong'],
  ['inshot', 'InShot', 'strong'],
  ['polarr', 'Polarr', 'strong'],
  ['gimp', 'GIMP', 'strong'],
  ['paint.net', 'Paint.NET', 'strong'],
  ['pixelmator', 'Pixelmator', 'strong'],
  ['affinity photo', 'Affinity Photo', 'strong'],
  ['capture one', 'Capture One', 'strong'],
  ['darktable', 'darktable', 'strong'],
  ['rawtherapee', 'RawTherapee', 'strong'],
  ['rembrandt', 'Rembrandt', 'medium'],
  ['paint', 'Microsoft Paint', 'weak'],
]

const AI_TOKENS = [
  ['midjourney', 'Midjourney'],
  ['dall-e', 'DALL·E'],
  ['dall·e', 'DALL·E'],
  ['stable diffusion', 'Stable Diffusion'],
  ['sdxl', 'Stable Diffusion XL'],
  ['firefly', 'Adobe Firefly'],
  ['adobe firefly', 'Adobe Firefly'],
  ['generative fill', 'Generative Fill'],
  ['imagen', 'Google Imagen'],
  ['flux.1', 'FLUX'],
  ['comfyui', 'ComfyUI'],
  ['automatic1111', 'AUTOMATIC1111'],
  ['novelai', 'NovelAI'],
  ['c2pa', 'C2PA / Content Credentials'],
  ['contentcredentials', 'Content Credentials'],
  ['trainedalgorithmicmedia', 'TrainedAlgorithmicMedia'],
]

const MESSENGER_TOKENS = [
  ['whatsapp', 'واتساپ'],
  ['telegram', 'تلگرام'],
  ['instagram', 'اینستاگرام'],
  ['snapchat', 'اسنپ‌چت'],
  ['signal', 'سیگنال'],
  ['facebook', 'فیسبوک'],
  ['twitter', 'توییتر / X'],
]

const CAMERA_SOFTWARE = /^(ios|android|google|apple|samsung|xiaomi|huawei|oppo|vivo|oneplus|sony|nikon|canon|fujifilm|panasonic|olympus|dji)/i

function lc(s) {
  return (s || '').toLowerCase()
}

function stringBlob(strings) {
  return strings.map((s) => s.text).join('\n').toLowerCase()
}

function allTextBlob(raw, xmpFields) {
  const parts = []
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === 'string') parts.push(`${k}=${v}`)
  }
  for (const f of xmpFields || []) parts.push(`${f.key}=${f.value}`)
  return parts.join('\n').toLowerCase()
}

function softText(raw) {
  const keys = ['Software', 'ProcessingSoftware', 'HostComputer', 'Artist', 'Copyright', 'ImageDescription', 'UserComment']
  return keys.map((k) => (typeof raw[k] === 'string' ? raw[k] : '')).join(' | ').toLowerCase()
}

export function detectMessenger({ file, raw, strings, dims, format, hasExif }) {
  const name = lc(file?.name)
  const soft = softText(raw)
  const blob = stringBlob(strings) + '\n' + soft
  const signs = []
  let best = null

  if (/img-\d{8}-wa\d+/i.test(name)) {
    signs.push({ label: 'الگوی نام فایل واتساپ', detail: 'نام فایل با الگوی IMG-YYYYMMDD-WAxxxx مطابقت دارد', weight: 60 })
    best = best || { label: 'واتساپ', weight: 0 }
    best.weight += 60
  }
  if (/photo_\d{4}-\d{2}-\d{2}/i.test(name)) {
    signs.push({ label: 'الگوی نام فایل تلگرام', detail: 'نام فایل با الگوی photo_YYYY-MM-DD مطابقت دارد', weight: 55 })
    best = best || { label: 'تلگرام', weight: 0 }
    best.weight += 55
  }
  if (/instagram|insta[-_]?/i.test(name)) {
    signs.push({ label: 'نام فایل اینستاگرام', detail: 'نام فایل به اینستاگرام اشاره دارد', weight: 40 })
    best = best || { label: 'اینستاگرام', weight: 0 }
    best.weight += 40
  }
  for (const [token, label] of MESSENGER_TOKENS) {
    if (blob.includes(token)) {
      signs.push({ label: `نام «${label}» در داده‌ها`, detail: 'رشته‌ای با نام این پیام‌رسان داخل فایل پیدا شد', weight: 45 })
      best = best || { label, weight: 0 }
      best.weight += 45
    }
  }

  if (dims?.width) {
    const long = Math.max(dims.width, dims.height)
    const short = Math.min(dims.width, dims.height)
    if (long === 1600) {
      signs.push({ label: 'اندازه ۱۶۰۰ پیکسل', detail: 'واتساپ تصاویر را معمولاً به حداکثر ۱۶۰۰ پیکسل کاهش می‌دهد', weight: 28 })
    } else if (long === 1280) {
      signs.push({ label: 'اندازه ۱۲۸۰ پیکسل', detail: 'الگوی رایج فشرده‌سازی تلگرام', weight: 20 })
    } else if (long === 1080 && short === 1080) {
      signs.push({ label: 'قاب مربع ۱۰۸۰', detail: 'الگوی رایج پست اینستاگرام', weight: 18 })
    } else if (long === 2048) {
      signs.push({ label: 'اندازه ۲۰۴۸ پیکسل', detail: 'نمونه رایج بازفشرده‌سازی پیام‌رسان‌ها', weight: 10 })
    }
  }

  if (!hasExif && (format === 'jpeg' || format === 'png')) {
    signs.push({
      label: 'بدون هیچ داده EXIF',
      detail: 'پیام‌رسان‌ها هنگام ارسال، متادیتای اصلی را حذف می‌کنند. نبودِ کامل EXIF خودش یک نشانه است.',
      weight: 20,
    })
  }

  const total = signs.reduce((s, x) => s + x.weight, 0)
  const confidence = Math.min(96, total)
  return {
    label: best?.label || (hasExif ? 'ارسال مستقیم / فایل اصلی' : 'نامشخص'),
    confidence,
    signs,
    note: hasExif
      ? 'وجود متادیتای کامل دوربین نشان می‌دهد فایل بازفشرده‌سازی نشده یا با روشی ارسال شده که داده را حفظ می‌کند (مثل AirDrop یا ارسال به‌صورت فایل).'
      : 'این فایل هیچ متادیتای دوربینی ندارد؛ محتمل‌ترین حالت، عبور از پیام‌رسان یا اسکرین‌شات است.',
  }
}

export function detectEdits({ raw, xmp, strings, dims, previewCompare, aspect, structure, quant }) {
  const evidence = []
  const soft = String(raw.Software || raw.ProcessingSoftware || '').toLowerCase()
  const xmpFields = xmp?.fields || []
  const blob = stringBlob(strings)
  const metaBlob = allTextBlob(raw, xmpFields)

  // 1. Software tag
  if (raw.Software || raw.ProcessingSoftware) {
    const s = String(raw.Software || raw.ProcessingSoftware)
    const isCamera = CAMERA_SOFTWARE.test(s)
    const isOsVersion = /^v?\d+(\.\d+)+$/.test(s.trim())
    const editor = EDITOR_TOKENS.find(([t]) => s.toLowerCase().includes(t))
    if (isOsVersion && (raw.Make || raw.Model)) {
      evidence.push({
        severity: 'info',
        title: `نسخه سیستم‌عامل ثبت‌شده: ${s}`,
        detail: 'مقدار Software فقط شماره نسخه iOS/Android است؛ این حالت عادی دوربین گوشی است و نشانه ویرایش نیست.',
        source: 'EXIF Software',
      })
    } else if (editor) {
      evidence.push({
        severity: 'strong',
        title: `نرم‌افزار ویرایش: ${editor[1]}`,
        detail: `تگ Software مقدار «${s}» دارد؛ این برنامه یک ویرایشگر تصویر است، نه دوربین.`,
        source: 'EXIF Software',
      })
    } else {
      evidence.push({
        severity: isCamera ? 'info' : 'medium',
        title: `نرم‌افزار ثبت‌شده: ${s}`,
        detail: isCamera
          ? 'این مقدار متعلق به سیستم دوربین/گوشی است و معمولاً نشانه ویرایش نیست.'
          : 'نرم‌افزاری ثبت شده که دوربین نیست؛ ممکن است عکس پس از عکس‌برداری دوباره ذخیره شده باشد.',
        source: 'EXIF Software',
      })
    }
  }

  // 2. XMP tool + history
  if (xmp?.creatorTool) {
    evidence.push({
      severity: 'strong',
      title: `ابزار XMP: ${xmp.creatorTool}`,
      detail: 'بسته XMP نام ابزار سازنده را ثبت کرده است.',
      source: 'XMP xmp:CreatorTool',
    })
  }
  if (xmp?.history?.length) {
    evidence.push({
      severity: 'strong',
      title: `تاریخچه ویرایش XMP (${xmp.history.length} مرحله)`,
      detail: 'Adobe در XMP فهرست مراحل ویرایش را نگه می‌دارد؛ این کامل‌ترین داده‌ای است که معمولاً از یک عکس ویرایش‌شده به‌دست می‌آید.',
      source: 'XMP xmpMM:History',
    })
  }
  if (xmp?.originalDocumentID && xmp?.documentID && xmp.originalDocumentID !== xmp.documentID) {
    evidence.push({
      severity: 'medium',
      title: 'شناسه سند تغییر کرده',
      detail: `OriginalDocumentID با DocumentID یکسان نیست؛ یعنی سند اصلی بازنویسی شده است.`,
      source: 'XMP',
    })
  }

  // 3. Timestamp delta
  const cap = raw.DateTimeOriginal || raw.CreateDate
  const mod = raw.ModifyDate
  if (cap instanceof Date && mod instanceof Date) {
    const delta = mod.getTime() - cap.getTime()
    if (delta > 120000) {
      const minutes = Math.round(delta / 60000)
      evidence.push({
        severity: 'medium',
        title: 'زمان تغییر با زمان عکس‌برداری فاصله دارد',
        detail: `آخرین تغییر ${minutes.toLocaleString('fa-IR')} دقیقه بعد از عکس‌برداری ثبت شده است.`,
        source: 'EXIF DateTimeOriginal / ModifyDate',
      })
    } else if (delta < -120000) {
      evidence.push({
        severity: 'medium',
        title: 'زمان تغییر قبل از عکس‌برداری است',
        detail: 'این تناقض معمولاً یعنی ساعت دستگاه یا فایل دستکاری شده است.',
        source: 'EXIF',
      })
    }
  }

  // 4. Embedded preview differs from the image
  if (previewCompare && previewCompare.difference > 18) {
    evidence.push({
      severity: 'strong',
      title: 'پیش‌نمایش جاسازی‌شده با تصویر فعلی نمی‌خواند',
      detail: `اختلاف پیکسلی میان پیش‌نمایش داخلی و تصویر نهایی ${Math.round(previewCompare.difference)} است. یعنی تصویر بعد از ساخت پیش‌نمایش، ویرایش یا برش خورده است.`,
      source: 'IFD1 thumbnail',
    })
  }

  // 5. Preview aspect vs image aspect -> crop
  if (aspect?.cropped) {
    evidence.push({
      severity: 'strong',
      title: 'نسبت ابعاد پیش‌نمایش با تصویر اصلی فرق دارد',
      detail: `نسبت ابعاد پیش‌نمایش ${Math.round(aspect.previewRatio * 100) / 100} و تصویر ${Math.round(aspect.imageRatio * 100) / 100} است؛ نشانه برش (Crop) بعد از ثبت.`,
      source: 'IFD1 thumbnail',
    })
  }

  // 6. Duplicate segments -> re-saved
  if (structure?.segments) {
    const exifCount = structure.segments.filter((s) => s.name === 'APP1').length
    if (exifCount > 1) {
      evidence.push({
        severity: 'medium',
        title: `${exifCount} بلوک APP1 در فایل`,
        detail: 'وجود چند بلوک متادیتا در یک فایل یعنی فایل چند بار بازنویسی یا ترکیب شده است.',
        source: 'ساختار JPEG',
      })
    }
  }

  // 7. Editor names inside raw strings / metadata
  const tokensHit = new Set()
  for (const [token, label] of EDITOR_TOKENS) {
    if (blob.includes(token) || metaBlob.includes(token)) tokensHit.add(label)
  }
  tokensHit.forEach((label) => {
    if (evidence.some((e) => e.title.includes(label))) return
    evidence.push({
      severity: 'medium',
      title: `نام «${label}» در داده‌ها یافت شد`,
      detail: 'این نام در رشته‌های داخل فایل دیده می‌شود؛ می‌تواند امضای نرم‌افزار ویرایش باشد.',
      source: 'رشته‌های خام',
    })
  })

  // 8. Quantization tables -> recompression level
  const luma = quant?.tables?.[0]
  if (luma?.quality?.quality != null && luma.quality.quality < 72 && dims?.width >= 1000) {
    evidence.push({
      severity: 'weak',
      title: `فشرده‌سازی تقریبی کیفیت ${luma.quality.quality}`,
      detail: 'کیفیت پایین جدول کوانتیزه با خروجی خام دوربین سازگار نیست و معمولاً یعنی فایل دوباره ذخیره شده است.',
      source: 'DQT',
    })
  }

  const strong = evidence.filter((e) => e.severity === 'strong').length
  const medium = evidence.filter((e) => e.severity === 'medium').length
  const verdict = strong > 0 ? 'edited' : medium > 0 ? 'likely' : evidence.length ? 'clean' : 'unknown'

  return { evidence, verdict, strong, medium }
}

export function detectAi({ strings, raw, xmp, pngText }) {
  const blob = stringBlob(strings) + '\n' + allTextBlob(raw, xmp?.fields)
  const hits = []
  for (const [token, label] of AI_TOKENS) {
    if (blob.includes(token)) hits.push({ label, token })
  }
  if (pngText?.some((t) => /parameters/i.test(t.keyword) && /steps:|sampler|cfg scale/i.test(t.text || ''))) {
    hits.push({ label: 'Stable Diffusion (پارامترهای تولید)', token: 'parameters' })
  }
  const unique = []
  const seen = new Set()
  for (const h of hits) {
    if (seen.has(h.label)) continue
    seen.add(h.label)
    unique.push(h)
  }
  return { detected: unique.length > 0, hits: unique }
}

export function privacyScore({ raw, xmp, dims }) {
  const findings = []
  let score = 0
  const add = (points, title, detail) => {
    findings.push({ points, title, detail })
    score += points
  }

  const lat = raw.latitude ?? raw.GPSLatitude
  const lon = raw.longitude ?? raw.GPSLongitude
  const hasGps = typeof lat === 'number' && typeof lon === 'number'
  if (hasGps) {
    add(45, 'مختصات دقیق محل عکس‌برداری',
      'هر کسی که این عکس را بگیرد می‌تواند محل ثبت آن را تا حد یک خیابان پیدا کند.')
  }
  if (raw.SerialNumber || raw.BodySerialNumber || raw.LensSerialNumber) {
    add(12, 'شماره سریال دوربین',
      'شماره سریال، عکس‌های مختلف یک دستگاه را به هم وصل می‌کند.')
  }
  if (raw.CameraOwnerName || raw.Artist || raw.Copyright) {
    add(12, 'نام مالک یا پدیدآور',
      'نام در متادیتا ثبت شده و هویت شما را لو می‌دهد.')
  }
  if (raw.Make || raw.Model) {
    add(8, 'مدل دقیق دستگاه',
      'نوع گوشی یا دوربین و در بعضی مدل‌ها مشخصات سخت‌افزاری قابل شناسایی است.')
  }
  if (raw.DateTimeOriginal || raw.CreateDate) {
    add(8, 'زمان دقیق عکس‌برداری',
      'زمان ثبت عکس، عادت‌ها و موقعیت زمانی شما را مشخص می‌کند.')
  }
  if (xmp?.creatorTool || xmp?.documentID) {
    add(6, 'شناسه سند و ابزار ویرایش',
      'شناسه سند در XMP می‌تواند نسخه‌های مختلف یک عکس را به هم پیوند دهد.')
  }
  if (raw.GPSProcessingMethod || raw.GPSHPositioningError) {
    add(4, 'جزئیات مکان‌یابی',
      'روش و دقت مکان‌یابی هم در فایل ذخیره شده است.')
  }
  if (raw.ImageDescription || raw.UserComment || raw.XPComment) {
    add(4, 'یادداشت یا توضیح متنی',
      'متن‌های نوشته‌شده داخل فایل ممکن است اطلاعات خصوصی داشته باشند.')
  }

  const level = score >= 60 ? 'high' : score >= 28 ? 'medium' : score > 0 ? 'low' : 'none'
  return { score: Math.min(100, score), level, findings, hasGps, lat: hasGps ? lat : null, lon: hasGps ? lon : null }
}
