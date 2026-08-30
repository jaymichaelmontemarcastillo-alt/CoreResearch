import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['y-prosemirror', 'yjs', '@tiptap/core', '@tiptap/pm']
  },
  optimizeDeps: {
    include: ['docx']
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          docx: ['docx']
        }
      }
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
