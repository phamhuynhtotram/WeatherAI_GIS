import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', 
  
  build: {
    assetsInlineLimit: 4096, 
    rollupOptions: {
      external: [/^leaflet\/dist\/images\//],
    },
  },
  
  optimizeDeps: {
    include: ['react-leaflet', 'leaflet'],
    exclude: ['react-leaflet'], 
  },
});