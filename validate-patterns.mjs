// Simple test to validate all patterns are solvable
import { COMPLEXITY_LEVELS, generateRandomDotsWithSolution, validatePathAdjacency } from './data/puzzle.ts';

console.log('🎯 VALIDATING ALL PATTERNS FOR SOLVABILITY...\n');

let allValid = true;

for (let i = 0; i < COMPLEXITY_LEVELS.length; i++) {
  const level = COMPLEXITY_LEVELS[i];
  console.log(`\n🔍 Testing Stage ${i + 1}: ${level.patternType} (${level.gridSize}x${level.gridSize})`);
  
  try {
    const result = generateRandomDotsWithSolution(level);
    const { dots, fullSolution, gridSize } = result;
    
    // Validate completeness
    const expectedCells = gridSize * gridSize;
    const hasAllCells = fullSolution.length === expectedCells;
    const hasUniqueElements = new Set(fullSolution).size === expectedCells;
    
    // Validate adjacency
    const isAdjacent = validatePathAdjacency(fullSolution);
    
    // Validate dot placement
    const validDots = dots.every(dot => {
      const dotCell = `${dot.row},${dot.col}`;
      return fullSolution.includes(dotCell);
    });
    
    const isValid = hasAllCells && hasUniqueElements && isAdjacent && validDots;
    
    if (isValid) {
      console.log(`✅ Stage ${i + 1} VALID - ${level.patternType}`);
      console.log(`   📊 Cells: ${fullSolution.length}/${expectedCells}, Unique: ${new Set(fullSolution).size}, Adjacent: ${isAdjacent}`);
      console.log(`   🎯 Dots: ${dots.length} placed correctly`);
    } else {
      console.error(`❌ Stage ${i + 1} INVALID - ${level.patternType}`);
      console.error(`   📊 Cells: ${fullSolution.length}/${expectedCells}, Unique: ${new Set(fullSolution).size}, Adjacent: ${isAdjacent}`);
      console.error(`   🎯 Dots valid: ${validDots}`);
      allValid = false;
    }
    
  } catch (error) {
    console.error(`💥 Stage ${i + 1} ERROR: ${error.message}`);
    allValid = false;
  }
}

console.log(`\n${allValid ? '🎉 ALL PATTERNS VALID!' : '🚨 SOME PATTERNS NEED FIXING!'}`);
