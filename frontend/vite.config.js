import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'esnext',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: (id) => { if (id.includes("node_modules/react") || id.includes("node_modules/react-dom")) return "react-core"; if (id.includes("node_modules/recharts")) return "recharts"; if (id.includes("node_modules/jspdf") || id.includes("node_modules/jspdf-autotable") || id.includes("node_modules/html2canvas")) return "pdf-export"; if (id.includes("node_modules/xlsx")) return "xlsx-export"; if (id.includes("node_modules/pptxgenjs")) return "pptx-export"; if (id.includes("node_modules/lucide-react")) return "icons"; },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})
