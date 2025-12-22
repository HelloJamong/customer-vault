import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // 루트 디렉토리의 .env 파일을 읽도록 설정
  envDir: path.resolve(__dirname, '..'),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@mui/material/Unstable_Grid2': path.resolve(__dirname, './src/mui-grid2'),
    },
  },
  server: {
    port: Number(process.env.VITE_PORT) || 3003,
    host: true,
    hmr: {
      overlay: false,
    },
  },
  preview: {
    port: Number(process.env.VITE_PORT) || 3003,
    host: true,
  },
})
