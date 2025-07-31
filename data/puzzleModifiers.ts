import { ComplexityLevel, Dot, PuzzleResult } from './puzzle';

export type PuzzleModifier = 
  | 'time_limit'
  | 'move_limit' 
  | 'locked_cells'
  | 'multi_entry'
  | 'blind_mode'
  | 'reverse_order'
  | 'checkpoint_mode';

export interface ModifierConfig {
  type: PuzzleModifier;
  name: string;
  description: string;
  icon: string;
  difficulty: 'easy' | 'medium' | 'hard';
  // Specific config for each modifier type
  timeLimit?: number; // seconds
  moveLimit?: number; // max moves allowed
  lockedCells?: string[]; // cells that cannot be traversed
  entryPoints?: number[]; // multiple starting dots
  checkpoints?: number[]; // must visit these dots in any order before completing
}

export interface EnhancedPuzzle extends PuzzleResult {
  modifiers: ModifierConfig[];
  targetTime?: number; // for star rating
  targetMoves?: number; // for star rating
  difficultyLevel: 'easy' | 'medium' | 'hard';
  lockedCells?: Set<string>;
  multipleEntries?: boolean;
  checkpoints?: Set<number>;
}

// Pre-defined modifier configurations
export const MODIFIER_PRESETS: { [key: string]: ModifierConfig } = {
  speedrun: {
    type: 'time_limit',
    name: 'Speed Run',
    description: 'Complete the puzzle within the time limit',
    icon: '⏱️',
    difficulty: 'medium',
    timeLimit: 60
  },
  
  efficiency: {
    type: 'move_limit',
    name: 'Efficiency Challenge',
    description: 'Complete with limited moves',
    icon: '🎯',
    difficulty: 'medium',
    moveLimit: 30
  },
  
  obstacles: {
    type: 'locked_cells',
    name: 'Obstacle Course',
    description: 'Navigate around blocked cells',
    icon: '🚧',
    difficulty: 'hard',
    lockedCells: []
  },
  
  multiStart: {
    type: 'multi_entry',
    name: 'Multiple Entries',
    description: 'Connect from multiple starting points',
    icon: '🔀',
    difficulty: 'hard',
    entryPoints: [1, 2]
  },
  
  mystery: {
    type: 'blind_mode',
    name: 'Mystery Mode',
    description: 'Some numbers are hidden',
    icon: '❓',
    difficulty: 'hard'
  },
  
  reverse: {
    type: 'reverse_order',
    name: 'Reverse Order',
    description: 'Start from the highest number',
    icon: '🔄',
    difficulty: 'medium'
  },
  
  checkpoints: {
    type: 'checkpoint_mode',
    name: 'Checkpoint Rally',
    description: 'Visit checkpoints in any order',
    icon: '🏁',
    difficulty: 'hard',
    checkpoints: []
  }
};

// Generate modified puzzles based on base complexity and selected modifiers
export const generateModifiedPuzzle = (
  baseComplexity: ComplexityLevel,
  modifiers: ModifierConfig[] = []
): EnhancedPuzzle => {
  // Start with base puzzle generation
  const basePuzzle = generateBasePuzzle(baseComplexity);
  
  let enhancedPuzzle: EnhancedPuzzle = {
    ...basePuzzle,
    modifiers,
    difficultyLevel: calculateOverallDifficulty(modifiers),
    targetTime: calculateTargetTime(baseComplexity, modifiers),
    targetMoves: calculateTargetMoves(baseComplexity, modifiers)
  };

  // Apply each modifier
  modifiers.forEach(modifier => {
    enhancedPuzzle = applyModifier(enhancedPuzzle, modifier);
  });

  return enhancedPuzzle;
};

// Calculate overall difficulty based on modifiers
const calculateOverallDifficulty = (modifiers: ModifierConfig[]): 'easy' | 'medium' | 'hard' => {
  if (modifiers.length === 0) return 'easy';
  
  const hardCount = modifiers.filter(m => m.difficulty === 'hard').length;
  const mediumCount = modifiers.filter(m => m.difficulty === 'medium').length;
  
  if (hardCount > 0 || mediumCount > 1) return 'hard';
  if (mediumCount > 0) return 'medium';
  return 'easy';
};

// Calculate target completion time for star ratings
const calculateTargetTime = (complexity: ComplexityLevel, modifiers: ModifierConfig[]): number => {
  const baseTime = complexity.gridSize * complexity.gridSize * 2; // Base time in seconds
  
  // Adjust for modifiers
  const timeModifier = modifiers.find(m => m.type === 'time_limit');
  if (timeModifier?.timeLimit) {
    return timeModifier.timeLimit * 0.8; // 80% of time limit for 3 stars
  }
  
  return baseTime;
};

// Calculate target moves for star ratings
const calculateTargetMoves = (complexity: ComplexityLevel, modifiers: ModifierConfig[]): number => {
  const baseMoves = complexity.gridSize * complexity.gridSize; // Optimal path length
  
  // Adjust for modifiers
  const moveModifier = modifiers.find(m => m.type === 'move_limit');
  if (moveModifier?.moveLimit) {
    return moveModifier.moveLimit * 0.8; // 80% of move limit for 3 stars
  }
  
  return baseMoves;
};

// Apply specific modifier logic
const applyModifier = (puzzle: EnhancedPuzzle, modifier: ModifierConfig): EnhancedPuzzle => {
  const newPuzzle = { ...puzzle };

  switch (modifier.type) {
    case 'locked_cells':
      newPuzzle.lockedCells = generateLockedCells(puzzle, modifier);
      break;
      
    case 'multi_entry':
      newPuzzle.multipleEntries = true;
      if (modifier.entryPoints) {
        // Modify dots to have multiple entry points
        newPuzzle.dots = createMultipleEntryPoints(puzzle.dots, modifier.entryPoints);
      }
      break;
      
    case 'blind_mode':
      // Hide some number labels (handled in UI)
      newPuzzle.dots = hideRandomNumbers(puzzle.dots);
      break;
      
    case 'reverse_order':
      // Reverse the numbering
      newPuzzle.dots = reverseNumbering(puzzle.dots);
      break;
      
    case 'checkpoint_mode':
      newPuzzle.checkpoints = generateCheckpoints(puzzle, modifier);
      break;
  }

  return newPuzzle;
};

// Generate locked cells that don't break the solution
const generateLockedCells = (puzzle: EnhancedPuzzle, modifier: ModifierConfig): Set<string> => {
  const lockedCells = new Set<string>();
  const solutionCells = new Set(puzzle.fullSolution);
  const { gridSize } = puzzle;
  
  // Generate random locked cells that are not part of the solution
  const maxLocked = Math.floor((gridSize * gridSize - puzzle.fullSolution.length) * 0.3);
  
  for (let attempts = 0; attempts < maxLocked * 3 && lockedCells.size < maxLocked; attempts++) {
    const row = Math.floor(Math.random() * gridSize);
    const col = Math.floor(Math.random() * gridSize);
    const cell = `${row},${col}`;
    
    if (!solutionCells.has(cell) && !lockedCells.has(cell)) {
      lockedCells.add(cell);
    }
  }
  
  return lockedCells;
};

// Create multiple entry points for advanced puzzles
const createMultipleEntryPoints = (dots: Dot[], entryPoints: number[]): Dot[] => {
  return dots.map(dot => ({
    ...dot,
    isEntryPoint: entryPoints.includes(dot.num)
  })) as Dot[];
};

// Hide some numbers for blind mode
const hideRandomNumbers = (dots: Dot[]): Dot[] => {
  const hiddenCount = Math.min(Math.floor(dots.length * 0.4), 3);
  const hiddenIndices = new Set<number>();
  
  // Never hide the first or last dot
  while (hiddenIndices.size < hiddenCount) {
    const index = Math.floor(Math.random() * (dots.length - 2)) + 1;
    hiddenIndices.add(index);
  }
  
  return dots.map((dot, index) => ({
    ...dot,
    hidden: hiddenIndices.has(index)
  })) as Dot[];
};

// Reverse the numbering for reverse mode
const reverseNumbering = (dots: Dot[]): Dot[] => {
  const maxNum = Math.max(...dots.map(d => d.num));
  return dots.map(dot => ({
    ...dot,
    num: maxNum - dot.num + 1
  }));
};

// Generate checkpoint system
const generateCheckpoints = (puzzle: EnhancedPuzzle, modifier: ModifierConfig): Set<number> => {
  const checkpoints = new Set<number>();
  const middleDots = puzzle.dots.slice(1, -1); // Exclude first and last dots
  
  const checkpointCount = Math.min(Math.floor(middleDots.length * 0.5), 3);
  
  while (checkpoints.size < checkpointCount) {
    const randomDot = middleDots[Math.floor(Math.random() * middleDots.length)];
    checkpoints.add(randomDot.num);
  }
  
  return checkpoints;
};

// Base puzzle generation (simplified version of existing function)
const generateBasePuzzle = (complexity: ComplexityLevel): PuzzleResult => {
  // This would call the existing generateRandomDotsWithSolution function
  // For now, we'll create a simplified version to avoid circular dependencies
  const { numDots, gridSize } = complexity;
  
  // Create a simple path for demonstration
  const solutionPath: string[] = [];
  for (let row = 0; row < gridSize; row++) {
    if (row % 2 === 0) {
      // Left to right
      for (let col = 0; col < gridSize; col++) {
        solutionPath.push(`${row},${col}`);
      }
    } else {
      // Right to left
      for (let col = gridSize - 1; col >= 0; col--) {
        solutionPath.push(`${row},${col}`);
      }
    }
  }
  
  // Generate dots
  const dots: Dot[] = [];
  const spacing = Math.floor((solutionPath.length - 1) / (numDots - 1));
  
  for (let i = 1; i <= numDots; i++) {
    let pathIndex: number;
    
    if (i === 1) {
      pathIndex = 0;
    } else if (i === numDots) {
      pathIndex = solutionPath.length - 1;
    } else {
      pathIndex = spacing * (i - 1);
      pathIndex = Math.min(pathIndex, solutionPath.length - 2);
    }
    
    const cell = solutionPath[pathIndex];
    const [row, col] = cell.split(',').map(Number);
    dots.push({ num: i, row, col });
  }
  
  return {
    dots,
    solution: solutionPath,
    fullSolution: solutionPath,
    gridSize
  };
};

// Challenge mode generator for daily puzzles
export const generateDailyChallenge = (date: Date = new Date()): EnhancedPuzzle => {
  // Use date as seed for consistent daily puzzles
  const seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  Math.random = (() => {
    let x = seed;
    return () => {
      x = (x * 9301 + 49297) % 233280;
      return x / 233280;
    };
  })();
  
  // Select random complexity and modifiers based on day
  const complexityIndex = seed % COMPLEXITY_LEVELS.length;
  const complexity = COMPLEXITY_LEVELS[complexityIndex];
  
  // Select 1-2 random modifiers
  const modifierKeys = Object.keys(MODIFIER_PRESETS);
  const numModifiers = (seed % 3) + 1; // 1-3 modifiers
  const selectedModifiers: ModifierConfig[] = [];
  
  for (let i = 0; i < numModifiers; i++) {
    const modifierKey = modifierKeys[(seed + i) % modifierKeys.length];
    selectedModifiers.push({ ...MODIFIER_PRESETS[modifierKey] });
  }
  
  return generateModifiedPuzzle(complexity, selectedModifiers);
};

// Validate if a puzzle is solvable with the given modifiers
export const validateModifiedPuzzle = (puzzle: EnhancedPuzzle): boolean => {
  // Check if solution path avoids locked cells
  if (puzzle.lockedCells) {
    for (const cell of puzzle.fullSolution) {
      if (puzzle.lockedCells.has(cell)) {
        return false;
      }
    }
  }
  
  // Additional validation logic for other modifiers...
  
  return true;
};

// Export complexity levels for backward compatibility
export const COMPLEXITY_LEVELS = [
  { gridSize: 5, numDots: 4, cellSize: 55, description: "Snake: 4 dots, 5×5 grid", patternType: 'simple', name: 'Easy', difficulty: 'Easy' },
  { gridSize: 5, numDots: 5, cellSize: 55, description: "Spiral: 5 dots, 5×5 grid", patternType: 'spiral', name: 'Medium', difficulty: 'Medium' },
  { gridSize: 6, numDots: 5, cellSize: 50, description: "Zigzag: 5 dots, 6×6 grid", patternType: 'zigzag', name: 'Hard', difficulty: 'Medium' },
  { gridSize: 6, numDots: 6, cellSize: 50, description: "L-Shape: 6 dots, 6×6 grid", patternType: 'lshape', name: 'Expert', difficulty: 'Hard' },
  { gridSize: 6, numDots: 7, cellSize: 50, description: "Diamond: 7 dots, 6×6 grid", patternType: 'diamond', name: 'Master', difficulty: 'Hard' },
  { gridSize: 7, numDots: 6, cellSize: 45, description: "Cross: 6 dots, 7×7 grid", patternType: 'cross', name: 'Elite', difficulty: 'Hard' },
  { gridSize: 7, numDots: 7, cellSize: 45, description: "Wave: 7 dots, 7×7 grid", patternType: 'wave', name: 'Pro', difficulty: 'Hard' },
  { gridSize: 7, numDots: 8, cellSize: 45, description: "U-Turn: 8 dots, 7×7 grid", patternType: 'uturn', name: 'Legend', difficulty: 'Hard' },
  { gridSize: 8, numDots: 7, cellSize: 40, description: "Complex: 7 dots, 8×8 grid", patternType: 'complex', name: 'Godlike', difficulty: 'Hard' },
  { gridSize: 8, numDots: 8, cellSize: 40, description: "Fractal: 8 dots, 8×8 grid", patternType: 'fractal', name: 'Insane', difficulty: 'Hard' },
  { gridSize: 8, numDots: 9, cellSize: 40, description: "Labyrinth: 9 dots, 8×8 grid", patternType: 'labyrinth', name: 'Nightmare', difficulty: 'Hard' },
  { gridSize: 9, numDots: 9, cellSize: 35, description: "Master: 9 dots, 9×9 grid", patternType: 'maze', name: 'Impossible', difficulty: 'Hard' },
] as const;