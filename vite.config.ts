import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  },
  build: {
    // Facebook Instant Games optimization
    rollupOptions: {
      output: {
        // Inline assets for FB Instant Games
        inlineDynamicImports: true,
        manualChunks: undefined,
        // Clean asset naming
        assetFileNames: 'assets/[name].[hash].[ext]',
        chunkFileNames: 'assets/[name].[hash].js',
        entryFileNames: 'assets/[name].[hash].js'
      }
    },
    // Target modern browsers for better performance
    target: 'es2015',
    // Optimize for size
    minify: 'terser'
  },
  // Facebook Instant Games CSP requirements
  server: {
    headers: {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://connect.facebook.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:"
    }
  },
  // Ensure assets are properly handled
  assetsInclude: ['**/*.svg', '**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.gif']
});
