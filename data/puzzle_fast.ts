// FAST & SIMPLE pattern generators - optimized for speed
import { ComplexityLevel, Dot, PuzzleResult, type DifficultyType } from './puzzle';

// Simple, fast pattern generators
export function generateFastPuzzle(
  complexity: ComplexityLevel, 
  selectedDifficulty?: DifficultyType
): PuzzleResult {
  const { gridSize, numDots } = complexity;
  
  console.log('⚡ FAST puzzle generation:', { 
    gridSize, 
    numDots, 
    difficulty: selectedDifficulty || 'stage' 
  });

  // Simple, instant pattern generation
  let solutionPath: string[];
  
  switch (selectedDifficulty) {
    case 'easy':
      solutionPath = createFastSimplePath(gridSize);
      break;
    case 'medium':
      solutionPath = createFastZigzagPath(gridSize);
      break;
    case 'hard':
      solutionPath = createFastSpiralPath(gridSize);
      break;
    default:
      // Stage-based patterns
      if (gridSize <= 4) {
        solutionPath = createFastSimplePath(gridSize);
      } else if (gridSize <= 6) {
        solutionPath = createFastZigzagPath(gridSize);
      } else {
        solutionPath = createFastSpiralPath(gridSize);
      }
  }

  // Fast dot placement
  const dots = createFastDotPlacement(solutionPath, numDots);
  
  console.log('✅ INSTANT puzzle generated');
  return { dots, solution: solutionPath };
}

// FAST: Simple snake pattern (instant generation)
function createFastSimplePath(gridSize: number): string[] {
  const path: string[] = [];
  for (let row = 0; row < gridSize; row++) {
    if (row % 2 === 0) {
      for (let col = 0; col < gridSize; col++) {
        path.push(`${row},${col}`);
      }
    } else {
      for (let col = gridSize - 1; col >= 0; col--) {
        path.push(`${row},${col}`);
      }
    }
  }
  return path;
}

// FAST: Zigzag pattern (instant generation)
function createFastZigzagPath(gridSize: number): string[] {
  const path: string[] = [];
  let direction = 'right';
  let row = 0, col = 0;
  
  const visited = new Set<string>();
  
  while (path.length < gridSize * gridSize) {
    const cell = `${row},${col}`;
    if (!visited.has(cell)) {
      path.push(cell);
      visited.add(cell);
    }
    
    // Simple zigzag logic
    if (direction === 'right') {
      if (col < gridSize - 1) {
        col++;
      } else {
        row++;
        direction = 'left';
      }
    } else {
      if (col > 0) {
        col--;
      } else {
        row++;
        direction = 'right';
      }
    }
    
    // Safety check
    if (row >= gridSize) break;
  }
  
  // Fill any missing cells
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const cell = `${r},${c}`;
      if (!visited.has(cell)) {
        path.push(cell);
      }
    }
  }
  
  return path;
}

// FAST: Spiral pattern (instant generation)
function createFastSpiralPath(gridSize: number): string[] {
  const path: string[] = [];
  let top = 0, bottom = gridSize - 1, left = 0, right = gridSize - 1;
  
  while (top <= bottom && left <= right) {
    // Top row
    for (let col = left; col <= right; col++) {
      path.push(`${top},${col}`);
    }
    top++;
    
    // Right column
    for (let row = top; row <= bottom; row++) {
      path.push(`${row},${right}`);
    }
    right--;
    
    // Bottom row
    if (top <= bottom) {
      for (let col = right; col >= left; col--) {
        path.push(`${bottom},${col}`);
      }
      bottom--;
    }
    
    // Left column
    if (left <= right) {
      for (let row = bottom; row >= top; row--) {
        path.push(`${row},${left}`);
      }
      left++;
    }
  }
  
  return path;
}

// FAST: Simple dot placement (instant)
function createFastDotPlacement(solutionPath: string[], numDots: number): Dot[] {
  const dots: Dot[] = [];
  
  for (let i = 1; i <= numDots; i++) {
    let pathIndex: number;
    
    if (i === numDots) {
      // Last dot at the end
      pathIndex = solutionPath.length - 1;
    } else {
      // Evenly distribute other dots
      pathIndex = Math.floor(((i - 1) / (numDots - 1)) * (solutionPath.length - 1));
    }
    
    const cell = solutionPath[pathIndex];
    const [row, col] = cell.split(',').map(Number);
    dots.push({ num: i, row, col });
  }
  
  return dots;
}
