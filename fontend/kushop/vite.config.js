import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backend = env.VITE_PROXY_TARGET || 'http://119.59.102.161:3057'
  const proxy = Object.fromEntries(
    ['/products', '/members', '/carts', '/chat', '/img_pd', '/img_mem'].map((path) => [path, {
      target: path === '/chat' ? (env.VITE_CHAT_PROXY_TARGET || backend) : backend,
      changeOrigin: true,
    }]),
  )

  return {
    plugins: [react()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: { proxy },
  }
})
