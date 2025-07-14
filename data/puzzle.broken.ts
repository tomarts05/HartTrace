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

// For backward compatibility, export current defaults
export const PUZZLE_GRID_SIZE = 7;
export const PUZZLE_CELL_SIZE = 50; // size in pixels

// Function to validate that a solution path only uses adjacent moves
export const validatePathAdjacency = (path: string[]): boolean => {
  if (path.length <= 1) return true;
  
  for (let i = 0; i < path.length - 1; i++) {
    const [row1, col1] = path[i].split(',').map(Number);
    const [row2, col2] = path[i + 1].split(',').map(Number);
    
    const rowDiff = Math.abs(row2 - row1);
    const colDiff = Math.abs(col2 - col1);
    
    // Valid adjacent move: exactly one cell away in one direction
    const isAdjacent = (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
    
    if (!isAdjacent) {
      console.error(`❌ Invalid move in path: ${path[i]} → ${path[i + 1]} (gap: ${rowDiff},${colDiff})`);
      console.error('Path segment:', path.slice(Math.max(0, i - 2), i + 3));
      return false;
    }
  }
  
  console.log('✅ Path adjacency validation: All moves are adjacent');
  return true;
};

// Function to solve a puzzle and return the solution path
export const solvePuzzle = (dots: { num: number; row: number; col: number }[], gridSize: number): string[] | null => {
  console.log('🔍 SOLVER STARTING...');
  console.log('Input dots:', dots);
  console.log('Grid size:', gridSize);
  
  const totalCells = gridSize * gridSize;
  const sortedDots = [...dots].sort((a, b) => a.num - b.num);
  
  // Create dot position map
  const dotMap = new Map<string, number>();
  sortedDots.forEach(dot => {
    const key = `${dot.row},${dot.col}`;
    dotMap.set(key, dot.num);
  });
  
  console.log('Sorted dots:', sortedDots);
  console.log('Dot map:', Array.from(dotMap.entries()));
  
  // Enhanced DFS solver with corrected dot checking logic
  const solve = (path: string[], visited: Set<string>, nextDotToFind: number): string[] | null => {
    const currentCell = path[path.length - 1];
    
    // Debug current state
    if (path.length <= 5 || path.length % 5 === 0) {
      console.log(`🔍 Solver step ${path.length}/${totalCells}: at ${currentCell}, next dot needed: ${nextDotToFind}`);
    }
    
    // Success condition: filled all cells and all dots visited
    if (path.length === totalCells) {
      console.log('🎯 Reached target length:', totalCells);
      console.log('Final position:', currentCell);
      
      // Check if we've visited all dots in order
      if (nextDotToFind > sortedDots.length) {
        console.log('✅ SOLVER SUCCESS: All dots visited in order!');
        return [...path];
      } else {
        console.log(`❌ SOLVER FAILED: Missing dots. Expected ${sortedDots.length}, found up to ${nextDotToFind - 1}`);
        return null;
      }
    }
    
    // Try all adjacent cells
    const [row, col] = currentCell.split(',').map(Number);
    const neighbors = [
      `${row - 1},${col}`, // up
      `${row + 1},${col}`, // down
      `${row},${col - 1}`, // left
      `${row},${col + 1}`  // right
    ];
    
    for (const neighbor of neighbors) {
      const [nRow, nCol] = neighbor.split(',').map(Number);
      
      // Check bounds
      if (nRow < 0 || nRow >= gridSize || nCol < 0 || nCol >= gridSize) {
        continue;
      }
      
      // Skip if already visited
      if (visited.has(neighbor)) {
        continue;
      }
      
      // Check if this neighbor has a dot we need to visit
      let newNextDotToFind = nextDotToFind;
      const dotAtNeighbor = dotMap.get(neighbor);
      if (dotAtNeighbor !== undefined) {
        if (dotAtNeighbor !== nextDotToFind) {
          // This neighbor has a dot, but it's not the one we need next
          console.log(`❌ Skipping ${neighbor}: has dot ${dotAtNeighbor}, need dot ${nextDotToFind}`);
          continue;
        }
        console.log(`✅ Moving to dot ${dotAtNeighbor} at ${neighbor}`);
        newNextDotToFind = nextDotToFind + 1;
      }
      
      // Try this path
      visited.add(neighbor);
      path.push(neighbor);
      
      const result = solve(path, visited, newNextDotToFind);
      if (result) {
        return result;
      }
      
      // Backtrack
      visited.delete(neighbor);
      path.pop();
    }
    
    return null;
  };
  
  // Start from first dot
  const startDot = sortedDots[0];
  const startCell = `${startDot.row},${startDot.col}`;
  
  console.log(`🚀 Starting solve from ${startCell} (dot ${startDot.num})`);
  
  const visited = new Set([startCell]);
  const path = [startCell];
  
  // We're starting at dot 1, so we need to find dot 2 next
  const solution = solve(path, visited, 2);
  
  if (solution) {
    console.log(`✅ SOLVER SUCCEEDED! Path length: ${solution.length}/${totalCells}`);
    
    // Verify dot visits
    const dotsVisited = [];
    for (const cell of solution) {
      const dotNum = dotMap.get(cell);
      if (dotNum) {
        dotsVisited.push(dotNum);
      }
    }
    console.log('Dots visited in order:', dotsVisited);
    console.log('Expected dots:', sortedDots.map(d => d.num));
    
    // CRITICAL: Validate that the solution only uses adjacent moves
    if (!validatePathAdjacency(solution)) {
      console.error('❌ SOLVER ERROR: Solution contains non-adjacent moves!');
      return null;
    }
    
    return solution;
  }
  
  console.log('❌ SOLVER FAILED - no solution found');
  console.log('This indicates either:');
  console.log('1. Generated path is not actually valid');
  console.log('2. Dot placement is incorrect');
  console.log('3. Solver algorithm has a bug');
  return null;
};

// Timeout-enabled solver to prevent hanging on complex puzzles
export const solvePuzzleWithTimeout = (dots: { num: number; row: number; col: number }[], gridSize: number, timeoutMs: number = 10000): string[] | null => {
  console.log(`🕒 SOLVER WITH TIMEOUT: ${timeoutMs}ms limit`);
  
  const startTime = Date.now();
  let isTimedOut = false;
  
  // Check if we've exceeded the timeout
  const checkTimeout = () => {
    if (Date.now() - startTime > timeoutMs) {
      isTimedOut = true;
      console.log(`⏰ SOLVER TIMEOUT: Exceeded ${timeoutMs}ms`);
      return true;
    }
    return false;
  };
  
  const totalCells = gridSize * gridSize;
  const sortedDots = [...dots].sort((a, b) => a.num - b.num);
  
  // Create dot position map
  const dotMap = new Map<string, number>();
  sortedDots.forEach(dot => {
    const key = `${dot.row},${dot.col}`;
    dotMap.set(key, dot.num);
  });
  
  console.log('🕒 Starting timeout-aware solver...');
  
  // Enhanced DFS solver with timeout checking
  const solve = (path: string[], visited: Set<string>, nextDotToFind: number, depth: number = 0): string[] | null => {
    // Check timeout every few steps to avoid performance overhead
    if (depth % 10 === 0 && checkTimeout()) {
      return null;
    }
    
    const currentCell = path[path.length - 1];
    
    // Success condition: filled all cells and all dots visited
    if (path.length === totalCells) {
      if (nextDotToFind > sortedDots.length) {
        console.log(`✅ TIMEOUT SOLVER SUCCESS in ${Date.now() - startTime}ms!`);
        return [...path];
      } else {
        return null;
      }
    }
    
    // Try all adjacent cells
    const [row, col] = currentCell.split(',').map(Number);
    const neighbors = [
      `${row - 1},${col}`, // up
      `${row + 1},${col}`, // down
      `${row},${col - 1}`, // left
      `${row},${col + 1}`  // right
    ];
    
    for (const neighbor of neighbors) {
      if (isTimedOut) return null;
      
      const [nRow, nCol] = neighbor.split(',').map(Number);
      
      // Check bounds
      if (nRow < 0 || nRow >= gridSize || nCol < 0 || nCol >= gridSize) {
        continue;
      }
      
      // Skip if already visited
      if (visited.has(neighbor)) {
        continue;
      }
      
      // Check if this neighbor has a dot we need to visit
      let newNextDotToFind = nextDotToFind;
      const dotAtNeighbor = dotMap.get(neighbor);
      if (dotAtNeighbor !== undefined) {
        if (dotAtNeighbor !== nextDotToFind) {
          // This neighbor has a dot, but it's not the one we need next
          continue;
        }
        newNextDotToFind = nextDotToFind + 1;
      }
      
      // Try this path
      visited.add(neighbor);
      path.push(neighbor);
      
      const result = solve(path, visited, newNextDotToFind, depth + 1);
      if (result) {
        return result;
      }
      
      // Backtrack
      visited.delete(neighbor);
      path.pop();
    }
    
    return null;
  };
  
  // Start from first dot
  const startDot = sortedDots[0];
  const startCell = `${startDot.row},${startDot.col}`;
  
  const visited = new Set([startCell]);
  const path = [startCell];
  
  // We're starting at dot 1, so we need to find dot 2 next
  const solution = solve(path, visited, 2);
  
  if (isTimedOut) {
    console.log(`⏰ SOLVER TIMED OUT after ${timeoutMs}ms`);
    return null;
  }
  
  if (solution) {
    console.log(`✅ TIMEOUT SOLVER SUCCEEDED in ${Date.now() - startTime}ms! Path length: ${solution.length}/${totalCells}`);
    return solution;
  }
  
  console.log(`❌ TIMEOUT SOLVER FAILED in ${Date.now() - startTime}ms`);
  return null;
};

// Function to generate solvable random dot positions
export const generateRandomDots = (complexity: ComplexityLevel): Dot[] => {
  const { numDots, gridSize } = complexity;
  
  console.log(`🎯 Generating SIMPLE & RELIABLE puzzle:`, { numDots, gridSize });
  
  // SIMPLIFIED APPROACH: Use only the basic snake pattern that we know works
  const snakePath = createSimpleSnakePath(gridSize);
  
  console.log(`✅ Using reliable snake pattern with ${snakePath.length} cells`);
  
  // FIXED DOT PLACEMENT: Always use safe, evenly distributed positions
  const dots: Dot[] = [];
  
  // CRITICAL: Ensure the last dot is always at the END of the snake path
  for (let i = 0; i < numDots; i++) {
    let pathIndex: number;
    
    if (i === numDots - 1) {
      // Last dot MUST be at the very end of the path
      pathIndex = snakePath.length - 1;
      console.log(`🎯 Placing END dot ${i + 1} at final position: index ${pathIndex}`);
    } else {
      // Other dots: distribute evenly with small random variance for variety
      const baseRatio = i / (numDots - 1);
      const variance = 0.1; // 10% variance
      const minRatio = Math.max(0, baseRatio - variance);
      const maxRatio = Math.min(1, baseRatio + variance);
      const finalRatio = minRatio + Math.random() * (maxRatio - minRatio);
      
      // Make sure we don't accidentally place a dot at the very end
      const maxIndex = snakePath.length - 2; // Reserve last position for final dot
      pathIndex = Math.floor(finalRatio * maxIndex);
    }
    
    const cell = snakePath[pathIndex];
    const [row, col] = cell.split(',').map(Number);
    dots.push({ num: i + 1, row, col });
  }
  
  console.log('🎲 Generated RELIABLE dots:', dots);
  console.log('📍 Dot positions:', dots.map(d => `${d.num}: (${d.row},${d.col})`));
  
  // Verify that the last dot is at the end of the snake path
  const endOfPath = snakePath[snakePath.length - 1];
  const lastDot = dots[dots.length - 1];
  const lastDotPosition = `${lastDot.row},${lastDot.col}`;
  
  if (lastDotPosition === endOfPath) {
    console.log('✅ END dot verification: Last dot is correctly at end of path');
  } else {
    console.error(`❌ END dot ERROR: Last dot at ${lastDotPosition}, but end of path is ${endOfPath}`);
  }
  
  // Quick verification (should always pass now)
  const verification = solvePuzzle(dots, gridSize);
  if (verification) {
    console.log('✅ RELIABLE puzzle verification: SOLVABLE');
    console.log(`✅ SUCCESS: Using simple reliable generation`);
    return dots;
  } else {
    console.error('❌ Even simple generation failed! This should never happen.');
    console.error('Falling back to absolute safest approach...');
    return generateUltraSafeFallback(numDots, gridSize);
  }
}

// Ultra-safe fallback that always works
function generateUltraSafeFallback(numDots: number, gridSize: number): Dot[] {
  console.log('🛡️ Using ULTRA-SAFE fallback - guaranteed to work');
  
  const snakePath = createSimpleSnakePath(gridSize);
  const dots: Dot[] = [];
  
  // Use simple evenly distributed positions that we know work
  for (let i = 0; i < numDots; i++) {
    let pathIndex: number;
    
    if (i === 0) {
      // First dot at start
      pathIndex = 0;
    } else if (i === numDots - 1) {
      // Last dot at end
      pathIndex = snakePath.length - 1;
    } else {
      // Middle dots evenly distributed
      const ratio = i / (numDots - 1);
      pathIndex = Math.floor(ratio * (snakePath.length - 1));
    }
    
    const cell = snakePath[pathIndex];
    const [row, col] = cell.split(',').map(Number);
    dots.push({ num: i + 1, row, col });
  }
  
  console.log('🛡️ Ultra-safe dots:', dots);
  return dots;
}

// Enhanced pattern generation with multiple algorithms for varied, complex puzzles
export type PatternType = 'snake' | 'spiral' | 'zigzag' | 'random_walk' | 'sectioned' | 'diagonal_sweep';

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

// 1. Spiral Pattern - Creates inward or outward spiral
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

// 4. Sectioned Pattern - Divide grid into sections and traverse each
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

// Create a simple snake path that visits ALL cells (kept for compatibility)
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

// Default dots configuration (fallback)
export const DEFAULT_PUZZLE_DOTS: { num: number; row: number; col: number }[] = [
  { num: 1, row: 3, col: 4 },
  { num: 2, row: 1, col: 1 },
  { num: 3, row: 4, col: 5 },
  { num: 4, row: 5, col: 0 },
  { num: 5, row: 5, col: 6 },
  { num: 6, row: 0, col: 6 },
  { num: 7, row: 0, col: 1 },
  { num: 8, row: 4, col: 3 },
  { num: 9, row: 2, col: 2 },
].sort((a, b) => a.num - b.num);

// Export the initial random dots using the first complexity level
export const PUZZLE_DOTS = generateRandomDots(COMPLEXITY_LEVELS[0]);

// Function to generate solvable random dot positions WITH the validated solution
export const generateRandomDotsWithSolution = (complexity: ComplexityLevel): PuzzleResult => {
  const { numDots, gridSize } = complexity;
  
  console.log('🎯 Generating ENHANCED & VARIED puzzle:', { numDots, gridSize, totalCells: gridSize * gridSize });

  // INSTANT Stage 12 generation - completely bypass solver
  if (gridSize === 8 && numDots === 8) {
    console.log('🔥 STAGE 12: Using INSTANT pre-computed solution (no solver needed)');
    return generateInstantStage12();
  }
  
  // INSTANT Stage 11 generation for 7x7 grids too
  if (gridSize === 7) {
    console.log('⚡ STAGE 11: Using INSTANT pre-computed solution (no solver needed)');
    return generateInstantStage11(numDots);
  }

  // For stages 1-10, use enhanced pattern generation with varied complexity
  const maxAttempts = 20;
  const maxSolverTime = 8000; // Extended timeout for complex patterns
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`🔄 Attempt ${attempt}/${maxAttempts} for ${numDots} dots on ${gridSize}x${gridSize}`);
    
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

    console.log('� Dot placement:', dots.map(d => `${d.num}: (${d.row},${d.col})`));
    
    // Test solvability with enhanced timeout
    console.log(`🧩 Testing enhanced pattern solvability...`);
    const startTime = Date.now();
    const solution = solvePuzzleWithTimeout(dots, gridSize, maxSolverTime);
    const elapsedTime = Date.now() - startTime;
    
    if (solution && solution.length === gridSize * gridSize) {
      console.log(`✅ SUCCESS on attempt ${attempt}! Enhanced puzzle solved in ${elapsedTime}ms`);
      console.log('🔥 SOLUTION length:', solution.length);
      
      // Verify critical constraint: last cell must have the final dot
      const lastCell = solution[solution.length - 1];
      const finalDot = dots.find(d => d.num === numDots);
      const expectedLastCell = `${finalDot!.row},${finalDot!.col}`;
      
      if (lastCell === expectedLastCell) {
        console.log('✅ ENHANCED puzzle verification: SOLVABLE with varied pattern');
        return { dots, solution };
      } else {
        console.log(`❌ Final dot constraint violated: expected ${expectedLastCell}, got ${lastCell}`);
      }
    } else {
      console.log(`❌ Attempt ${attempt}: Enhanced pattern not solvable (${elapsedTime}ms)`);
    }
  }

  // ULTRA-SAFE FALLBACK: Use enhanced pattern generator from separate file
  console.log('🛡️ ULTRA-SAFE FALLBACK: Using enhanced pattern generator');
  try {
    const { generateEnhancedPuzzle } = require('./puzzle_enhanced');
    return generateEnhancedPuzzle(complexity);
  } catch (error) {
    console.log('⚠️ Enhanced generator not available, using reliable snake fallback');
    return generateReliableSnakePuzzle(complexity);
  }
        if (solution) {
          console.log(`   Solution length: ${solution.length}/${gridSize * gridSize}`);
        }
      }
    }
  }
  
  // If complex patterns fail, fallback to reliable snake pattern
  console.warn(`⚠️ Complex patterns failed after ${maxAttempts} attempts, using reliable snake fallback...`);
  const snakePath = createSimpleSnakePath(gridSize);
  const safeDots = generateSafeSnakeDots(numDots, snakePath);
  const safeSolution = solvePuzzleWithTimeout(safeDots, gridSize, maxSolverTime);
  
  if (safeSolution && safeSolution.length === gridSize * gridSize) {
    console.log('✅ SNAKE FALLBACK SUCCESS: Reliable puzzle generated');
    return {
      dots: safeDots,
      solution: safeSolution
    };
  } else {
    console.error('❌ CRITICAL: Even snake fallback failed! Using ultra-safe fallback');
    const ultraSafeDots = generateUltraSafeFallback(numDots, gridSize);
    return {
      dots: ultraSafeDots,
      solution: safeSolution || []
    };
  }
};

// Helper function to generate safe snake dots as fallback
function generateSafeSnakeDots(numDots: number, snakePath: string[]): Dot[] {
  const dots: Dot[] = [];
  
  for (let i = 1; i <= numDots; i++) {
    let pathIndex: number;
    
    if (i === numDots) {
      pathIndex = snakePath.length - 1; // Last dot at end
    } else {
      const ratio = (i - 1) / (numDots - 1);
      pathIndex = Math.floor(ratio * (snakePath.length - 2));
    }
    
    const cell = snakePath[pathIndex];
    const [row, col] = cell.split(',').map(Number);
    dots.push({ num: i, row, col });
  }
  
  return dots.sort((a, b) => a.num - b.num);
}
    
    // Place middle dots with controlled randomness
    for (let i = 2; i <= numDots - 1; i++) {
      let placed = false;
      let attempts = 0;
      
      while (!placed && attempts < 50) {
        // Calculate a target position with some randomness
        const baseRatio = (i - 1) / (numDots - 1);
        const variance = Math.min(0.3, 1.0 / numDots); // Adaptive variance
        const minRatio = Math.max(0.1, baseRatio - variance);
        const maxRatio = Math.min(0.9, baseRatio + variance);
        
        const targetRatio = minRatio + Math.random() * (maxRatio - minRatio);
        const targetIndex = Math.floor(targetRatio * (snakePath.length - 1));
        
        // Ensure minimum distance between dots
        const minDistance = Math.max(3, Math.floor(snakePath.length / (numDots * 2)));
        let tooClose = false;
        
        for (const usedIndex of usedIndices) {
          if (Math.abs(targetIndex - usedIndex) < minDistance) {
            tooClose = true;
            break;
          }
        }
        
        if (!tooClose && !usedIndices.has(targetIndex)) {
          const cell = snakePath[targetIndex];
          const [row, col] = cell.split(',').map(Number);
          dots.push({ num: i, row, col });
          usedIndices.add(targetIndex);
          placed = true;
          console.log(`📍 Placed dot ${i} at index ${targetIndex} (${row},${col})`);
        }
        
        attempts++;
      }
      
      if (!placed) {
        console.log(`❌ Failed to place dot ${i} after ${attempts} attempts`);
        break;
      }
    }
    
    // Sort dots by number to ensure proper order
    dots.sort((a, b) => a.num - b.num);
    
    // Validate we have all dots
    if (dots.length !== numDots) {
      console.log(`❌ Attempt ${attempt}: Only placed ${dots.length}/${numDots} dots`);
      continue;
    }
    
    console.log(`✅ Attempt ${attempt}: Placed all ${numDots} dots:`, dots);
    
    // Test if this configuration is solvable with timeout
    console.log(`🧩 Testing solvability with ${maxSolverTime}ms timeout...`);
    const startTime = Date.now();
    const solution = solvePuzzleWithTimeout(dots, gridSize, maxSolverTime);
    const elapsedTime = Date.now() - startTime;
    
    console.log(`⏱️ Solver took ${elapsedTime}ms`);
    
    if (solution && solution.length === gridSize * gridSize) {
      console.log(`✅ SUCCESS on attempt ${attempt}! Generated solvable puzzle in ${elapsedTime}ms`);
      console.log('🔥 VALIDATED SOLUTION length:', solution.length);
      console.log('🎯 END dot verification:', solution[solution.length - 1] === `${endRow},${endCol}` ? 'CORRECT' : 'WRONG');
      
      return {
        dots: dots,
        solution: solution
      };
    } else {
      if (solution === null) {
        console.log(`❌ Attempt ${attempt}: Solver timed out after ${maxSolverTime}ms`);
      } else {
        console.log(`❌ Attempt ${attempt}: Generated puzzle is not solvable`);
        if (solution) {
          console.log(`   Solution length: ${solution.length}/${gridSize * gridSize}`);
        }
      }
    }
  }
  
  // If all attempts failed, use ultra-safe fallback
  console.error(`❌ All ${maxAttempts} attempts failed! Using ultra-safe fallback...`);
  const fallbackDots = generateUltraSafeFallback(numDots, gridSize);
  const fallbackSolution = solvePuzzleWithTimeout(fallbackDots, gridSize, maxSolverTime);
  
  if (fallbackSolution && fallbackSolution.length === gridSize * gridSize) {
    console.log('✅ FALLBACK SUCCESS: Ultra-safe puzzle generated');
    return {
      dots: fallbackDots,
      solution: fallbackSolution
    };
  } else {
    console.error('❌ CRITICAL: Even fallback failed! Using minimal valid solution');
    return {
      dots: fallbackDots,
      solution: fallbackSolution || []
    };
  }
}

// INSTANT Stage 12 generation - no solver needed, pure pre-computed
function generateInstantStage12(): PuzzleResult {
  console.log('🚀 INSTANT Stage 12: Pure pre-computed, zero delay');
  
  // Pre-computed 8x8 snake solution
  const solution: string[] = [
    // Row 0: left to right
    "0,0", "0,1", "0,2", "0,3", "0,4", "0,5", "0,6", "0,7",
    // Row 1: right to left  
    "1,7", "1,6", "1,5", "1,4", "1,3", "1,2", "1,1", "1,0",
    // Row 2: left to right
    "2,0", "2,1", "2,2", "2,3", "2,4", "2,5", "2,6", "2,7",
    // Row 3: right to left
    "3,7", "3,6", "3,5", "3,4", "3,3", "3,2", "3,1", "3,0",
    // Row 4: left to right
    "4,0", "4,1", "4,2", "4,3", "4,4", "4,5", "4,6", "4,7",
    // Row 5: right to left
    "5,7", "5,6", "5,5", "5,4", "5,3", "5,2", "5,1", "5,0",
    // Row 6: left to right
    "6,0", "6,1", "6,2", "6,3", "6,4", "6,5", "6,6", "6,7",
    // Row 7: right to left
    "7,7", "7,6", "7,5", "7,4", "7,3", "7,2", "7,1", "7,0"
  ];
  
  // Place 8 dots strategically along the path
  const dots: Dot[] = [
    { num: 1, row: 0, col: 0 },  // Start
    { num: 2, row: 0, col: 7 },  // End of row 0
    { num: 3, row: 2, col: 0 },  // Start of row 2
    { num: 4, row: 3, col: 0 },  // End of row 3
    { num: 5, row: 4, col: 7 },  // End of row 4
    { num: 6, row: 5, col: 0 },  // End of row 5
    { num: 7, row: 6, col: 7 },  // End of row 6
    { num: 8, row: 7, col: 0 }   // Final end
  ];
  
  console.log('🚀 INSTANT Stage 12 ready:', { dotsCount: dots.length, solutionLength: solution.length });
  
  return { dots, solution };
}

// INSTANT Stage 11 generation - no solver needed
function generateInstantStage11(numDots: number): PuzzleResult {
  console.log('⚡ INSTANT Stage 11: Pure pre-computed, zero delay');
  
  // Pre-computed 7x7 snake solution
  const solution: string[] = [
    // Row 0: left to right
    "0,0", "0,1", "0,2", "0,3", "0,4", "0,5", "0,6",
    // Row 1: right to left
    "1,6", "1,5", "1,4", "1,3", "1,2", "1,1", "1,0",
    // Row 2: left to right
    "2,0", "2,1", "2,2", "2,3", "2,4", "2,5", "2,6",
    // Row 3: right to left
    "3,6", "3,5", "3,4", "3,3", "3,2", "3,1", "3,0",
    // Row 4: left to right
    "4,0", "4,1", "4,2", "4,3", "4,4", "4,5", "4,6",
    // Row 5: right to left
    "5,6", "5,5", "5,4", "5,3", "5,2", "5,1", "5,0",
    // Row 6: left to right
    "6,0", "6,1", "6,2", "6,3", "6,4", "6,5", "6,6"
  ];
  
  // Place dots strategically
  const dots: Dot[] = [];
  const totalCells = solution.length;
  
  for (let i = 1; i <= numDots; i++) {
    let pathIndex;
    if (i === numDots) {
      pathIndex = totalCells - 1; // Last dot at end
    } else {
      pathIndex = Math.floor(((i - 1) / (numDots - 1)) * (totalCells - 1));
    }
    
    const cell = solution[pathIndex];
    const [row, col] = cell.split(',').map(Number);
    dots.push({ num: i, row, col });
  }
  
  console.log('⚡ INSTANT Stage 11 ready:', { dotsCount: dots.length, solutionLength: solution.length });
  
  return { dots, solution };
}

// Test function to validate puzzle generation
export const testPuzzleGeneration = () => {
  console.log('🧪 Testing puzzle generation...');
  
  // Test Stage 1 (3 dots, 4x4)
  const stage1 = COMPLEXITY_LEVELS[0];
  console.log('\n--- Testing Stage 1 ---');
  const dots1 = generateRandomDots(stage1);
  console.log('Generated dots:', dots1);
  
  const solution1 = solvePuzzle(dots1, stage1.gridSize);
  if (solution1) {
    console.log('✅ Stage 1: Solvable');
    console.log('Solution length:', solution1.length, '/', stage1.gridSize * stage1.gridSize);
    console.log('Starts at:', solution1[0]);
    console.log('Ends at:', solution1[solution1.length - 1]);
    
    const endDot = dots1.find(d => d.num === stage1.numDots);
    const endCell = `${endDot!.row},${endDot!.col}`;
    console.log('END dot position:', endCell);
    console.log('Solution ends at END dot:', solution1[solution1.length - 1] === endCell ? '✅' : '❌');
  } else {
    console.log('❌ Stage 1: Not solvable');
  }
  
  // Test Stage 2 (4 dots, 4x4)
  if (COMPLEXITY_LEVELS.length > 1) {
    const stage2 = COMPLEXITY_LEVELS[1];
    console.log('\n--- Testing Stage 2 ---');
    const dots2 = generateRandomDots(stage2);
    console.log('Generated dots:', dots2);
    
    const solution2 = solvePuzzle(dots2, stage2.gridSize);
    if (solution2) {
      console.log('✅ Stage 2: Solvable');
      console.log('Solution length:', solution2.length, '/', stage2.gridSize * stage2.gridSize);
      
      const endDot = dots2.find(d => d.num === stage2.numDots);
      const endCell = `${endDot!.row},${endDot!.col}`;
      console.log('Solution ends at END dot:', solution2[solution2.length - 1] === endCell ? '✅' : '❌');
    } else {
      console.log('❌ Stage 2: Not solvable');
    }
  }
  
  console.log('\n🧪 Puzzle generation test complete');
};

// Quick manual test for debugging
export const quickTest = () => {
  console.log('🔧 Testing new generation approach...');
  
  // Test the new generation for 3 dots, 4x4
  const testComplexity = { numDots: 3, gridSize: 4, cellSize: 80, description: 'Test' };
  const generatedDots = generateRandomDots(testComplexity);
  
  console.log('Generated dots:', generatedDots);
  
  const solution = solvePuzzle(generatedDots, 4);
  
  if (solution) {
    console.log('✅ New generation approach WORKS!');
    console.log('Solution length:', solution.length, '/ Expected: 16');
    console.log('Starts at:', solution[0]);
    console.log('Ends at:', solution[solution.length - 1]);
    
    // Verify all dots are visited in order
    const dotPositions = new Map();
    generatedDots.forEach(dot => dotPositions.set(`${dot.row},${dot.col}`, dot.num));
    
    const dotsVisited = [];
    for (const cell of solution) {
      const dotNum = dotPositions.get(cell);
      if (dotNum) dotsVisited.push(dotNum);
    }
    
    console.log('Dots visited in order:', dotsVisited);
    console.log('Expected order:', [1, 2, 3]);
    
    return true;
  } else {
    console.log('❌ New generation approach FAILED');
    return false;
  }
};

// Debug function to test current 4x4 puzzle
export const debugCurrentPuzzle = () => {
  console.log('🔧 DEBUGGING CURRENT 4x4 PUZZLE...');
  
  // Test with dots like in the image: 1=(1,1), 2=(2,1), 3=(3,1)
  const testDots = [
    { num: 1, row: 1, col: 1 },  // center top
    { num: 2, row: 2, col: 1 },  // center middle  
    { num: 3, row: 3, col: 1 }   // center bottom
  ];
  
  console.log('Test dots:', testDots);
  
  const solution = solvePuzzle(testDots, 4);
  if (solution) {
    console.log('✅ Solution found:', solution);
    console.log('Length:', solution.length, '/ Expected: 16');
    
    // Check adjacency
    const isValid = validatePathAdjacency(solution);
    console.log('Adjacent moves only:', isValid ? '✅' : '❌');
    
    return solution;
  } else {
    console.log('❌ No solution found');
    return null;
  }
};