import exifr from 'exifr'

const PARSE_OPTIONS = {
  tiff: true,
  ifd0: true,
  exif: true,
  gps: true,
  interop: true,
  ifd1: true,
  xmp: true,
  icc: true,
  iptc: true,
  jfif: true,
  ihdr: true,
  makerNote: true,
  userComment: true,
  translateKeys: true,
  translateValues: true,
  reviveValues: true,
  sanitize: true,
  mergeOutput: true,
  silentErrors: true,
}

export async function parseAllMetadata(buffer) {
  try {
    const out = await exifr.parse(buffer, { ...PARSE_OPTIONS, silentErrors: false })
    return out && typeof out === 'object' ? out : {}
  } catch (err) {
    // One malformed block must not hide the rest: retry with lenient settings.
    try {
      const out = await exifr.parse(buffer, { ...PARSE_OPTIONS, xmp: false, icc: false, iptc: false })
      return out && typeof out === 'object' ? out : {}
    } catch {
      return {}
    }
  }
}

export const LABELS = {
  Make: 'سازنده',
  Model: 'مدل دستگاه',
  LensMake: 'سازنده لنز',
  LensModel: 'مدل لنز',
  LensInfo: 'مشخصات لنز',
  LensSerialNumber: 'سریال لنز',
  SerialNumber: 'شماره سریال دوربین',
  BodySerialNumber: 'سریال بدنه',
  CameraOwnerName: 'نام مالک دوربین',
  Software: 'نرم‌افزار',
  ProcessingSoftware: 'نرم‌افزار پردازش',
  HostComputer: 'رایانه میزبان',
  Artist: 'هنرمند / پدیدآور',
  Copyright: 'حق نشر',
  ImageDescription: 'توضیح تصویر',
  XPTitle: 'عنوان (XP)',
  XPComment: 'توضیح (XP)',
  XPAuthor: 'نویسنده (XP)',
  XPKeywords: 'کلیدواژه‌ها (XP)',
  XPSubject: 'موضوع (XP)',

  DateTimeOriginal: 'زمان عکس‌برداری',
  CreateDate: 'زمان ایجاد',
  ModifyDate: 'زمان آخرین تغییر',
  DateTimeDigitized: 'زمان دیجیتالی‌شدن',
  OffsetTime: 'اختلاف زمانی (UTC)',
  OffsetTimeOriginal: 'اختلاف زمانی عکس‌برداری',
  OffsetTimeDigitized: 'اختلاف زمانی دیجیتالی‌شدن',
  SubSecTime: 'زیرثانیه',
  SubSecTimeOriginal: 'زیرثانیه عکس‌برداری',
  SubSecTimeDigitized: 'زیرثانیه دیجیتالی',
  GPSDateStamp: 'تاریخ GPS',
  GPSTimeStamp: 'زمان GPS',
  PreviewDateTime: 'زمان پیش‌نمایش',

  latitude: 'عرض جغرافیایی',
  longitude: 'طول جغرافیایی',
  GPSLatitude: 'عرض جغرافیایی',
  GPSLongitude: 'طول جغرافیایی',
  GPSLatitudeRef: 'نیم‌کره عرض',
  GPSLongitudeRef: 'نیم‌کره طول',
  GPSAltitude: 'ارتفاع',
  GPSAltitudeRef: 'مرجع ارتفاع',
  GPSSpeed: 'سرعت',
  GPSSpeedRef: 'یکای سرعت',
  GPSImgDirection: 'جهت تصویر',
  GPSImgDirectionRef: 'مرجع جهت',
  GPSTrack: 'مسیر حرکت',
  GPSProcessingMethod: 'روش مکان‌یابی',
  GPSHPositioningError: 'خطای موقعیت‌یابی (متر)',
  GPSMapDatum: 'مرجع نقشه',
  GPSDOP: 'دقت (DOP)',
  GPSMeasureMode: 'حالت اندازه‌گیری',

  ImageWidth: 'عرض تصویر',
  ImageHeight: 'ارتفاع تصویر',
  ExifImageWidth: 'عرض EXIF',
  ExifImageHeight: 'ارتفاع EXIF',
  Orientation: 'جهت‌گیری',
  XResolution: 'وضوح افقی',
  YResolution: 'وضوح عمودی',
  ResolutionUnit: 'یکای وضوح',
  BitsPerSample: 'بیت بر نمونه',
  ColorSpace: 'فضای رنگ',
  Compression: 'فشرده‌سازی',
  PhotometricInterpretation: 'تفسیر نورسنجی',
  SamplesPerPixel: 'نمونه در هر پیکسل',
  YCbCrPositioning: 'جای‌گیری YCbCr',
  YCbCrSubSampling: 'زیرنمونه‌برداری رنگ',
  ExifVersion: 'نسخه EXIF',
  FlashpixVersion: 'نسخه FlashPix',
  ComponentsConfiguration: 'پیکربندی مؤلفه‌ها',
  ThumbnailWidth: 'عرض بندانگشتی',
  ThumbnailHeight: 'ارتفاع بندانگشتی',
  ThumbnailLength: 'اندازه بندانگشتی',
  ThumbnailOffset: 'آفست بندانگشتی',

  ExposureTime: 'زمان نوردهی',
  FNumber: 'عدد دیافراگم',
  ExposureProgram: 'برنامه نوردهی',
  ISO: 'حساسیت (ISO)',
  ISOSpeedRatings: 'حساسیت (ISO)',
  ShutterSpeedValue: 'سرعت شاتر',
  ApertureValue: 'دیافراگم',
  BrightnessValue: 'روشنایی',
  ExposureBiasValue: 'جبران نوردهی',
  MaxApertureValue: 'حداکثر دیافراگم',
  SubjectDistance: 'فاصله سوژه',
  MeteringMode: 'حالت نورسنجی',
  LightSource: 'منبع نور',
  Flash: 'فلاش',
  FocalLength: 'فاصله کانونی',
  FocalLengthIn35mmFormat: 'فاصله کانونی معادل ۳۵ میلی‌متر',
  DigitalZoomRatio: 'نسبت زوم دیجیتال',
  WhiteBalance: 'تعادل رنگ سفید',
  ExposureMode: 'حالت نوردهی',
  SceneCaptureType: 'نوع صحنه',
  Contrast: 'کنتراست',
  Saturation: 'اشباع رنگ',
  Sharpness: 'وضوح',
  SensingMethod: 'روش حس‌گری',
  SubjectArea: 'ناحیه سوژه',
  SubjectDistanceRange: 'بازه فاصله سوژه',
  GainControl: 'کنترل بهره',
  NoiseReduction: 'کاهش نویز',
  UserComment: 'توضیح کاربر',
  MakerNote: 'نوشته سازنده (MakerNote)',
  CreatorTool: 'ابزار سازنده (XMP)',
  DocumentID: 'شناسه سند',
  InstanceID: 'شناسه نمونه',
  OriginalDocumentID: 'شناسه سند اصلی',
  MetadataDate: 'زمان متادیتا',
  CreateDate2: 'زمان ایجاد (XMP)',
  History: 'تاریخچه ویرایش',
  DerivedFrom: 'مشتق‌شده از',
  Label: 'برچسب',
  Rating: 'امتیاز',
  Subject: 'موضوع',
  Title: 'عنوان',
  InteropIndex: 'شاخص سازگاری',
  'ProfileDescription': 'توضیح پروفایل رنگ',
  'ProfileCopyright': 'حق نشر پروفایل',
  'ColorSpaceData': 'داده فضای رنگ',
  'DeviceManufacturer': 'سازنده دستگاه (رنگ)',
  'DeviceModel': 'مدل دستگاه (رنگ)',
  'MediaWhitePoint': 'نقطه سفید',
  'PrimaryPlatform': 'سکوی اصلی',
  'RenderingIntent': 'قصد رندر',
}

const GROUPS = [
  {
    id: 'device',
    title: 'دوربین و دستگاه',
    keys: ['Make', 'Model', 'LensMake', 'LensModel', 'LensInfo', 'LensSerialNumber', 'SerialNumber',
      'BodySerialNumber', 'CameraOwnerName', 'SensingMethod', 'ExposureProgram', 'ISO', 'ISOSpeedRatings',
      'ExposureTime', 'FNumber', 'ShutterSpeedValue', 'ApertureValue', 'MaxApertureValue', 'ExposureBiasValue',
      'BrightnessValue', 'MeteringMode', 'LightSource', 'Flash', 'FocalLength', 'FocalLengthIn35mmFormat',
      'DigitalZoomRatio', 'WhiteBalance', 'ExposureMode', 'SceneCaptureType', 'Contrast', 'Saturation',
      'Sharpness', 'SubjectDistance', 'SubjectArea', 'SubjectDistanceRange', 'GainControl', 'NoiseReduction'],
  },
  {
    id: 'time',
    title: 'زمان‌ها',
    keys: ['DateTimeOriginal', 'CreateDate', 'ModifyDate', 'DateTimeDigitized', 'OffsetTime',
      'OffsetTimeOriginal', 'OffsetTimeDigitized', 'SubSecTime', 'SubSecTimeOriginal', 'SubSecTimeDigitized',
      'GPSDateStamp', 'GPSTimeStamp', 'PreviewDateTime'],
  },
  {
    id: 'gps',
    title: 'موقعیت جغرافیایی',
    keys: ['latitude', 'longitude', 'GPSLatitude', 'GPSLongitude', 'GPSLatitudeRef', 'GPSLongitudeRef',
      'GPSAltitude', 'GPSAltitudeRef', 'GPSSpeed', 'GPSSpeedRef', 'GPSImgDirection', 'GPSImgDirectionRef',
      'GPSTrack', 'GPSProcessingMethod', 'GPSHPositioningError', 'GPSMapDatum', 'GPSDOP', 'GPSMeasureMode'],
  },
  {
    id: 'image',
    title: 'ساختار تصویر',
    keys: ['ImageWidth', 'ImageHeight', 'ExifImageWidth', 'ExifImageHeight', 'Orientation', 'XResolution',
      'YResolution', 'ResolutionUnit', 'BitsPerSample', 'ColorSpace', 'Compression',
      'PhotometricInterpretation', 'SamplesPerPixel', 'YCbCrPositioning', 'YCbCrSubSampling', 'ExifVersion',
      'FlashpixVersion', 'ComponentsConfiguration', 'ThumbnailWidth', 'ThumbnailHeight', 'ThumbnailLength',
      'ThumbnailOffset'],
  },
  {
    id: 'author',
    title: 'پدیدآور و حقوق',
    keys: ['Artist', 'Copyright', 'ImageDescription', 'XPTitle', 'XPComment', 'XPAuthor', 'XPKeywords',
      'XPSubject', 'UserComment', 'MakerNote', 'ObjectName', 'Caption-Abstract', 'Keywords', 'By-line',
      'Credit', 'Source', 'City', 'Country-PrimaryLocationName', 'Headline'],
  },
  {
    id: 'software',
    title: 'نرم‌افزار و پردازش',
    keys: ['Software', 'ProcessingSoftware', 'HostComputer'],
  },
]

const KEY_TO_GROUP = new Map()
GROUPS.forEach((g) => g.keys.forEach((k) => KEY_TO_GROUP.set(k, g.id)))

const COLOR_HINTS = /^(Profile|ColorSpaceData|DeviceManufacturer|DeviceModel|MediaWhitePoint|PrimaryPlatform|RenderingIntent|ViewingConditions|ICC)/i
const XMP_HINTS = /^(xmp|dc|photoshop|tiff|xmpMM|stEvt|exif|aux|crs|Iptc4xmpCore|pdf|xmpRights|plus|GPano|GImage|drone-dji):/i

function humanizeKey(key) {
  return LABELS[key] || key.replace(/^[a-z0-9]+:/i, '').replace(/([a-z])([A-Z])/g, '$1 $2')
}

export function isDateValue(v) {
  return v instanceof Date && !Number.isNaN(v.getTime())
}

export function renderValue(v) {
  if (v == null) return '—'
  if (v instanceof Date) return null
  if (typeof v === 'number') {
    return Number.isInteger(v) ? String(v) : v.toFixed(4).replace(/\.?0+$/, '')
  }
  if (typeof v === 'boolean') return v ? 'بله' : 'خیر'
  if (typeof v === 'string') {
    const s = v.replace(/\0/g, '').trim()
    if (!s) return '—'
    return s.length > 400 ? `${s.slice(0, 400)}…` : s
  }
  if (Array.isArray(v)) {
    if (v.every((x) => x instanceof Date)) return v.map((d) => d.toISOString()).join(' , ')
    if (v.length > 8) return `${v.slice(0, 8).join(', ')} … (${v.length})`
    return v.map((x) => (typeof x === 'object' ? JSON.stringify(x) : renderValue(x))).join(', ')
  }
  if (typeof v === 'object') {
    const entries = Object.entries(v)
    if (!entries.length) return '—'
    const flat = entries
      .slice(0, 6)
      .map(([k, val]) => `${humanizeKey(k)}=${renderValue(val)}`)
      .join(' · ')
    return entries.length > 6 ? `${flat} … (${entries.length})` : flat
  }
  return String(v)
}

/** Photographic values read better with their unit attached. */
function formatPhotoValue(key, value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  if (key === 'ExposureTime') {
    return value >= 1 ? `${+value.toFixed(2)} ثانیه` : `1/${Math.round(1 / value)} ثانیه`
  }
  if (key === 'FNumber' || key === 'MaxApertureValue') return `f/${+value.toFixed(2)}`
  if (key === 'FocalLength' || key === 'FocalLengthIn35mmFormat') return `${+value.toFixed(2)} میلی‌متر`
  if (key === 'GPSAltitude') return `${Math.round(value)} متر`
  if (key === 'GPSHPositioningError') return `${Math.round(value)} متر`
  if (key === 'DigitalZoomRatio') return `${+value.toFixed(2)}×`
  if (key === 'ExposureBiasValue') return `${value > 0 ? '+' : ''}${+value.toFixed(2)} EV`
  return null
}

export function buildMetadataGroups(raw, xmpKeys = new Set()) {
  const buckets = new Map(GROUPS.map((g) => [g.id, []]))
  buckets.set('xmp', [])
  buckets.set('color', [])
  buckets.set('other', [])

  for (const [key, value] of Object.entries(raw)) {
    if (key === 'thumbnail' || key === 'MakerNote' && typeof value === 'object' && !value) continue
    if (value == null) continue
    if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date) && !(value instanceof Uint8Array)) {
      if (!Object.keys(value).length) continue
    }
    const formatted = formatPhotoValue(key, value)
    const row = {
      key,
      label: humanizeKey(key),
      value,
      text: formatted || renderValue(value),
      isDate: isDateValue(value),
    }
    let groupId = KEY_TO_GROUP.get(key)
    if (!groupId) {
      if (xmpKeys.has(key) || XMP_HINTS.test(key)) groupId = 'xmp'
      else if (COLOR_HINTS.test(key)) groupId = 'color'
      else groupId = 'other'
    }
    buckets.get(groupId).push(row)
  }

  const titles = {
    ...Object.fromEntries(GROUPS.map((g) => [g.id, g.title])),
    xmp: 'متادیتای XMP',
    color: 'پروفایل رنگ (ICC)',
    other: 'سایر داده‌ها',
  }

  return Object.keys(titles)
    .map((id) => ({
      id,
      title: titles[id],
      rows: buckets.get(id).sort((a, b) => {
        if (a.isDate && b.isDate) return a.value - b.value
        return a.key.localeCompare(b.key)
      }),
    }))
    .filter((g) => g.rows.length)
}

export function buildTimeline(raw) {
  const events = []
  const push = (key, label, kind) => {
    const v = raw[key]
    if (isDateValue(v)) events.push({ key, label, kind, date: v })
  }
  push('DateTimeOriginal', 'عکس‌برداری', 'capture')
  push('CreateDate', 'ایجاد فایل', 'capture')
  push('DateTimeDigitized', 'دیجیتالی‌شدن', 'capture')
  push('ModifyDate', 'آخرین تغییر', 'edit')
  push('PreviewDateTime', 'زمان پیش‌نمایش', 'edit')
  push('GPSDateStamp', 'ثبت GPS', 'gps')
  return events.sort((a, b) => a.date - b.date)
}
