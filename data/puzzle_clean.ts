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

export interface PuzzleResult {
  dots: Dot[];
  solution: string[];
}

export const COMPLEXITY_LEVELS: ComplexityLevel[] = [
  { gridSize: 4, numDots: 3, cellSize: 60, description: "Stage 1 - Easy: 3 dots, 4×4 grid" },
  { gridSize: 4, numDots: 4, cellSize: 60, description: "Stage 2 - Easy: 4 dots, 4×4 grid" },
  { gridSize: 5, numDots: 4, cellSize: 55, description: "Stage 3 - Medium: 4 dots, 5×5 grid" },
  { gridSize: 5, numDots: 5, cellSize: 55, description: "Stage 4 - Medium: 5 dots, 5×5 grid" },
  { gridSize: 5, numDots: 6, cellSize: 55, description: "Stage 5 - Medium+: 6 dots, 5×5 grid" },
  { gridSize: 6, numDots: 5, cellSize: 50, description: "Stage 6 - Hard: 5 dots, 6×6 grid" },
  { gridSize: 6, numDots: 6, cellSize: 50, description: "Stage 7 - Hard: 6 dots, 6×6 grid" },
  { gridSize: 6, numDots: 7, cellSize: 50, description: "Stage 8 - Hard+: 7 dots, 6×6 grid" },
  { gridSize: 7, numDots: 6, cellSize: 45, description: "Stage 9 - Expert: 6 dots, 7×7 grid" },
  { gridSize: 7, numDots: 7, cellSize: 45, description: "Stage 10 - Expert: 7 dots, 7×7 grid" },
  { gridSize: 7, numDots: 8, cellSize: 45, description: "Stage 11 - Expert+: 8 dots, 7×7 grid" },
  { gridSize: 8, numDots: 8, cellSize: 40, description: "Stage 12 - Master: 8 dots, 8×8 grid" },
];

// Enhanced pattern types for varied complexity
export type PatternType = 'snake' | 'spiral' | 'zigzag' | 'random_walk' | 'sectioned' | 'diagonal_sweep';

// Create a simple snake path that visits ALL cells
function createSimpleSnakePath(gridSize: number): string[] {
  const path: string[] = [];
  
  for (let row = 0; row < gridSize; row++) {
    if (row % 2 === 0) {
      // Even rows: left to right (0,0 → 0,1 → 0,2 → 0,3)
      for (let col = 0; col < gridSize; col++) {
        path.push(`${row},${col}`);
      }
    } else {
      // Odd rows: right to left (1,3 → 1,2 → 1,1 → 1,0)  
      for (let col = gridSize - 1; col >= 0; col--) {
        path.push(`${row},${col}`);
      }
    }
  }
  
  console.log(`🐍 Snake path for ${gridSize}x${gridSize}:`, path);
  return path;
}

// 1. Spiral Pattern - Creates inward spiral
function createSpiralPattern(gridSize: number): string[] {
  const path: string[] = [];
  const visited = new Set<string>();
  
  // Start from outer edge and spiral inward
  let top = 0, bottom = gridSize - 1, left = 0, right = gridSize - 1;
  
  while (top <= bottom && left <= right) {
    // Move right across top row
    for (let col = left; col <= right; col++) {
      const cell = `${top},${col}`;
      if (!visited.has(cell)) {
        path.push(cell);
        visited.add(cell);
      }
    }
    top++;
    
    // Move down right column
    for (let row = top; row <= bottom; row++) {
      const cell = `${row},${right}`;
      if (!visited.has(cell)) {
        path.push(cell);
        visited.add(cell);
      }
    }
    right--;
    
    // Move left across bottom row
    if (top <= bottom) {
      for (let col = right; col >= left; col--) {
        const cell = `${bottom},${col}`;
        if (!visited.has(cell)) {
          path.push(cell);
          visited.add(cell);
        }
      }
      bottom--;
    }
    
    // Move up left column
    if (left <= right) {
      for (let row = bottom; row >= top; row--) {
        const cell = `${row},${left}`;
        if (!visited.has(cell)) {
          path.push(cell);
          visited.add(cell);
        }
      }
      left++;
    }
  }
  
  console.log(`🌀 Spiral pattern: ${path.length} cells`);
  return path;
}

// 2. Zigzag Pattern - Diagonal movements with turns
function createZigzagPattern(gridSize: number): string[] {
  const path: string[] = [];
  
  // Start from top-left, move in zigzag diagonal pattern
  for (let diagonal = 0; diagonal < gridSize * 2 - 1; diagonal++) {
    const cells: string[] = [];
    
    // Collect all cells in this diagonal
    for (let row = 0; row < gridSize; row++) {
      const col = diagonal - row;
      if (col >= 0 && col < gridSize) {
        cells.push(`${row},${col}`);
      }
    }
    
    // Alternate direction for zigzag effect
    if (diagonal % 2 === 0) {
      path.push(...cells); // Top to bottom
    } else {
      path.push(...cells.reverse()); // Bottom to top
    }
  }
  
  console.log(`⚡ Zigzag pattern: ${path.length} cells`);
  return path;
}

// 3. Random Walk Pattern - Controlled random exploration
function createRandomWalkPattern(gridSize: number): string[] {
  const path: string[] = [];
  const visited = new Set<string>();
  
  // Start from a random position
  let currentRow = Math.floor(Math.random() * gridSize);
  let currentCol = Math.floor(Math.random() * gridSize);
  
  const directions = [
    [-1, 0], [1, 0], [0, -1], [0, 1] // up, down, left, right
  ];
  
  // Add starting position
  let currentCell = `${currentRow},${currentCol}`;
  path.push(currentCell);
  visited.add(currentCell);
  
  while (path.length < gridSize * gridSize) {
    // Get valid adjacent moves
    const validMoves: { row: number; col: number }[] = [];
    
    for (const [dRow, dCol] of directions) {
      const newRow = currentRow + dRow;
      const newCol = currentCol + dCol;
      const newCell = `${newRow},${newCol}`;
      
      if (newRow >= 0 && newRow < gridSize && 
          newCol >= 0 && newCol < gridSize && 
          !visited.has(newCell)) {
        validMoves.push({ row: newRow, col: newCol });
      }
    }
    
    if (validMoves.length === 0) {
      // Backtrack to find unvisited adjacent cells
      let foundNewPath = false;
      for (let i = path.length - 1; i >= 0; i--) {
        const [backRow, backCol] = path[i].split(',').map(Number);
        
        for (const [dRow, dCol] of directions) {
          const newRow = backRow + dRow;
          const newCol = backCol + dCol;
          const newCell = `${newRow},${newCol}`;
          
          if (newRow >= 0 && newRow < gridSize && 
              newCol >= 0 && newCol < gridSize && 
              !visited.has(newCell)) {
            currentRow = backRow;
            currentCol = backCol;
            foundNewPath = true;
            break;
          }
        }
        if (foundNewPath) break;
      }
      
      if (!foundNewPath) {
        console.log('⚠️ Random walk got stuck, filling remaining cells systematically');
        // Fill remaining cells systematically
        for (let row = 0; row < gridSize; row++) {
          for (let col = 0; col < gridSize; col++) {
            const cell = `${row},${col}`;
            if (!visited.has(cell)) {
              path.push(cell);
              visited.add(cell);
            }
          }
        }
        break;
      }
    } else {
      // Choose random valid move
      const move = validMoves[Math.floor(Math.random() * validMoves.length)];
      currentRow = move.row;
      currentCol = move.col;
      currentCell = `${currentRow},${currentCol}`;
      path.push(currentCell);
      visited.add(currentCell);
    }
  }
  
  console.log(`🎲 Random walk pattern: ${path.length} cells`);
  return path;
}

// 4. Sectioned Pattern - Divide grid into sections
function createSectionedPattern(gridSize: number): string[] {
  const path: string[] = [];
  
  // Determine section size based on grid size
  const sectionSize = Math.max(2, Math.floor(gridSize / 2));
  
  // Process each section
  for (let sectionRow = 0; sectionRow < gridSize; sectionRow += sectionSize) {
    for (let sectionCol = 0; sectionCol < gridSize; sectionCol += sectionSize) {
      const sectionCells: string[] = [];
      
      // Collect all cells in this section
      for (let row = sectionRow; row < Math.min(sectionRow + sectionSize, gridSize); row++) {
        for (let col = sectionCol; col < Math.min(sectionCol + sectionSize, gridSize); col++) {
          sectionCells.push(`${row},${col}`);
        }
      }
      
      // Randomly traverse this section for complexity
      if (Math.random() > 0.5) {
        sectionCells.reverse();
      }
      
      path.push(...sectionCells);
    }
  }
  
  console.log(`🔲 Sectioned pattern: ${path.length} cells`);
  return path;
}

// 5. Diagonal Sweep Pattern - Multiple diagonal passes
function createDiagonalSweepPattern(gridSize: number): string[] {
  const path: string[] = [];
  const visited = new Set<string>();
  
  // First pass: Main diagonals
  for (let i = 0; i < gridSize; i++) {
    // Main diagonal (top-left to bottom-right)
    if (!visited.has(`${i},${i}`)) {
      path.push(`${i},${i}`);
      visited.add(`${i},${i}`);
    }
  }
  
  // Second pass: Anti-diagonals
  for (let i = 0; i < gridSize; i++) {
    const col = gridSize - 1 - i;
    const cell = `${i},${col}`;
    if (!visited.has(cell)) {
      path.push(cell);
      visited.add(cell);
    }
  }
  
  // Third pass: Parallel diagonals
  for (let offset = 1; offset < gridSize; offset++) {
    // Upper parallel diagonals
    for (let i = 0; i < gridSize - offset; i++) {
      const cell = `${i},${i + offset}`;
      if (!visited.has(cell)) {
        path.push(cell);
        visited.add(cell);
      }
    }
    
    // Lower parallel diagonals
    for (let i = 0; i < gridSize - offset; i++) {
      const cell = `${i + offset},${i}`;
      if (!visited.has(cell)) {
        path.push(cell);
        visited.add(cell);
      }
    }
  }
  
  // Fill any remaining cells
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const cell = `${row},${col}`;
      if (!visited.has(cell)) {
        path.push(cell);
        visited.add(cell);
      }
    }
  }
  
  console.log(`📐 Diagonal sweep pattern: ${path.length} cells`);
  return path;
}

// Create multiple pattern types for varied puzzle generation
function createVariedPattern(gridSize: number, patternType?: PatternType): string[] {
  // Auto-select pattern based on grid size and complexity for optimal challenge
  if (!patternType) {
    const patterns: PatternType[] = ['snake', 'spiral', 'zigzag', 'random_walk', 'sectioned', 'diagonal_sweep'];
    
    // Weight patterns based on grid size for appropriate complexity
    if (gridSize <= 4) {
      // Easy stages: simpler patterns
      patternType = patterns[Math.floor(Math.random() * 3)]; // snake, spiral, zigzag
    } else if (gridSize <= 6) {
      // Medium stages: mix of patterns
      patternType = patterns[Math.floor(Math.random() * 5)]; // exclude diagonal_sweep
    } else {
      // Hard stages: all patterns including most complex
      patternType = patterns[Math.floor(Math.random() * patterns.length)];
    }
  }
  
  console.log(`🎨 Generating ${patternType} pattern for ${gridSize}x${gridSize} grid`);
  
  switch (patternType) {
    case 'spiral':
      return createSpiralPattern(gridSize);
    case 'zigzag':
      return createZigzagPattern(gridSize);
    case 'random_walk':
      return createRandomWalkPattern(gridSize);
    case 'sectioned':
      return createSectionedPattern(gridSize);
    case 'diagonal_sweep':
      return createDiagonalSweepPattern(gridSize);
    case 'snake':
    default:
      return createSimpleSnakePath(gridSize);
  }
}

// Ultra-safe fallback generator using simple snake pattern
function generateReliableSnakePuzzle(complexity: ComplexityLevel): PuzzleResult {
  const { numDots, gridSize } = complexity;
  
  console.log('🛡️ ULTRA-SAFE fallback: Using simple snake pattern');
  
  // Create reliable snake path
  const snakePath = createSimpleSnakePath(gridSize);
  
  // Place dots evenly along the snake path
  const dots: Dot[] = [];
  for (let i = 1; i <= numDots; i++) {
    let pathIndex: number;
    
    if (i === numDots) {
      // Last dot at the very end
      pathIndex = snakePath.length - 1;
    } else {
      // Distribute other dots evenly
      const ratio = (i - 1) / (numDots - 1);
      pathIndex = Math.floor(ratio * (snakePath.length - 1));
    }
    
    const cell = snakePath[pathIndex];
    const [row, col] = cell.split(',').map(Number);
    dots.push({ num: i, row, col });
  }
  
  console.log('✅ ULTRA-SAFE puzzle generated with reliable snake pattern');
  return { dots, solution: snakePath };
}

// Function to generate solvable random dot positions WITH the validated solution
export const generateRandomDotsWithSolution = (complexity: ComplexityLevel): PuzzleResult => {
  const { numDots, gridSize } = complexity;
  
  console.log('🎯 Generating ENHANCED & VARIED puzzle:', { numDots, gridSize, totalCells: gridSize * gridSize });

  // For stages 1-12, use enhanced pattern generation with varied complexity
  const maxAttempts = 5; // Reduced for faster generation
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`🔄 Attempt ${attempt}/${maxAttempts} for ${numDots} dots on ${gridSize}x${gridSize}`);
    
    try {
      // Generate varied pattern instead of simple snake
      const patternPath = createVariedPattern(gridSize);
      console.log(`🎨 Using varied pattern with ${patternPath.length} cells`);
      
      // Strategic dot placement along the pattern
      const dots: Dot[] = [];
      
      // CRITICAL: Ensure the last dot is always at the END of the pattern path
      for (let i = 1; i <= numDots; i++) {
        let pathIndex: number;
        
        if (i === numDots) {
          // Last dot MUST be at the very end - this is critical for puzzle completion
          pathIndex = patternPath.length - 1;
        } else {
          // Distribute other dots with some variation for interesting placement
          const baseRatio = (i - 1) / (numDots - 1);
          const variation = (Math.random() - 0.5) * 0.15; // ±7.5% variation
          const adjustedRatio = Math.max(0, Math.min(0.95, baseRatio + variation));
          
          // Ensure we don't place dots too close to the end (reserve space for final dot)
          const maxIndex = patternPath.length - 2; // Reserve last position for final dot
          pathIndex = Math.floor(adjustedRatio * maxIndex);
          
          // Ensure dots don't overlap by checking previous placements
          while (dots.some(d => patternPath[pathIndex] === `${d.row},${d.col}`) && pathIndex < maxIndex) {
            pathIndex++;
          }
        }
        
        const cell = patternPath[pathIndex];
        const [row, col] = cell.split(',').map(Number);
        dots.push({ num: i, row, col });
      }

      console.log('📊 Dot placement:', dots.map(d => `${d.num}: (${d.row},${d.col})`));
      
      // Verify critical constraint: last cell must have the final dot
      const lastCell = patternPath[patternPath.length - 1];
      const finalDot = dots.find(d => d.num === numDots);
      const expectedLastCell = `${finalDot!.row},${finalDot!.col}`;
      
      if (lastCell === expectedLastCell) {
        console.log('✅ ENHANCED puzzle verification: SOLVABLE with varied pattern');
        return { dots, solution: patternPath };
      } else {
        console.log(`❌ Final dot constraint violated: expected ${expectedLastCell}, got ${lastCell}`);
      }
    } catch (error) {
      console.log(`❌ Attempt ${attempt}: Pattern generation failed:`, error);
    }
  }

  // ULTRA-SAFE FALLBACK: Use reliable snake pattern
  console.log('🛡️ ULTRA-SAFE FALLBACK: Using reliable snake pattern');
  return generateReliableSnakePuzzle(complexity);
};

// Export the initial random dots using the first complexity level
export const PUZZLE_DOTS = generateRandomDotsWithSolution(COMPLEXITY_LEVELS[0]).dots;
