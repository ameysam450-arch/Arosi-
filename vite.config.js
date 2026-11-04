import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Sandbox preview only: accept the rotating sandbox hostname (HOST gate).
// Gated on BASE44_PREVIEW_MODE === '1'; outside the sandbox nothing is added.
const previewHosts = []
if (process.env.BASE44_PREVIEW_MODE === '1' && process.env.BASE44_SANDBOX_HOST_DOMAIN) {
  previewHosts.push(`.${process.env.BASE44_SANDBOX_HOST_DOMAIN}`)
}

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: previewHosts.length ? previewHosts : undefined,
    watch: { usePolling: true, interval: 400 },
  },
})
