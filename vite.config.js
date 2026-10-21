import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Security headers for the dev and preview servers.
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
}

// Strict Content Security Policy, added to the built site only.
// (The dev server needs inline scripts for hot reload, so it is skipped there.)
const csp = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data: blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

const injectCsp = () => ({
  name: 'inject-csp',
  apply: 'build',
  transformIndexHtml(html) {
    return html.replace(
      '<head>',
      `<head>\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />`,
    )
  },
})

export default defineConfig({
  plugins: [react(), injectCsp()],
  server: {
    host: '127.0.0.1', // only your own computer can reach it, not your Wi-Fi network
    headers: securityHeaders,
  },
  preview: {
    host: '127.0.0.1',
    headers: securityHeaders,
  },
})