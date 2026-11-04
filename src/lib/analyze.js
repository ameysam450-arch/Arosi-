import {
  sniffFormat, walkJpeg, walkPng, readSof, classifySegment, carveJpegs,
  describeTrailing, readQuantTables, extractStrings, decodeText, FORMAT_LABELS,
} from './binary'
import { parseAllMetadata, buildMetadataGroups, buildTimeline } from './metadata'
import { parseXmpPackets, xmpSummary } from './xmp'
import { detectMessenger, detectEdits, detectAi, privacyScore } from './insights'
import { decodeBitmap, comparePreviewToImage, previewAspectMismatch } from './image'

let counter = 0

function parsePngText(segments) {
  const out = []
  for (const seg of segments) {
    if (!seg.data) continue
    if (seg.name === 'tEXt' || seg.name === 'iTXt' || seg.name === 'zTXt') {
      const raw = decodeText(seg.data)
      const [keyword, ...rest] = raw.split('\u0000')
      const text = rest.join(' ').replace(/[\u0000-\u0008]/g, ' ').trim()
      out.push({ keyword: keyword || '', text, type: seg.name, compressed: seg.name === 'zTXt' })
    } else if (seg.name === 'tIME') {
      out.push({ keyword: 'tIME', text: 'زمان آخرین تغییر فایل PNG', type: seg.name })
    } else if (seg.name === 'eXIf') {
      out.push({ keyword: 'eXIf', text: 'بلوک EXIF درون PNG', type: seg.name })
    }
  }
  return out
}

function summariseSegments(structure) {
  return (structure.segments || []).map((seg) => {
    const info = classifySegment(seg)
    let text = null
    if (info?.kind === 'comment' && seg.data) {
      text = decodeText(seg.data).replace(/\u0000/g, ' ').trim().slice(0, 300)
    }
    if (info?.kind === 'jfif' && seg.data) {
      const major = seg.data[5]
      const minor = seg.data[6]
      text = `JFIF ${major}.${minor}`
    }
    return {
      name: info?.label || seg.name,
      marker: seg.marker,
      offset: seg.offset,
      length: seg.length,
      scanLength: seg.scanLength ?? null,
      kind: info?.kind || (seg.chunk ? 'chunk' : null),
      text,
    }
  })
}

export async function analyzeFile(file) {
  const id = `f${++counter}`
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  const format = sniffFormat(bytes)
  const isJpeg = format === 'jpeg'
  const isPng = format === 'png'

  let structure = { format, segments: [], eoiEnd: 0, trailing: 0 }
  try {
    if (isJpeg) structure = walkJpeg(bytes)
    else if (isPng) structure = walkPng(bytes)
  } catch (err) {
    structure = { format, segments: [], eoiEnd: 0, trailing: 0, error: String(err?.message || err) }
  }

  const raw = await parseAllMetadata(buffer)
  const xmpPackets = parseXmpPackets(structure.segments)
  const xmp = { ...xmpSummary(xmpPackets), packets: xmpPackets }
  const quant = readQuantTables(structure.segments)
  const strings = extractStrings(bytes)
  const pngText = isPng ? parsePngText(structure.segments) : []
  const sof = readSof(structure.segments)

  let embedded = []
  try {
    embedded = carveJpegs(bytes)
      .filter((c) => c.offset > 0 && c.length > 400)
      .slice(0, 6)
      .map((c) => {
        const blob = new Blob([c.bytes], { type: 'image/jpeg' })
        return { offset: c.offset, length: c.length, url: URL.createObjectURL(blob), blob }
      })
  } catch {
    embedded = []
  }

  const trailing = describeTrailing(bytes, structure.eoiEnd)

  const dims = sof?.width
    ? { width: sof.width, height: sof.height, progressive: sof.progressive, components: sof.components }
    : raw.ExifImageWidth
      ? { width: raw.ExifImageWidth, height: raw.ExifImageHeight }
      : null

  // Decode every embedded stream to learn its real size.
  for (const item of embedded) {
    const bmp = await decodeBitmap(item.blob)
    if (bmp) {
      item.width = bmp.width
      item.height = bmp.height
      bmp.close?.()
    }
  }

  const mainPreview = embedded.find((e) => e.length > 1200) || null
  let previewCompare = null
  let aspect = null
  if (mainPreview && (isJpeg || isPng)) {
    previewCompare = await comparePreviewToImage(file, mainPreview.blob)
    const mismatch = previewAspectMismatch(dims, { width: mainPreview.width, height: mainPreview.height })
    if (mismatch) {
      aspect = {
        ...mismatch,
        previewRatio: mainPreview.width / mainPreview.height,
        imageRatio: dims.width / dims.height,
      }
    }
  }

  const hasExif = !!(raw.DateTimeOriginal || raw.Make || raw.Model || raw.ExposureTime) ||
    structure.segments.some((s) => classifySegment(s)?.kind === 'exif')

  const stringsWithHits = strings.map((s) => ({
    ...s,
    kind: /\bhttps?:\/\//i.test(s.text)
      ? 'url'
      : /^[A-Za-z]:\\|^\/[\w.-]+\/|\/(Users|home|storage|sdcard)\//i.test(s.text)
        ? 'path'
        : null,
  }))

  const insights = {
    messenger: detectMessenger({ file, raw, strings: stringsWithHits, dims, format, hasExif }),
    edit: detectEdits({
      raw, xmp, strings: stringsWithHits, dims, previewCompare, aspect, structure, quant,
    }),
    ai: detectAi({ strings: stringsWithHits, raw, xmp, pngText }),
    privacy: privacyScore({ raw, xmp, dims }),
  }

  const xmpKeys = new Set(
    xmp.fields.map((f) => f.key.split('@').pop().split(':').pop()).filter(Boolean),
  )
  const groups = buildMetadataGroups(raw, xmpKeys)
  const timeline = buildTimeline(raw)
  const segments = summariseSegments(structure)

  const comments = segments.filter((s) => s.kind === 'comment' && s.text)
  const duplicateMetadata = segments.filter((s) => s.kind === 'exif' || s.kind === 'xmp')

  let recoveredCount = 0
  recoveredCount += embedded.length
  recoveredCount += xmp.history.length
  recoveredCount += comments.length
  recoveredCount += pngText.length
  recoveredCount += trailing ? 1 : 0
  recoveredCount += stringsWithHits.filter((s) => s.kind).length
  if (duplicateMetadata.length > 1) recoveredCount += duplicateMetadata.length - 1

  const filePreviewUrl = URL.createObjectURL(file)

  return {
    id,
    name: file.name,
    size: file.size,
    mime: file.type,
    lastModified: file.lastModified,
    file,
    filePreviewUrl,
    format,
    formatLabel: FORMAT_LABELS[format] || format,
    structure: { segments: structure.segments.length, eoiEnd: structure.eoiEnd, trailing: structure.trailing },
    segments,
    raw,
    xmp,
    quant,
    strings: stringsWithHits,
    pngText,
    embedded,
    trailing,
    dims,
    sof,
    groups,
    timeline,
    hasExif,
    insights,
    recoveredCount,
    analyzedAt: new Date(),
  }
}
