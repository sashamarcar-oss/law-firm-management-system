import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [
    react(), // fastRefresh is AUTOMATIC in Vite 5+
    tsconfigPaths(),
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  server: {
    port: 5173,
    open: true,
    strictPort: true,
    host: true,
    hmr: {
      overlay: true,
      timeout: 10000,
    },
  },

  build: {
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV === 'development',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['lucide-react'],
        },
      },
    },
  },

  css: {
    postcss: './postcss.config.js',
  },

  optimizeDeps: {
    include: [
      'firebase/app',
      'firebase/firestore',
      'framer-motion',
    ],
  },
});