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
})
