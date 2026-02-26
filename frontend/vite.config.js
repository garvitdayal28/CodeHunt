import fs from 'node:fs'
import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const customKeyFile = env.VITE_SSL_KEY_FILE
  const customCertFile = env.VITE_SSL_CERT_FILE
  const hasCustomCert = Boolean(customKeyFile && customCertFile)

  let httpsConfig = true
  if (hasCustomCert) {
    const keyPath = path.resolve(process.cwd(), customKeyFile)
    const certPath = path.resolve(process.cwd(), customCertFile)
    httpsConfig = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    }
  }

  return {
    plugins: [react(), basicSsl(), tailwindcss()],
    server: {
      host: true,
      port: 5173,
      https: httpsConfig,
    },
  }
})
