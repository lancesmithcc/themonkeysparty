import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  // Set base path to root for Netlify deployment
  base: '/',
  resolve: {
    alias: {
      'src': resolve(__dirname, 'src')
    }
  },
  css: {
    postcss: './postcss.config.js'
  },
  // Ensure assets are properly handled
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      }
    },
  },
  server: {
    fs: {
      // Allow serving files from one level up to the project root
      allow: ['..'],
    },
  },
  // Properly handle binary files like GLB models
  assetsInclude: ['**/*.glb', '**/*.png', '**/*.gltf', '**/*.bin', '**/*.jpg', '**/*.jpeg'],
});
