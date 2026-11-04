# AGENTS.md

## What this is

عکس‌کاو — a **client-side** photo forensics SPA (React 18 + Vite 6, Persian RTL UI).
It reads everything a photo carries: EXIF/IPTC/XMP/ICC, embedded previews, extra
JPEG streams, trailing bytes, raw strings, compression tables, edit traces, messenger
fingerprints and a privacy exposure score.

There is **no backend, no database and no secrets**. Every byte is processed in the
browser; photos are never uploaded anywhere. Do not add a server for image processing.

## Run

```bash
docker compose -f docker-compose.base44.yml up -d --build
```

- One service `web` (`node:22-bookworm`) bind-mounts the repo at `/app`, runs
  `npm install` then `vite --host 0.0.0.0 --port 5173`. Host port **3000** → 5173.
- Healthcheck probes `http://127.0.0.1:5173/` with node's `fetch` (no curl in the image).
- Dependencies live in an anonymous volume (`/app/node_modules`); manifests/lockfile
  are mounted from the repo, so a dependency change needs `up -d --build` again.
- The preview must be served by the **dev server** (live reload). Never point port 3000
  at `vite build`/`preview` output.
- `vite.config.js` appends `.${BASE44_SANDBOX_HOST_DOMAIN}` to `server.allowedHosts`
  **only** when `BASE44_PREVIEW_MODE === '1'` (sandbox host rotation). Unset → untouched.

## Phone install (PWA)

- `public/manifest.webmanifest` + `public/icons/*` make the built app installable
  ("Add to Home Screen"); iOS uses `apple-touch-icon` and the apple meta tags in
  `index.html`.
- `public/sw.js` caches the app shell and same-origin assets, so an installed copy
  works fully offline (the app has no backend). It is registered **only** in a
  production build (`import.meta.env.PROD` in `src/main.jsx`) — never register it in
  dev, it would serve stale modules and break HMR.
- `vite.config.js` uses `base: './'` so a build works from any static host, including
  a sub-path like GitHub Pages `/<repo>/`. Keep asset/manifest/SW references relative.

## Layout

| File | Role |
| --- | --- |
| `src/lib/binary.js` | JPEG marker walk, PNG chunks, embedded-JPEG carving, trailing data, DQT + quality estimate, string extraction |
| `src/lib/metadata.js` | `exifr` wrapper, tag labels/groups, timeline, photographic value formatting |
| `src/lib/xmp.js` | XMP packet extraction, XML flattening, edit-history steps |
| `src/lib/image.js` | ELA, histogram, preview-vs-image pixel comparison (canvas) |
| `src/lib/insights.js` | messenger fingerprint, edit evidence, AI cues, privacy score |
| `src/lib/analyze.js` | orchestrator; produces the analysis object every view consumes |
| `src/lib/report.js`, `reportText.js` | JSON / HTML / plain-text report exports |
| `src/components/*` | one view per tab (Overview, Metadata, Hidden, Edits, Privacy, Report) |

## Non-obvious quirks (learned the hard way)

- An XMP packet payload is `http://ns.adobe.com/xap/1.0/` **plus a NUL byte** before the
  XML. Skip the header *and* the NUL, or `DOMParser` rejects the packet and every XMP
  value silently comes back empty.
- XMP history steps are `rdf:li` inside `History > rdf:Seq`; their data lives in
  **attributes** (`stEvt:when`, `stEvt:softwareAgent`, `stEvt:parameters`), not element
  text. Checking only the direct parent misses them.
- `piexif.dump()` already returns the `Exif\0\0` prefix. Prefixing it again yields a
  file whose EXIF parses into garbage (`XResolution: 1` …) — a very convincing fake bug.
- Embedded-preview carving must scan the whole buffer; a small loop guard stops before
  a real thumbnail (they often sit thousands of bytes in).
- WhatsApp / Instagram / Telegram strip metadata **before delivery**. Once removed it is
  not in the file and is unrecoverable. The Hidden tab states this explicitly — keep
  that honesty in any copy change.
- HEIC/AVIF metadata can be read by `exifr`, but the browser may not decode the pixels;
  ELA/histogram degrade to a friendly error. Never crash on it.

## Verify

No test suite. Verify against the running app in the preview: fetch a fixture, build a
`File`, assign it to the hidden file input and dispatch `change`, then assert the DOM.

Fixtures with EXIF + GPS + IFD1 thumbnail + XMP history can be generated in a throwaway
Python container (`pillow`, `piexif`). Put them in `public/__qa__/` **temporarily** and
delete them before finishing — never commit test photos.

Checklist: device/lens/serial in Metadata · embedded preview + crop note in Hidden ·
XMP history + ELA + quant tables in Edits · coordinates and map in Privacy · export
buttons in Report · zero console errors · no horizontal overflow at 375 px.
