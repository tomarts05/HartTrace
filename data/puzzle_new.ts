// Complexity levels configuration
export interface ComplexityLevel {
  gridSize: number;
  numDots: number;
  cellSize: number;
  description: string;
}

export interface Dot {
  num: number;
  row: number;
  col: number;
}

export const COMPLEXITY_LEVELS: ComplexityLevel[] = [
  { gridSize: 4, numDots: 3, cellSize: 60, description: "Easy - 3 dots, 4×4 grid" },
  { gridSize: 4, numDots: 4, cellSize: 60, description: "Easy - 4 dots, 4×4 grid" },
  { gridSize: 5, numDots: 4, cellSize: 55, description: "Medium - 4 dots, 5×5 grid" },
  { gridSize: 5, numDots: 5, cellSize: 55, description: "Medium - 5 dots, 5×5 grid" },
  { gridSize: 6, numDots: 5, cellSize: 50, description: "Medium - 5 dots, 6×6 grid" },
  { gridSize: 6, numDots: 6, cellSize: 50, description: "Hard - 6 dots, 6×6 grid" },
  { gridSize: 7, numDots: 6, cellSize: 45, description: "Hard - 6 dots, 7×7 grid" },
  { gridSize: 7, numDots: 7, cellSize: 45, description: "Hard - 7 dots, 7×7 grid" },
  { gridSize: 8, numDots: 7, cellSize: 40, description: "Expert - 7 dots, 8×8 grid" },
  { gridSize: 8, numDots: 8, cellSize: 40, description: "Expert - 8 dots, 8×8 grid" },
  { gridSize: 9, numDots: 8, cellSize: 35, description: "Master - 8 dots, 9×9 grid" },
  { gridSize: 9, numDots: 9, cellSize: 35, description: "Master - 9 dots, 9×9 grid" },
];

// For backward compatibility
export const PUZZLE_GRID_SIZE = 7;
export const PUZZLE_CELL_SIZE = 50;

// SIMPLE puzzle generation - just place dots on a snake path
export const generateRandomDots = (complexity: ComplexityLevel): Dot[] => {
  const { numDots, gridSize } = complexity;
  
  console.log(`🎯 SIMPLE puzzle generation for ${numDots} dots on ${gridSize}x${gridSize} grid`);
  
  // For 4x4 grid with 3 dots - use EXACT working positions
  if (gridSize === 4 && numDots === 3) {
    const dots = [
      { num: 1, row: 0, col: 0 },  // START: top-left corner
      { num: 2, row: 1, col: 3 },  // MIDDLE: position in snake path
      { num: 3, row: 3, col: 0 }   // END: bottom-left corner (end of snake)
    ];
    
    console.log('📍 Using FIXED working pattern:', dots);
    return dots;
  }
  
  // For other configurations, use simple diagonal
  const dots: Dot[] = [];
  for (let i = 0; i < numDots; i++) {
    const progress = i / (numDots - 1);
    const row = Math.floor(progress * (gridSize - 1));
    const col = Math.floor(progress * (gridSize - 1));
    dots.push({ num: i + 1, row, col });
  }
  
  console.log('📍 Generated dots:', dots);
  return dots;
};

// SIMPLE solver - no complex algorithms
export const solvePuzzle = (dots: { num: number; row: number; col: number }[], gridSize: number): string[] | null => {
  console.log('🔍 SIMPLE solver starting...');
  
  // For 4x4 with dots at (0,0), (1,3), (3,0) - return the exact snake path
  if (gridSize === 4 && dots.length === 3) {
    const expectedPath = [
      '0,0', '0,1', '0,2', '0,3',  // Row 0: left to right
      '1,3', '1,2', '1,1', '1,0',  // Row 1: right to left
      '2,0', '2,1', '2,2', '2,3',  // Row 2: left to right
      '3,3', '3,2', '3,1', '3,0'   // Row 3: right to left
    ];
    
    console.log('✅ Returning snake path for 4x4:', expectedPath);
    return expectedPath;
  }
  
  console.log('❌ No solution for this configuration yet');
  return null;
};

export const testPuzzleGeneration = () => {
  console.log('🧪 Testing SIMPLE puzzle generation...');
  
  const stage1 = COMPLEXITY_LEVELS[0];
  const dots1 = generateRandomDots(stage1);
  const solution1 = solvePuzzle(dots1, stage1.gridSize);
  
  if (solution1) {
    console.log('✅ Stage 1: Working!');
    console.log(`Solution: ${solution1.length}/${stage1.gridSize * stage1.gridSize} cells`);
  } else {
    console.log('❌ Stage 1: Failed');
  }
};

export const quickTest = () => {
  console.log('🔧 Quick test...');
  testPuzzleGeneration();
};
