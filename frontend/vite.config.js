import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'esnext',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-core':  ['react', 'react-dom'],
          'recharts':    ['recharts'],
          'pdf-export':  ['jspdf', 'jspdf-autotable', 'html2canvas'],
          'xlsx-export': ['xlsx'],
          'pptx-export': ['pptxgenjs'],
          'icons':       ['lucide-react'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})
