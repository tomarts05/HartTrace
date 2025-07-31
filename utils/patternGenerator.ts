/**
 * PatternGenerator - Enhanced pattern generation with complexity scaling
 * Generates progressively complex patterns for each difficulty level
 */

import { ComplexityLevel } from '../data/puzzle';

export interface PatternMetrics {
  complexity: number; // 1-10 complexity rating
  turnCount: number; // Number of direction changes
  symmetry: boolean; // Whether pattern has symmetry
  compactness: number; // How tightly packed the pattern is (0-1)
}

export interface EnhancedPattern {
  path: string[];
  metrics: PatternMetrics;
  description: string;
  hints: string[];
}

export class PatternGenerator {
  private static instance: PatternGenerator | null = null;

  /**
   * Singleton pattern for consistent pattern generation
   */
  static getInstance(): PatternGenerator {
    if (!PatternGenerator.instance) {
      PatternGenerator.instance = new PatternGenerator();
    }
    return PatternGenerator.instance;
  }

  /**
   * Generate an enhanced pattern with complexity metrics
   */
  generateEnhancedPattern(complexity: ComplexityLevel, level: number): EnhancedPattern {
    console.log(`🎨 PatternGenerator: Creating enhanced ${complexity.patternType} pattern for level ${level}`);
    
    const basePath = this.createPatternByType(
      complexity.gridSize, 
      0, 
      0, 
      complexity.patternType
    );

    // Add complexity modifiers based on level
    const enhancedPath = this.applyComplexityModifiers(basePath, complexity, level);
    const metrics = this.calculatePatternMetrics(enhancedPath, complexity.gridSize);
    const description = this.generatePatternDescription(complexity.patternType, metrics);
    const hints = this.generatePatternHints(complexity.patternType, level);

    return {
      path: enhancedPath,
      metrics,
      description,
      hints
    };
  }

  /**
   * Apply complexity modifiers to increase difficulty
   */
  private applyComplexityModifiers(
    basePath: string[], 
    complexity: ComplexityLevel, 
    level: number
  ): string[] {
    let modifiedPath = [...basePath];

    // For higher levels, add complexity variations
    if (level >= 6) {
      modifiedPath = this.addMirrorVariations(modifiedPath, complexity.gridSize);
    }
    
    if (level >= 8) {
      modifiedPath = this.addRotationalComplexity(modifiedPath, complexity.gridSize);
    }

    if (level >= 10) {
      modifiedPath = this.addFractalElements(modifiedPath, complexity.gridSize);
    }

    return modifiedPath;
  }

  /**
   * Add mirror variations to make pattern more complex
   */
  private addMirrorVariations(path: string[], gridSize: number): string[] {
    // For even grid sizes, create more symmetric but complex patterns
    if (gridSize % 2 === 0) {
      return this.createMirroredSpiral(gridSize, 0, 0);
    }
    return path;
  }

  /**
   * Add rotational complexity elements
   */
  private addRotationalComplexity(path: string[], gridSize: number): string[] {
    // Create patterns with 4-fold rotational elements
    return this.createRotationalPattern(gridSize, 0, 0);
  }

  /**
   * Add fractal-like elements for maximum complexity
   */
  private addFractalElements(path: string[], gridSize: number): string[] {
    // Create recursive pattern structures
    return this.createFractalMaze(gridSize, 0, 0);
  }

  /**
   * Create mirrored spiral pattern
   */
  private createMirroredSpiral(gridSize: number, startRow: number, startCol: number): string[] {
    const path: string[] = [];
    const visited = new Set<string>();
    
    let row = startRow;
    let col = startCol;
    
    // Create dual spirals that mirror each other
    const midPoint = Math.floor(gridSize / 2);
    
    // First spiral from top-left
    const spiral1 = this.createSpiralFromPoint(gridSize, 0, 0, midPoint);
    
    // Second spiral from bottom-right  
    const spiral2 = this.createSpiralFromPoint(gridSize, gridSize - 1, gridSize - 1, midPoint);
    
    // Interweave the spirals
    const maxLength = Math.max(spiral1.length, spiral2.length);
    for (let i = 0; i < maxLength; i++) {
      if (i < spiral1.length && !visited.has(spiral1[i])) {
        path.push(spiral1[i]);
        visited.add(spiral1[i]);
      }
      if (i < spiral2.length && !visited.has(spiral2[i])) {
        path.push(spiral2[i]);
        visited.add(spiral2[i]);
      }
    }
    
    // Fill any remaining cells
    this.fillRemainingCells(path, visited, gridSize);
    
    console.log(`🌀 Created mirrored spiral: ${path.length} cells`);
    return path;
  }

  /**
   * Create rotational pattern with 4-fold symmetry
   */
  private createRotationalPattern(gridSize: number, startRow: number, startCol: number): string[] {
    const path: string[] = [];
    const visited = new Set<string>();
    const center = Math.floor(gridSize / 2);
    
    // Create 4 arms rotating from center
    const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]]; // right, down, left, up
    
    let currentRow = center;
    let currentCol = center;
    path.push(`${currentRow},${currentCol}`);
    visited.add(`${currentRow},${currentCol}`);
    
    let armLength = 1;
    let dirIndex = 0;
    
    while (path.length < gridSize * gridSize) {
      for (let arm = 0; arm < 4 && path.length < gridSize * gridSize; arm++) {
        const [dRow, dCol] = directions[(dirIndex + arm) % 4];
        
        for (let step = 0; step < armLength && path.length < gridSize * gridSize; step++) {
          currentRow += dRow;
          currentCol += dCol;
          
          if (currentRow >= 0 && currentRow < gridSize && 
              currentCol >= 0 && currentCol < gridSize) {
            const cell = `${currentRow},${currentCol}`;
            if (!visited.has(cell)) {
              path.push(cell);
              visited.add(cell);
            }
          }
        }
      }
      
      armLength++;
      dirIndex = (dirIndex + 1) % 4;
      
      // Prevent infinite loops
      if (armLength > gridSize) break;
    }
    
    this.fillRemainingCells(path, visited, gridSize);
    
    console.log(`🔄 Created rotational pattern: ${path.length} cells`);
    return path;
  }

  /**
   * Create fractal maze pattern
   */
  private createFractalMaze(gridSize: number, startRow: number, startCol: number): string[] {
    const path: string[] = [];
    const visited = new Set<string>();
    
    // Create recursive subdivision pattern
    this.addFractalSection(path, visited, 0, 0, gridSize - 1, gridSize - 1, 0);
    
    console.log(`🌿 Created fractal maze: ${path.length} cells`);
    return path;
  }

  /**
   * Add a fractal section recursively
   */
  private addFractalSection(
    path: string[], 
    visited: Set<string>, 
    minRow: number, 
    minCol: number, 
    maxRow: number, 
    maxCol: number,
    depth: number
  ): void {
    if (depth > 3 || maxRow - minRow < 2 || maxCol - minCol < 2) {
      // Fill remaining area with simple path
      for (let row = minRow; row <= maxRow; row++) {
        for (let col = minCol; col <= maxCol; col++) {
          const cell = `${row},${col}`;
          if (!visited.has(cell)) {
            path.push(cell);
            visited.add(cell);
          }
        }
      }
      return;
    }
    
    const midRow = Math.floor((minRow + maxRow) / 2);
    const midCol = Math.floor((minCol + maxCol) / 2);
    
    // Recursively fill quadrants in fractal order
    const quadrants = [
      [minRow, minCol, midRow, midCol],     // Top-left
      [minRow, midCol + 1, midRow, maxCol], // Top-right
      [midRow + 1, minRow, maxRow, midCol], // Bottom-left
      [midRow + 1, midCol + 1, maxRow, maxCol] // Bottom-right
    ];
    
    for (const [qMinRow, qMinCol, qMaxRow, qMaxCol] of quadrants) {
      if (qMinRow <= qMaxRow && qMinCol <= qMaxCol) {
        this.addFractalSection(path, visited, qMinRow, qMinCol, qMaxRow, qMaxCol, depth + 1);
      }
    }
  }

  /**
   * Create spiral from a specific point with limited radius
   */
  private createSpiralFromPoint(gridSize: number, startRow: number, startCol: number, maxRadius: number): string[] {
    const path: string[] = [];
    const visited = new Set<string>();
    
    let row = startRow;
    let col = startCol;
    path.push(`${row},${col}`);
    visited.add(`${row},${col}`);
    
    const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]]; // right, down, left, up
    let dirIndex = 0;
    let steps = 1;
    
    while (path.length < maxRadius * maxRadius && steps <= maxRadius) {
      for (let i = 0; i < 2; i++) { // Two sides of the spiral square
        const [dRow, dCol] = directions[dirIndex];
        
        for (let j = 0; j < steps; j++) {
          row += dRow;
          col += dCol;
          
          if (row >= 0 && row < gridSize && col >= 0 && col < gridSize) {
            const cell = `${row},${col}`;
            if (!visited.has(cell)) {
              path.push(cell);
              visited.add(cell);
            }
          }
        }
        
        dirIndex = (dirIndex + 1) % 4;
      }
      
      steps++;
    }
    
    return path;
  }

  /**
   * Fill any remaining unvisited cells
   */
  private fillRemainingCells(path: string[], visited: Set<string>, gridSize: number): void {
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const cell = `${row},${col}`;
        if (!visited.has(cell)) {
          path.push(cell);
          visited.add(cell);
        }
      }
    }
  }

  /**
   * Calculate pattern complexity metrics
   */
  private calculatePatternMetrics(path: string[], gridSize: number): PatternMetrics {
    let turnCount = 0;
    let lastDirection: string | null = null;
    
    // Count direction changes
    for (let i = 1; i < path.length; i++) {
      const [row1, col1] = path[i - 1].split(',').map(Number);
      const [row2, col2] = path[i].split(',').map(Number);
      
      const direction = `${row2 - row1},${col2 - col1}`;
      if (lastDirection && direction !== lastDirection) {
        turnCount++;
      }
      lastDirection = direction;
    }
    
    // Calculate complexity based on turns and path efficiency
    const maxPossibleTurns = path.length - 1;
    const complexity = Math.min(10, Math.floor((turnCount / maxPossibleTurns) * 10) + 1);
    
    // Check for symmetry (simplified check)
    const symmetry = this.checkPatternSymmetry(path, gridSize);
    
    // Calculate compactness (how tightly packed the path is)
    const compactness = this.calculateCompactness(path, gridSize);
    
    return {
      complexity,
      turnCount,
      symmetry,
      compactness
    };
  }

  /**
   * Check if pattern has symmetry
   */
  private checkPatternSymmetry(path: string[], gridSize: number): boolean {
    // Simple symmetry check - could be enhanced
    const pathSet = new Set(path);
    let symmetricMatches = 0;
    
    for (const cell of path) {
      const [row, col] = cell.split(',').map(Number);
      const mirroredCell = `${row},${gridSize - 1 - col}`;
      
      if (pathSet.has(mirroredCell)) {
        symmetricMatches++;
      }
    }
    
    return (symmetricMatches / path.length) > 0.7; // 70% symmetry threshold
  }

  /**
   * Calculate how compact/dense the pattern is
   */
  private calculateCompactness(path: string[], gridSize: number): number {
    if (path.length < 2) return 1;
    
    let totalDistance = 0;
    
    for (let i = 1; i < path.length; i++) {
      const [row1, col1] = path[i - 1].split(',').map(Number);
      const [row2, col2] = path[i].split(',').map(Number);
      
      totalDistance += Math.abs(row2 - row1) + Math.abs(col2 - col1);
    }
    
    const optimalDistance = path.length - 1; // Minimum possible distance
    return optimalDistance / totalDistance;
  }

  /**
   * Generate human-readable pattern description
   */
  private generatePatternDescription(patternType: string, metrics: PatternMetrics): string {
    const complexityLevel = metrics.complexity <= 3 ? 'Simple' :
                          metrics.complexity <= 6 ? 'Moderate' :
                          metrics.complexity <= 8 ? 'Complex' : 'Expert';
    
    const symmetryNote = metrics.symmetry ? ' with symmetry' : '';
    const compactnessNote = metrics.compactness > 0.8 ? ' (efficient path)' : 
                           metrics.compactness > 0.6 ? ' (moderate path)' : ' (winding path)';
    
    return `${complexityLevel} ${patternType}${symmetryNote}${compactnessNote}`;
  }

  /**
   * Generate helpful hints for the pattern
   */
  private generatePatternHints(patternType: string, level: number): string[] {
    const baseHints: Record<string, string[]> = {
      spiral: ['Start from outside and work inward', 'Follow the circular motion'],
      zigzag: ['Alternate direction each row', 'Look for the back-and-forth pattern'],
      maze: ['Find the longest continuous path', 'Avoid dead ends'],
      fractal: ['Look for repeating sub-patterns', 'Think recursively'],
      diamond: ['Start from corners and work toward center', 'Follow the diamond shape'],
      cross: ['Think of a plus sign pattern', 'Center is often key'],
      wave: ['Follow the wave-like motion', 'Smooth curves are key'],
      lshape: ['Look for L-shaped segments', 'Corner turns are important'],
      complex: ['Break it down into smaller sections', 'Look for patterns within patterns'],
      uturn: ['Watch for sharp direction changes', 'U-turns create the path'],
      labyrinth: ['There is only one correct path', 'Patience is key'],
      simple: ['Start simple and build up', 'Follow the basic pattern']
    };
    
    const hints = baseHints[patternType] || ['Take your time', 'Look for patterns'];
    
    // Add level-specific hints
    if (level >= 6) {
      hints.push('Pay attention to symmetry');
    }
    
    if (level >= 8) {
      hints.push('Consider rotational patterns');
    }
    
    if (level >= 10) {
      hints.push('Think about recursive structures');
    }
    
    return hints;
  }

  /**
   * Import pattern creation from existing puzzle.ts (compatibility)
   */
  private createPatternByType(gridSize: number, startRow: number, startCol: number, patternType: string): string[] {
    // This would call the existing pattern generation functions from puzzle.ts
    // For now, return a simple path (this should be replaced with actual pattern logic)
    const path: string[] = [];
    
    // Simple row-by-row pattern as fallback
    for (let row = 0; row < gridSize; row++) {
      if (row % 2 === 0) {
        // Left to right
        for (let col = 0; col < gridSize; col++) {
          path.push(`${row},${col}`);
        }
      } else {
        // Right to left
        for (let col = gridSize - 1; col >= 0; col--) {
          path.push(`${row},${col}`);
        }
      }
    }
    
    return path;
  }
}

export default PatternGenerator;