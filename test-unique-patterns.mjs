// Test each pattern to verify they're unique
import { generateRandomDotsWithSolution, COMPLEXITY_LEVELS } from './data/puzzle.js';

console.log('🧪 TESTING PATTERN UNIQUENESS...\n');

// Test first 10 stages
for (let i = 0; i < Math.min(10, COMPLEXITY_LEVELS.length); i++) {
  const level = COMPLEXITY_LEVELS[i];
  console.log(`\n🎯 Stage ${i + 1}: ${level.patternType} (${level.gridSize}x${level.gridSize})`);
  
  try {
    const result = generateRandomDotsWithSolution(level);
    const path = result.fullSolution;
    
    // Show first 10 moves to see if patterns are different
    const first10 = path.slice(0, 10).join(' → ');
    console.log(`   First 10 moves: ${first10}`);
    
    // Check if it's just a basic snake pattern
    let isBasicSnake = true;
    for (let j = 0; j < Math.min(level.gridSize, path.length - 1); j++) {
      const [r1, c1] = path[j].split(',').map(Number);
      const [r2, c2] = path[j + 1].split(',').map(Number);
      
      // Basic snake would have: row 0: (0,0)→(0,1)→(0,2)... row 1: (1,2)→(1,1)→(1,0)...
      const expectedCol = (j % level.gridSize);
      const expectedRow = Math.floor(j / level.gridSize);
      
      if (r1 !== expectedRow || c1 !== expectedCol) {
        isBasicSnake = false;
        break;
      }
    }
    
    console.log(`   Pattern type: ${isBasicSnake ? '❌ BASIC SNAKE' : '✅ UNIQUE PATTERN'}`);
    
    // Show pattern complexity
    let turns = 0;
    for (let j = 1; j < path.length - 1; j++) {
      const [r1, c1] = path[j-1].split(',').map(Number);
      const [r2, c2] = path[j].split(',').map(Number);
      const [r3, c3] = path[j+1].split(',').map(Number);
      
      const dir1 = `${r2-r1},${c2-c1}`;
      const dir2 = `${r3-r2},${c3-c2}`;
      
      if (dir1 !== dir2) turns++;
    }
    
    console.log(`   Direction changes: ${turns}/${path.length-2} (${((turns/(path.length-2))*100).toFixed(1)}%)`);
    
  } catch (error) {
    console.error(`💥 Error testing stage ${i + 1}: ${error.message}`);
  }
}

console.log('\n🔍 If all patterns show "BASIC SNAKE", there\'s a problem with pattern generation!');
