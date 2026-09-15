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
  build: {
    // ExcelJS is isolated in a lazy route chunk; allow that known export-only
    // chunk without hiding oversized initial application bundles.
    chunkSizeWarningLimit: 1024,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined

          if (id.includes('/exceljs/')) return 'exceljs'
          if (id.includes('/quill/') || id.includes('/react-quill-new/')) return 'quill'
          if (id.includes('/@mui/x-data-grid/')) return 'mui-data-grid'
          if (id.includes('/@mui/x-date-pickers/')) return 'mui-date-pickers'
          if (id.includes('/@mui/icons-material/')) return 'mui-icons'
          if (id.includes('/@mui/') || id.includes('/@emotion/')) return 'mui-core'
          if (id.includes('/docx/')) return 'docx'
          if (id.includes('/react-router')) return 'router'
          if (id.includes('/@tanstack/')) return 'query'

          return 'vendor'
        },
      },
    },
  },
  server: {
    port: Number(process.env.VITE_PORT) || 3003,
    host: true,
    hmr: {
      overlay: false,
    },
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:5005',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: Number(process.env.VITE_PORT) || 3003,
    host: true,
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:5005',
        changeOrigin: true,
      },
    },
  },
})
