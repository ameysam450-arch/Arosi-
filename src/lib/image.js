// Pixel-level analysis: ELA, histogram, preview-vs-image comparison.

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image decode failed'))
    img.src = url
  })
}

export async function decodeBitmap(source) {
  if (typeof createImageBitmap !== 'function') return null
  try {
    return await createImageBitmap(source)
  } catch {
    return null
  }
}

function drawScaled(ctx, source, w, h) {
  ctx.drawImage(source, 0, 0, w, h)
}

export async function computeEla(file, { quality = 0.9, gain = 12, maxSide = 1100 } = {}) {
  const bmp = await decodeBitmap(file)
  if (!bmp) throw new Error('این فرمت در مرورگر قابل رمزگشایی نیست')
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height))
  const w = Math.max(1, Math.round(bmp.width * scale))
  const h = Math.max(1, Math.round(bmp.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  drawScaled(ctx, bmp, w, h)
  const original = ctx.getImageData(0, 0, w, h)
  const recompressedUrl = canvas.toDataURL('image/jpeg', quality)
  const img = await loadImage(recompressedUrl)
  ctx.clearRect(0, 0, w, h)
  ctx.drawImage(img, 0, 0, w, h)
  const recompressed = ctx.getImageData(0, 0, w, h)

  const out = ctx.createImageData(w, h)
  let sum = 0
  let max = 0
  let hot = 0
  const histogram = new Array(64).fill(0)

  for (let i = 0; i < original.data.length; i += 4) {
    const dr = Math.abs(original.data[i] - recompressed.data[i])
    const dg = Math.abs(original.data[i + 1] - recompressed.data[i + 1])
    const db = Math.abs(original.data[i + 2] - recompressed.data[i + 2])
    const d = (dr + dg + db) / 3
    sum += d
    if (d > max) max = d
    if (d > 12) hot++
    histogram[Math.min(63, Math.floor(d * 2))]++
    out.data[i] = Math.min(255, dr * gain * 1.7)
    out.data[i + 1] = Math.min(255, dg * gain * 1.7)
    out.data[i + 2] = Math.min(255, db * gain * 1.7)
    out.data[i + 3] = 255
  }
  ctx.putImageData(out, 0, 0)
  const pixels = w * h
  bmp.close?.()

  return {
    dataUrl: canvas.toDataURL('image/png'),
    width: w,
    height: h,
    stats: {
      mean: sum / pixels,
      max,
      hotRatio: hot / pixels,
      uniformity: 1 - Math.min(1, sum / pixels / 12),
    },
    histogram,
  }
}

export async function computeHistogram(file, maxSide = 640) {
  const bmp = await decodeBitmap(file)
  if (!bmp) return null
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height))
  const w = Math.max(1, Math.round(bmp.width * scale))
  const h = Math.max(1, Math.round(bmp.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(bmp, 0, 0, w, h)
  const { data } = ctx.getImageData(0, 0, w, h)
  const r = new Array(256).fill(0)
  const g = new Array(256).fill(0)
  const b = new Array(256).fill(0)
  const lum = new Array(256).fill(0)
  let shadowClip = 0
  let highlightClip = 0
  for (let i = 0; i < data.length; i += 4) {
    r[data[i]]++
    g[data[i + 1]]++
    b[data[i + 2]]++
    const l = Math.round(0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2])
    lum[l]++
    if (l < 3) shadowClip++
    if (l > 252) highlightClip++
  }
  const total = w * h
  bmp.close?.()
  return { r, g, b, lum, total, shadowClip: shadowClip / total, highlightClip: highlightClip / total }
}

/** Downscale any source to a tiny RGBA grid so two images can be compared. */
async function tinyGrid(source, size = 16) {
  const bmp = await decodeBitmap(source)
  if (!bmp) return null
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(bmp, 0, 0, size, size)
  const { data } = ctx.getImageData(0, 0, size, size)
  const w = bmp.width
  const h = bmp.height
  bmp.close?.()
  return { data, width: w, height: h }
}

/** Compare the embedded preview with the current image (detects later edits). */
export async function comparePreviewToImage(file, previewBlob) {
  try {
    const a = await tinyGrid(file)
    const b = await tinyGrid(previewBlob)
    if (!a || !b) return null
    let diff = 0
    for (let i = 0; i < a.data.length; i += 4) {
      diff += Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2])
    }
    const mean = diff / (a.data.length / 4) / 3
    return {
      difference: mean,
      previewDims: { width: b.width, height: b.height },
      imageDims: { width: a.width, height: a.height },
    }
  } catch {
    return null
  }
}

export function previewAspectMismatch(imageDims, previewDims) {
  if (!imageDims?.width || !previewDims?.width) return null
  const a = imageDims.width / imageDims.height
  const b = previewDims.width / previewDims.height
  const delta = Math.abs(a - b) / Math.max(a, b)
  return { delta, cropped: delta > 0.035 }
}
