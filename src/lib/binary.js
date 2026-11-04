// Low-level container parsing: JPEG marker walk, PNG chunks, embedded JPEG
// carving, trailing-data detection, quantization tables and string extraction.
// Runs entirely in the browser; nothing leaves the machine.

const MARKER_NAMES = {
  0xd8: 'SOI', 0xd9: 'EOI', 0xda: 'SOS', 0xdb: 'DQT', 0xdd: 'DRI', 0xc4: 'DHT',
  0xcc: 'DAC', 0xc0: 'SOF0', 0xc1: 'SOF1', 0xc2: 'SOF2', 0xc3: 'SOF3',
  0xc5: 'SOF5', 0xc6: 'SOF6', 0xc7: 'SOF7', 0xc9: 'SOF9', 0xca: 'SOF10',
  0xcb: 'SOF11', 0xcd: 'SOF13', 0xce: 'SOF14', 0xcf: 'SOF15',
  0xfe: 'COM', 0x01: 'TEM',
}
for (let i = 0; i <= 15; i++) MARKER_NAMES[0xe0 + i] = `APP${i}`
for (let i = 0; i <= 7; i++) MARKER_NAMES[0xd0 + i] = `RST${i}`

const decoder = new TextDecoder('utf-8', { fatal: false })

export function decodeText(u8) {
  return decoder.decode(u8)
}

function isPrintable(s) {
  if (!s) return false
  let printable = 0
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    if (c === 9 || c === 10 || c === 13 || (c >= 32 && c !== 0x7f)) printable++
  }
  return printable / s.length > 0.85
}

export function sniffFormat(bytes) {
  if (!bytes || bytes.length < 4) return 'unknown'
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'jpeg'
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'png'
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'gif'
  if (bytes[0] === 0x42 && bytes[1] === 0x4d) return 'bmp'
  if (
    bytes.length > 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) return 'webp'
  if (
    bytes.length > 12 &&
    bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70
  ) {
    const brand = decodeText(bytes.subarray(8, 12))
    if (/heic|heix|hevc|hevx|mif1|msf1/i.test(brand)) return 'heic'
    if (/avif|avis/i.test(brand)) return 'avif'
    if (/qt\s\s|isom|mp42/i.test(brand)) return 'video'
  }
  if ((bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 0x2a) ||
      (bytes[0] === 0x4d && bytes[1] === 0x4d && bytes[2] === 0x00)) return 'tiff'
  return 'unknown'
}

export const FORMAT_LABELS = {
  jpeg: 'JPEG', png: 'PNG', gif: 'GIF', bmp: 'BMP', webp: 'WebP',
  heic: 'HEIC', avif: 'AVIF', tiff: 'TIFF', video: 'ویدیو', unknown: 'ناشناخته',
}

function markerLabel(marker) {
  return MARKER_NAMES[marker] || `0x${marker.toString(16).toUpperCase().padStart(2, '0')}`
}

/** Walk a JPEG's marker structure, including entropy-coded scan data. */
export function walkJpeg(bytes) {
  const len = bytes.length
  const segments = []
  if (!(bytes[0] === 0xff && bytes[1] === 0xd8)) {
    return { format: 'jpeg', segments, eoiEnd: 0, trailing: 0 }
  }
  segments.push({ marker: 0xd8, name: 'SOI', offset: 0, length: 2 })
  let pos = 2
  let eoiEnd = 0
  let guard = 0

  while (pos < len - 1 && guard++ < 20000) {
    if (bytes[pos] !== 0xff) { pos++; continue }
    const marker = bytes[pos + 1]
    if (marker === 0xff) { pos++; continue }
    if (marker === 0xd9) {
      segments.push({ marker, name: 'EOI', offset: pos, length: 2 })
      eoiEnd = pos + 2
      break
    }
    if (marker === 0xd8) { pos += 2; continue }
    if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      segments.push({ marker, name: markerLabel(marker), offset: pos, length: 2 })
      pos += 2
      continue
    }
    if (pos + 4 > len) break
    const segLen = (bytes[pos + 2] << 8) | bytes[pos + 3]
    if (segLen < 2 || pos + 2 + segLen > len) break
    const data = bytes.subarray(pos + 4, pos + 2 + segLen)
    const seg = { marker, name: markerLabel(marker), offset: pos, length: segLen + 2, data }

    if (marker === 0xda) {
      let p = pos + 2 + segLen
      const scanStart = p
      while (p < len - 1) {
        if (bytes[p] === 0xff) {
          const next = bytes[p + 1]
          if (next !== 0x00 && next !== 0xff && !(next >= 0xd0 && next <= 0xd7)) break
        }
        p++
      }
      seg.scanLength = p - scanStart
      segments.push(seg)
      pos = p
      continue
    }

    segments.push(seg)
    pos += 2 + segLen
  }

  return {
    format: 'jpeg',
    segments,
    eoiEnd,
    trailing: eoiEnd ? len - eoiEnd : 0,
  }
}

/** PNG chunk walk. */
export function walkPng(bytes) {
  const segments = []
  let pos = 8
  let iendEnd = 0
  let guard = 0
  while (pos + 8 <= bytes.length && guard++ < 5000) {
    const length = (bytes[pos] << 24 | bytes[pos + 1] << 16 | bytes[pos + 2] << 8 | bytes[pos + 3]) >>> 0
    const type = decodeText(bytes.subarray(pos + 4, pos + 8))
    if (length > bytes.length - pos - 12) break
    const data = bytes.subarray(pos + 8, pos + 8 + length)
    segments.push({ name: type, offset: pos, length: length + 12, data, chunk: true })
    pos += length + 12
    if (type === 'IEND') { iendEnd = pos; break }
  }
  return { format: 'png', segments, eoiEnd: iendEnd, trailing: iendEnd ? bytes.length - iendEnd : 0 }
}

/** Read the SOF segment -> real pixel dimensions. */
export function readSof(segments) {
  for (const seg of segments) {
    if (seg.marker >= 0xc0 && seg.marker <= 0xcf &&
        seg.marker !== 0xc4 && seg.marker !== 0xc8 && seg.marker !== 0xcc && seg.data?.length >= 5) {
      return {
        precision: seg.data[0],
        height: (seg.data[1] << 8) | seg.data[2],
        width: (seg.data[3] << 8) | seg.data[4],
        components: seg.data[5],
        progressive: seg.marker === 0xc2,
      }
    }
  }
  return null
}

/** Classify an APPn / COM payload. */
export function classifySegment(seg) {
  if (!seg.data) return null
  const head = decodeText(seg.data.subarray(0, 32))
  if (seg.marker === 0xe1) {
    if (seg.data[0] === 0x45 && seg.data[1] === 0x78 && seg.data[2] === 0x69 && seg.data[3] === 0x66) {
      return { kind: 'exif', label: 'EXIF (Exif\\0\\0)' }
    }
    if (head.startsWith('http://ns.adobe.com/xap/1.0/')) return { kind: 'xmp', label: 'XMP (Adobe XMP Core)' }
    if (head.startsWith('http://ns.adobe.com/xmp/extension/')) return { kind: 'xmp', label: 'XMP (extended packet)' }
    if (head.startsWith('http://ns.adobe.com/photoshop')) return { kind: 'photoshop', label: 'Photoshop IRB' }
    return { kind: 'app1', label: 'APP1 (ناشناخته)' }
  }
  if (seg.marker === 0xe0) return { kind: 'jfif', label: head.startsWith('JFIF') ? 'JFIF' : 'APP0' }
  if (seg.marker === 0xe2) {
    if (head.startsWith('ICC_PROFILE')) return { kind: 'icc', label: 'ICC Profile' }
    if (head.startsWith('MPF')) return { kind: 'mpf', label: 'MPF (چند تصویر)' }
    return { kind: 'app2', label: 'APP2' }
  }
  if (seg.marker === 0xe3) return { kind: 'app3', label: 'APP3 (Meta)' }
  if (seg.marker === 0xed) return { kind: 'iptc', label: 'APP13 (IPTC/Photoshop)' }
  if (seg.marker === 0xee) return { kind: 'adobe', label: 'APP14 (Adobe)' }
  if (seg.marker === 0xfe) return { kind: 'comment', label: 'COM (توضیح)' }
  return null
}

/** Find every complete JPEG stream inside the file (thumbnail, MPF extras...). */
export function carveJpegs(bytes) {
  const found = []
  let i = 2
  while (i < bytes.length - 1) {
    if (bytes[i] === 0xff && bytes[i + 1] === 0xd8) {
      const end = findEoi(bytes, i + 2)
      if (end > 0) {
        found.push({ offset: i, length: end - i, bytes: bytes.subarray(i, end) })
        i = end
        continue
      }
    }
    i++
  }
  return found
}

function findEoi(bytes, start) {
  let p = start
  let guard = 0
  while (p < bytes.length - 1 && guard++ < 20000) {
    if (bytes[p] !== 0xff) { p++; continue }
    const m = bytes[p + 1]
    if (m === 0xff) { p++; continue }
    if (m === 0xd9) return p + 2
    if (m === 0xd8) { p += 2; continue }
    if (m >= 0xd0 && m <= 0xd7) { p += 2; continue }
    if (m === 0xda) {
      p += 2 + (((bytes[p + 2] << 8) | bytes[p + 3]) || 0)
      while (p < bytes.length - 1) {
        if (bytes[p] === 0xff) {
          const n = bytes[p + 1]
          if (n !== 0x00 && n !== 0xff && !(n >= 0xd0 && n <= 0xd7)) break
        }
        p++
      }
      continue
    }
    const l = (bytes[p + 2] << 8) | bytes[p + 3]
    if (!l || l < 2) { p += 2; continue }
    p += 2 + l
  }
  return -1
}

/** Describe whatever sits after the declared end of the image. */
export function describeTrailing(bytes, start) {
  if (!start || start >= bytes.length) return null
  const tail = bytes.subarray(start)
  const head = decodeText(tail.subarray(0, 512))
  let kind = 'binary'
  let label = 'داده ناشناخته'
  if (tail[0] === 0xff && tail[1] === 0xd8) { kind = 'jpeg'; label = 'تصویر JPEG جاسازی‌شده' }
  else if (tail[0] === 0x50 && tail[1] === 0x4b && tail[2] === 0x03 && tail[3] === 0x04) { kind = 'zip'; label = 'آرشیو ZIP' }
  else if (head.startsWith('%PDF')) { kind = 'pdf'; label = 'سند PDF' }
  else if (tail[0] === 0x1f && tail[1] === 0x8b) { kind = 'gzip'; label = 'بسته GZIP' }
  else if (isPrintable(head.slice(0, 200))) { kind = 'text'; label = 'متن' }

  const allZero = tail.every((b) => b === 0)
  if (allZero) { kind = 'padding'; label = 'فضای خالی (صفر)' }

  return {
    kind,
    label,
    offset: start,
    length: tail.length,
    preview: kind === 'text' ? head.slice(0, 400) : null,
    hex: Array.from(tail.subarray(0, 48)).map((b) => b.toString(16).padStart(2, '0')).join(' '),
  }
}

const STD_LUMA = [
  16, 11, 10, 16, 24, 40, 51, 61, 12, 12, 14, 19, 26, 58, 60, 55,
  14, 13, 16, 24, 40, 57, 69, 56, 14, 17, 22, 29, 51, 87, 80, 62,
  18, 22, 37, 56, 68, 109, 103, 77, 24, 35, 55, 64, 81, 104, 113, 92,
  49, 64, 78, 87, 103, 121, 120, 101, 72, 92, 95, 98, 112, 100, 103, 99,
]

function ijgScale(std, quality) {
  const q = Math.min(100, Math.max(1, quality))
  const s = q < 50 ? 5000 / q : 200 - q * 2
  return std.map((v) => Math.min(255, Math.max(1, Math.floor((v * s + 50) / 100))))
}

export function estimateQuality(table) {
  if (!table || table.length < 64) return null
  let best = { quality: null, error: Infinity }
  for (let q = 1; q <= 100; q++) {
    const ref = ijgScale(STD_LUMA, q)
    let err = 0
    for (let i = 0; i < 64; i++) err += Math.abs(ref[i] - table[i])
    if (err < best.error) best = { quality: q, error: err }
  }
  return {
    quality: best.quality,
    error: Math.round(best.error / 64),
    custom: best.error > 900,
  }
}

/** Parse all DQT segments into tables + a rough quality estimate. */
export function readQuantTables(segments) {
  const tables = []
  const dqts = segments.filter((s) => s.marker === 0xdb && s.data)
  for (const seg of dqts) {
    let p = 0
    while (p < seg.data.length) {
      const pqTq = seg.data[p]
      const precision = pqTq >> 4
      const id = pqTq & 0x0f
      const values = []
      const step = precision === 0 ? 1 : 2
      p++
      for (let i = 0; i < 64; i++) {
        const v = precision === 0 ? seg.data[p] : (seg.data[p] << 8) | seg.data[p + 1]
        values.push(v)
        p += step
      }
      if (p > seg.data.length) break
      tables.push({ id, precision, values, quality: estimateQuality(values), offset: seg.offset })
    }
  }
  return { tables, dqtCount: dqts.length }
}

/** Extract printable strings from raw bytes (like the `strings` tool). */
export function extractStrings(bytes, { min = 6, limit = 500 } = {}) {
  const out = []
  const seen = new Set()
  let run = []
  let start = 0
  for (let i = 0; i < bytes.length && out.length < limit; i++) {
    const b = bytes[i]
    if ((b >= 0x20 && b <= 0x7e) || b === 0x09) {
      if (!run.length) start = i
      run.push(b)
    } else {
      if (run.length >= min) {
        const text = decoder.decode(Uint8Array.from(run))
        if (!seen.has(text)) {
          seen.add(text)
          out.push({ offset: start, text })
        }
      }
      run = []
    }
  }
  if (run.length >= min) {
    const text = decoder.decode(Uint8Array.from(run))
    if (!seen.has(text)) out.push({ offset: start, text })
  }
  return out
}
