import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

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
      '@': path.resolve(__dirname, './src')
    }
  },
  // Ensure assets are properly handled
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: path.resolve(process.cwd(), 'index.html'),
      },
      output: {
        manualChunks: {
          'models': ['./public/models'],
          'sprites': ['./public/sprites']
        }
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
