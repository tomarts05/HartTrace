// Test to see where the 9th dot is currently positioned
// Import the puzzle generation function

import { generateRandomDotsWithSolution, COMPLEXITY_LEVELS } from './data/puzzle.js';

console.log('🔍 Testing 9th dot positioning...\n');

// Test both stages with 9 dots
const stages = [
  { index: 10, name: 'Stage 11 - Labyrinth' },
  { index: 11, name: 'Stage 12 - Master' }
];

stages.forEach(({ index, name }) => {
  console.log(`\n=== ${name} ===`);
  const level = COMPLEXITY_LEVELS[index];
  console.log(`Grid: ${level.gridSize}x${level.gridSize}, Pattern: ${level.patternType}, Dots: ${level.numDots}`);
  
  try {
    const result = generateRandomDotsWithSolution(level);
    const { dots, fullSolution } = result;
    
    console.log('All dots:');
    dots.forEach((dot, i) => {
      console.log(`  Dot ${dot.num}: position (${dot.row},${dot.col})`);
    });
    
    // Find the 9th dot specifically
    const dot9 = dots.find(d => d.num === 9);
    if (dot9) {
      console.log(`\n🎯 DOT 9 CURRENT POSITION: (${dot9.row},${dot9.col})`);
      console.log(`🎯 Moving dot 9 one step upward would place it at: (${dot9.row - 1},${dot9.col})`);
      
      // Check if moving up one step is valid
      if (dot9.row > 0) {
        console.log('✅ Moving upward is valid (within grid bounds)');
        
        // Find this position in the solution path
        const targetCell = `${dot9.row - 1},${dot9.col}`;
        const targetIndex = fullSolution.indexOf(targetCell);
        if (targetIndex !== -1) {
          console.log(`✅ Target position ${targetCell} exists in solution path at index ${targetIndex}`);
        } else {
          console.log(`❌ Target position ${targetCell} NOT found in solution path`);
        }
      } else {
        console.log('❌ Cannot move upward - already at top row');
      }
    } else {
      console.log('❌ No 9th dot found');
    }
    
    // Show first and last few moves of the solution
    console.log(`\nSolution path (first 10): ${fullSolution.slice(0, 10).join(' → ')}`);
    console.log(`Solution path (last 10): ${fullSolution.slice(-10).join(' → ')}`);
    
  } catch (error) {
    console.error(`💥 Error: ${error.message}`);
  }
});