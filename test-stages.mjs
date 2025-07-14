// Test improved challenging but solvable patterns

function createDiamondPath(gridSize) {
  const path = [];
  
  // Create diamond pattern by alternating between different row patterns
  for (let row = 0; row < gridSize; row++) {
    const distFromCenter = Math.abs(row - Math.floor(gridSize / 2));
    
    if (distFromCenter % 2 === 0) {
      // Even distance from center: left to right
      for (let col = 0; col < gridSize; col++) {
        path.push(`${row},${col}`);
      }
    } else {
      // Odd distance from center: right to left (creates diamond effect)
      for (let col = gridSize - 1; col >= 0; col--) {
        path.push(`${row},${col}`);
      }
    }
  }
  
  return path;
}

function createMazePath(gridSize) {
  const path = [];
  
  // Create maze-like pattern with frequent direction changes
  for (let row = 0; row < gridSize; row++) {
    const pattern = row % 6; // 6 different patterns for complexity
    
    if (pattern === 0 || pattern === 1) {
      // Normal left-to-right
      for (let col = 0; col < gridSize; col++) {
        path.push(`${row},${col}`);
      }
    } else if (pattern === 2 || pattern === 3) {
      // Right-to-left
      for (let col = gridSize - 1; col >= 0; col--) {
        path.push(`${row},${col}`);
      }
    } else if (pattern === 4) {
      // Left-to-right again but different timing
      for (let col = 0; col < gridSize; col++) {
        path.push(`${row},${col}`);
      }
    } else {
      // Right-to-left with different timing
      for (let col = gridSize - 1; col >= 0; col--) {
        path.push(`${row},${col}`);
      }
    }
  }
  
  return path;
}

function createFractalPath(gridSize) {
  const path = [];
  
  // Create fractal-like pattern with complex but predictable changes
  for (let row = 0; row < gridSize; row++) {
    const fractalLevel = Math.floor(row / 2) % 4; // 4 different fractal levels
    const rowParity = row % 2;
    
    if (fractalLevel === 0) {
      // Level 0: standard snake
      if (rowParity === 0) {
        for (let col = 0; col < gridSize; col++) {
          path.push(`${row},${col}`);
        }
      } else {
        for (let col = gridSize - 1; col >= 0; col--) {
          path.push(`${row},${col}`);
        }
      }
    } else if (fractalLevel === 1) {
      // Level 1: reverse snake
      if (rowParity === 1) {
        for (let col = 0; col < gridSize; col++) {
          path.push(`${row},${col}`);
        }
      } else {
        for (let col = gridSize - 1; col >= 0; col--) {
          path.push(`${row},${col}`);
        }
      }
    } else if (fractalLevel === 2) {
      // Level 2: different pattern
      if ((row + gridSize) % 3 === 0) {
        for (let col = 0; col < gridSize; col++) {
          path.push(`${row},${col}`);
        }
      } else {
        for (let col = gridSize - 1; col >= 0; col--) {
          path.push(`${row},${col}`);
        }
      }
    } else {
      // Level 3: most complex
      if ((row * 2 + gridSize) % 5 < 3) {
        for (let col = 0; col < gridSize; col++) {
          path.push(`${row},${col}`);
        }
      } else {
        for (let col = gridSize - 1; col >= 0; col--) {
          path.push(`${row},${col}`);
        }
      }
    }
  }
  
  return path;
}

function createLabyrinthPath(gridSize) {
  const path = [];
  
  // Create proper labyrinth with connected spiral pattern
  let top = 0, bottom = gridSize - 1, left = 0, right = gridSize - 1;
  
  while (top <= bottom && left <= right) {
    // Top row left to right
    for (let col = left; col <= right; col++) {
      path.push(`${top},${col}`);
    }
    top++;
    
    // Right column top to bottom (skip top corner already added)
    for (let row = top; row <= bottom; row++) {
      path.push(`${row},${right}`);
    }
    right--;
    
    // Bottom row right to left (if there's a bottom row left)
    if (top <= bottom) {
      for (let col = right; col >= left; col--) {
        path.push(`${bottom},${col}`);
      }
      bottom--;
    }
    
    // Left column bottom to top (if there's a left column left)
    if (left <= right) {
      for (let row = bottom; row >= top; row--) {
        path.push(`${row},${left}`);
      }
      left++;
    }
  }
  
  return path;
}

function createComplexPath(gridSize) {
  const path = [];
  
  // Most complex pattern: combines multiple algorithmic approaches
  for (let row = 0; row < gridSize; row++) {
    const complexity = (row * 3 + gridSize * 2) % 10; // 10 different complexity patterns
    
    if (complexity < 2) {
      // Pattern 0-1: left to right
      for (let col = 0; col < gridSize; col++) {
        path.push(`${row},${col}`);
      }
    } else if (complexity < 4) {
      // Pattern 2-3: right to left
      for (let col = gridSize - 1; col >= 0; col--) {
        path.push(`${row},${col}`);
      }
    } else if (complexity < 6) {
      // Pattern 4-5: left to right again
      for (let col = 0; col < gridSize; col++) {
        path.push(`${row},${col}`);
      }
    } else if (complexity < 8) {
      // Pattern 6-7: right to left
      for (let col = gridSize - 1; col >= 0; col--) {
        path.push(`${row},${col}`);
      }
    } else {
      // Pattern 8-9: alternating based on position
      if ((row + gridSize) % 3 === 0) {
        for (let col = 0; col < gridSize; col++) {
          path.push(`${row},${col}`);
        }
      } else {
        for (let col = gridSize - 1; col >= 0; col--) {
          path.push(`${row},${col}`);
        }
      }
    }
  }
  
  return path;
}

function validatePathAdjacency(path) {
  if (path.length <= 1) return true;
  
  for (let i = 0; i < path.length - 1; i++) {
    const [row1, col1] = path[i].split(',').map(Number);
    const [row2, col2] = path[i + 1].split(',').map(Number);
    
    const rowDiff = Math.abs(row2 - row1);
    const colDiff = Math.abs(col2 - col1);
    
    const isAdjacent = (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
    
    if (!isAdjacent) {
      console.error(`❌ Invalid move: ${path[i]} → ${path[i + 1]} (gap: ${rowDiff},${colDiff})`);
      return false;
    }
  }
  
  return true;
}

// Test challenging patterns for stages 5-12
const patterns = [
  { name: 'Diamond (Stage 5)', func: createDiamondPath, gridSize: 5 },
  { name: 'Maze (Stage 9)', func: createMazePath, gridSize: 7 },
  { name: 'Fractal (Stage 10)', func: createFractalPath, gridSize: 7 },
  { name: 'Labyrinth (Stage 11)', func: createLabyrinthPath, gridSize: 7 },
  { name: 'Complex (Stage 12)', func: createComplexPath, gridSize: 8 }
];

patterns.forEach(({ name, func, gridSize }) => {
  console.log(`\n=== Testing ${name} ===`);
  const path = func(gridSize);
  const totalCells = gridSize * gridSize;
  const uniqueCells = new Set(path);
  const isValid = validatePathAdjacency(path);
  
  console.log('Grid size:', gridSize, 'x', gridSize, '=', totalCells, 'cells');
  console.log('Path length:', path.length);
  console.log('Unique cells:', uniqueCells.size);
  console.log('Valid adjacency:', isValid);
  console.log('All cells covered:', uniqueCells.size === totalCells);
  console.log('Pattern preview:', path.slice(0, 10).join(' → '));
  
  // Calculate complexity score (direction changes in first 30 moves)
  let directionChanges = 0;
  let currentDirection = null;
  
  for (let i = 0; i < Math.min(path.length - 1, 30); i++) {
    const [row1, col1] = path[i].split(',').map(Number);
    const [row2, col2] = path[i + 1].split(',').map(Number);
    
    const direction = `${row2 - row1},${col2 - col1}`;
    
    if (currentDirection === null) {
      currentDirection = direction;
    } else if (currentDirection !== direction) {
      directionChanges++;
      currentDirection = direction;
    }
  }
  
  const complexityScore = directionChanges / Math.min(path.length - 1, 30);
  console.log('Complexity score:', complexityScore.toFixed(3), `(${directionChanges} changes in first 30 moves)`);
  
  if (complexityScore > 0.2) {
    console.log('🔥 VERY CHALLENGING!');
  } else if (complexityScore > 0.1) {
    console.log('⚡ CHALLENGING');
  } else if (complexityScore > 0.05) {
    console.log('� MODERATE');
  } else {
    console.log('📝 EASY');
  }
  
  if (isValid && uniqueCells.size === totalCells && path.length === totalCells) {
    console.log('✅ PATTERN IS PERFECT!');
  } else {
    console.log('❌ NEEDS FIXING');
  }
});
