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
        // Clean asset naming with longer cache headers
        assetFileNames: (assetInfo) => {
          // Use different naming for images vs other assets
          const extType = assetInfo.name?.split('.').at(1);
          if (/png|jpe?g|svg|gif|tiff|bmp|ico|webp/i.test(extType || '')) {
            return 'assets/img/[name].[hash][extname]';
          }
          return 'assets/[name].[hash][extname]';
        },
        chunkFileNames: 'assets/js/[name].[hash].js',
        entryFileNames: 'assets/js/[name].[hash].js'
      },
      // Tree shake unused imports
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false
      }
    },
    // Target modern browsers for better performance
    target: 'es2020',
    // Optimize for size and performance
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
        passes: 2,
        unsafe_arrows: true,
        unsafe_methods: true,
        unsafe_proto: true,
        unsafe_regexp: true
      },
      mangle: {
        safari10: true
      },
      format: {
        comments: false
      }
    },
    // Optimize chunk size warnings
    chunkSizeWarningLimit: 1000,
    // Enable source maps for debugging (but exclude from bundle)
    sourcemap: false,
    // Add compression and optimization
    cssCodeSplit: false, // Inline CSS for better performance
    reportCompressedSize: true,
    // Additional optimizations
    assetsInlineLimit: 4096, // Inline assets smaller than 4KB
    emptyOutDir: true
  },
  // Facebook Instant Games CSP requirements
  server: {
    headers: {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://connect.facebook.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:"
    }
  },
  // Ensure assets are properly handled
  assetsInclude: ['**/*.svg', '**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.gif', '**/*.webp'],
  // Performance optimizations
  optimizeDeps: {
    include: ['react', 'react-dom', 'framer-motion', 'lodash']
  }
});
