import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'fs'
import { join } from 'path'

// Get version from package.json
const pkg = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf-8'));
const APP_VERSION = process.env.VITE_APP_VERSION || pkg.version;

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(APP_VERSION),
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@mui/material') || id.includes('@emotion')) return 'mui-base';
            if (id.includes('@mui/icons-material')) return 'mui-icons';
            if (id.includes('@mui/x-charts')) return 'mui-charts';
            if (id.includes('@fullcalendar')) return 'calendar-vendor';
            if (id.includes('framer-motion')) return 'motion-vendor';
            if (id.includes('@noble') || id.includes('@simplewebauthn')) return 'crypto-vendor';
            if (id.includes('lucide-react')) return 'lucide-vendor';
            return 'vendor';
          }
        }
      }
    }
  }
})
