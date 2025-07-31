#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { gzipSync } from 'zlib';

// Simple build optimization script
const DIST_DIR = 'dist';
const MIN_GZIP_SIZE = 1024; // Only compress files larger than 1KB

function optimizeBuild() {
  if (!existsSync(DIST_DIR)) {
    console.log('❌ Dist directory not found. Run "npm run build" first.');
    return;
  }

  console.log('🚀 Starting build optimization...\n');

  const results = [];
  let totalOriginalSize = 0;
  let totalCompressedSize = 0;

  // Get all files recursively
  const getAllFiles = (dir) => {
    const files = [];
    const items = readdirSync(dir);

    for (const item of items) {
      const fullPath = join(dir, item);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        files.push(...getAllFiles(fullPath));
      } else {
        files.push(fullPath);
      }
    }

    return files;
  };

  const allFiles = getAllFiles(DIST_DIR);
  
  // Process compressible files
  const compressibleExtensions = ['.js', '.css', '.html', '.svg', '.json'];
  
  for (const file of allFiles) {
    const ext = file.toLowerCase().substring(file.lastIndexOf('.'));
    
    if (compressibleExtensions.includes(ext)) {
      const content = readFileSync(file);
      const originalSize = content.length;
      
      if (originalSize > MIN_GZIP_SIZE) {
        const compressed = gzipSync(content);
        const compressedSize = compressed.length;
        const savings = ((originalSize - compressedSize) / originalSize) * 100;
        
        // Write .gz file for server deployment
        writeFileSync(`${file}.gz`, compressed);
        
        results.push({
          file: file.replace(DIST_DIR + '/', ''),
          originalSize,
          compressedSize,
          savings
        });
        
        totalOriginalSize += originalSize;
        totalCompressedSize += compressedSize;
      }
    }
  }

  // Report results
  console.log('📊 Compression Results:');
  console.log('─'.repeat(80));
  
  results
    .sort((a, b) => b.savings - a.savings)
    .forEach(result => {
      const originalKB = (result.originalSize / 1024).toFixed(1);
      const compressedKB = (result.compressedSize / 1024).toFixed(1);
      
      console.log(
        `${result.file.padEnd(40)} ${originalKB.padStart(8)}KB → ${compressedKB.padStart(8)}KB (${result.savings.toFixed(1)}% saved)`
      );
    });
  
  console.log('─'.repeat(80));
  const totalSavings = ((totalOriginalSize - totalCompressedSize) / totalOriginalSize) * 100;
  console.log(
    `Total: ${(totalOriginalSize / 1024).toFixed(1)}KB → ${(totalCompressedSize / 1024).toFixed(1)}KB (${totalSavings.toFixed(1)}% saved)`
  );
  
  // Analyze bundle composition
  console.log('\n📦 Bundle Analysis:');
  const jsFiles = allFiles.filter(f => f.endsWith('.js'));
  const cssFiles = allFiles.filter(f => f.endsWith('.css'));
  const imageFiles = allFiles.filter(f => /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(f));
  
  const getFileSize = (files) => {
    return files.reduce((total, file) => {
      return total + statSync(file).size;
    }, 0);
  };
  
  const jsSize = getFileSize(jsFiles);
  const cssSize = getFileSize(cssFiles);
  const imageSize = getFileSize(imageFiles);
  
  console.log(`JavaScript: ${(jsSize / 1024).toFixed(1)}KB (${jsFiles.length} files)`);
  console.log(`CSS: ${(cssSize / 1024).toFixed(1)}KB (${cssFiles.length} files)`);
  console.log(`Images: ${(imageSize / 1024).toFixed(1)}KB (${imageFiles.length} files)`);
  
  // Performance recommendations
  console.log('\n💡 Performance Recommendations:');
  
  if (jsSize > 200 * 1024) {
    console.log('⚠️  JavaScript bundle is large (>200KB). Consider code splitting.');
  }
  
  if (imageSize > 100 * 1024) {
    console.log('⚠️  Images are taking significant space. Consider WebP conversion.');
  }
  
  const largeFiles = allFiles.filter(f => statSync(f).size > 50 * 1024);
  if (largeFiles.length > 0) {
    console.log('⚠️  Large files detected:');
    largeFiles.forEach(file => {
      const size = (statSync(file).size / 1024).toFixed(1);
      console.log(`   ${file.replace(DIST_DIR + '/', '')}: ${size}KB`);
    });
  }
  
  console.log('\n✅ Build optimization complete!');
  console.log(`📁 Compressed files written to ${DIST_DIR}/ with .gz extension`);
  console.log('📡 Configure your server to serve .gz files with proper headers.');
}

// Run optimization
optimizeBuild();