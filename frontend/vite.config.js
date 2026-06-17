import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    target: 'es2018',
    sourcemap: false,
    cssCodeSplit: true,
    chunkSizeWarningLimit: 500,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
      },
      mangle: true,
      format: { comments: false },
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          // PDF/export tools — 566 KB, only load when export pages open
          if (id.includes('jspdf') || id.includes('html2canvas')) return 'pdf-vendor';
          // Charts — only load on pages that render charts
          if (id.includes('recharts') || id.includes('d3-') || id.includes('d3.')) return 'charts-vendor';
          // Animations — ~76 KB, separate chunk for caching
          if (id.includes('framer-motion')) return 'motion-vendor';
          // Icon library — used in Navbar (always), keep stable for caching
          if (id.includes('lucide-react')) return 'icons-vendor';
          // React core — always needed
          if (id.includes('react-dom'))    return 'react-dom-vendor';
          if (id.includes('react-router')) return 'router-vendor';
          // Payment SDKs — only load on billing/payment pages
          if (id.includes('@paypal') || id.includes('@stripe')) return 'payment-vendor';
          // Let Vite auto-split everything else based on actual usage
        },
      }
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api':       { target: 'http://localhost:8000', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:8000', changeOrigin: true, ws: true }
    }
  }
});
