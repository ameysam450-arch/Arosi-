import { decodeText, classifySegment } from './binary'

const XMP_HEADERS = [
  'http://ns.adobe.com/xap/1.0/',
  'http://ns.adobe.com/xmp/extension/',
]

/** Pull every XMP packet out of the container and flatten it. */
export function parseXmpPackets(segments) {
  const packets = []
  for (const seg of segments) {
    const info = classifySegment(seg)
    if (!info || info.kind !== 'xmp' || !seg.data) continue
    const head = decodeText(seg.data.subarray(0, 40))
    const header = XMP_HEADERS.find((h) => head.startsWith(h))
    if (!header) continue
    // Skip the namespace header, its NUL terminator and any padding; a stray
    // NUL makes the XML parser reject the whole packet.
    let start = header.length
    if (header.includes('extension')) start += 40
    while (start < seg.data.length && (seg.data[start] === 0 || seg.data[start] <= 0x20)) start++
    const xml = decodeText(seg.data.subarray(start))
    const clean = xml.replace(/\u0000+$/g, '')
    packets.push({ offset: seg.offset, xml: clean, ...parsePacket(clean) })
  }
  return packets
}

function hasAncestor(el, localName) {
  let node = el.parentElement
  for (let depth = 0; node && depth < 4; depth++) {
    if (new RegExp(localName, 'i').test(node.localName || node.nodeName || '')) return true
    node = node.parentElement
  }
  return false
}

function parsePacket(xml) {
  const fields = []
  const attrs = new Map()
  const history = []
  let doc = null
  try {
    doc = new DOMParser().parseFromString(xml, 'application/xml')
    if (doc.querySelector('parsererror')) doc = null
  } catch {
    doc = null
  }

  if (doc) {
    const all = doc.getElementsByTagName('*')
    for (let i = 0; i < all.length && fields.length < 600; i++) {
      const el = all[i]
      const name = el.localName || el.nodeName
      const prefix = el.prefix || ''
      const key = prefix ? `${prefix}:${name}` : name

      if (!el.children.length) {
        const text = (el.textContent || '').trim()
        if (text) fields.push({ key, value: text })
      }

      // XMP keeps most of its data in namespaced attributes, not element text.
      // History steps are rdf:li items nested inside History > rdf:Seq.
      const inHistory = name === 'li' && (hasAncestor(el, 'History') ||
        [...(el.attributes || [])].some((a) => /^(stEvt:)?(when|softwareAgent|action)$/i.test(a.name)))
      let liEntry = null
      if (inHistory) liEntry = {}
      for (const attr of el.attributes || []) {
        if (/^xmlns(:\w+)?$/.test(attr.name) || attr.name === 'rdf:about') continue
        const attrName = attr.localName || attr.name.replace(/^.*:/, '')
        const value = String(attr.value).trim()
        if (!value) continue
        fields.push({ key: `${key}@${attr.name}`, value })
        if (!attrs.has(attrName)) attrs.set(attrName, value)
        if (liEntry) liEntry[attrName] = value
      }
      if (inHistory) {
        for (const child of el.children) {
          const v = (child.textContent || '').trim()
          if (v) {
            liEntry[child.localName] = v
            if (!attrs.has(child.localName)) attrs.set(child.localName, v)
          }
        }
        if (Object.keys(liEntry).length) history.push(liEntry)
      }
    }
  } else {
    // Regex fallback for malformed packets.
    const re = /<([A-Za-z0-9_]+:[A-Za-z0-9_]+)[^>]*>([^<]{1,300})<\/\1>/g
    let m
    while ((m = re.exec(xml)) && fields.length < 400) {
      const value = m[2].trim()
      if (value) fields.push({ key: m[1], value })
    }
  }

  const get = (name) => attrs.get(name) ?? null

  return {
    fields,
    history,
    creatorTool: get('CreatorTool'),
    metadataDate: get('MetadataDate'),
    modifyDate: get('ModifyDate'),
    createDate: get('CreateDate'),
    documentID: get('DocumentID'),
    instanceID: get('InstanceID'),
    originalDocumentID: get('OriginalDocumentID'),
    derivedFrom: get('DerivedFrom'),
    software: get('Software'),
    credit: get('Credit'),
  }
}

export function xmpSummary(packets) {
  const fields = packets.flatMap((p) => p.fields || [])
  const history = packets.flatMap((p) => p.history || [])
  const uniq = []
  const seen = new Set()
  for (const f of fields) {
    const sig = `${f.key}=${f.value}`
    if (seen.has(sig)) continue
    seen.add(sig)
    uniq.push(f)
  }
  return { fields: uniq, history, count: packets.length }
}
