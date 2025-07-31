/**
 * InputHandler - Enhanced input validation and drawing management
 * Handles touch/mouse input with adaptive tolerance and smooth drawing
 */

export interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
}

export interface InputValidation {
  isValid: boolean;
  accuracy: number; // 0-100 percentage
  deviation: number; // Pixels off target
  message?: string;
}

export interface DrawingState {
  isDrawing: boolean;
  currentPath: string[];
  touchPoints: TouchPoint[];
  lastValidatedCell: string | null;
  totalDeviation: number;
  moveCount: number;
}

export class InputHandler {
  private tolerance: number = 20; // Pixels
  private drawingState: DrawingState;
  private smoothingBuffer: TouchPoint[] = [];
  private maxSmoothingPoints = 3;
  
  // Performance optimization
  private lastValidationTime = 0;
  private validationThrottle = 16; // ~60fps validation

  // Callbacks
  private onValidMove: ((cell: string) => void) | null = null;
  private onInvalidMove: ((reason: string) => void) | null = null;
  private onDrawingStateChange: ((state: DrawingState) => void) | null = null;

  constructor(initialTolerance: number = 20) {
    this.tolerance = initialTolerance;
    this.drawingState = {
      isDrawing: false,
      currentPath: [],
      touchPoints: [],
      lastValidatedCell: null,
      totalDeviation: 0,
      moveCount: 0
    };
  }

  /**
   * Set the input tolerance for cell detection
   */
  setTolerance(pixels: number): void {
    this.tolerance = Math.max(5, pixels); // Minimum 5px tolerance
    console.log(`🎯 InputHandler: Tolerance set to ${this.tolerance}px`);
  }

  /**
   * Start drawing from a specific cell
   */
  startDrawing(cell: string, touchPoint: TouchPoint): void {
    this.drawingState = {
      isDrawing: true,
      currentPath: [cell],
      touchPoints: [touchPoint],
      lastValidatedCell: cell,
      totalDeviation: 0,
      moveCount: 0
    };

    this.smoothingBuffer = [touchPoint];
    this.notifyStateChange();
    
    console.log(`✏️ InputHandler: Started drawing from ${cell}`);
  }

  /**
   * Continue drawing with new touch point
   */
  continueDrawing(touchPoint: TouchPoint, cellPositions: Map<string, { x: number; y: number }>): InputValidation {
    if (!this.drawingState.isDrawing) {
      return { isValid: false, accuracy: 0, deviation: 0, message: 'Not currently drawing' };
    }

    // Throttle validation for performance
    const now = Date.now();
    if (now - this.lastValidationTime < this.validationThrottle) {
      return { isValid: true, accuracy: 100, deviation: 0 };
    }
    this.lastValidationTime = now;

    // Add to smoothing buffer
    this.smoothingBuffer.push(touchPoint);
    if (this.smoothingBuffer.length > this.maxSmoothingPoints) {
      this.smoothingBuffer.shift();
    }

    // Get smoothed position
    const smoothedPoint = this.getSmoothPosition();
    this.drawingState.touchPoints.push(smoothedPoint);

    // Find nearest cell
    const nearestCell = this.findNearestCell(smoothedPoint, cellPositions);
    if (!nearestCell) {
      return { isValid: false, accuracy: 0, deviation: Infinity, message: 'No cell found' };
    }

    // Validate the move
    const validation = this.validateMove(nearestCell.cell, nearestCell.distance, cellPositions);
    
    if (validation.isValid && nearestCell.cell !== this.drawingState.lastValidatedCell) {
      this.addValidMove(nearestCell.cell);
      this.drawingState.totalDeviation += nearestCell.distance;
      this.drawingState.moveCount++;
    }

    this.notifyStateChange();
    return validation;
  }

  /**
   * Stop drawing and return final path
   */
  stopDrawing(): string[] {
    const finalPath = [...this.drawingState.currentPath];
    
    this.drawingState.isDrawing = false;
    this.smoothingBuffer = [];
    this.notifyStateChange();
    
    console.log(`🏁 InputHandler: Stopped drawing. Final path: ${finalPath.length} cells`);
    return finalPath;
  }

  /**
   * Get smoothed touch position from buffer
   */
  private getSmoothPosition(): TouchPoint {
    if (this.smoothingBuffer.length === 1) {
      return this.smoothingBuffer[0];
    }

    // Weighted average with more weight on recent points
    let totalX = 0;
    let totalY = 0;
    let totalWeight = 0;

    for (let i = 0; i < this.smoothingBuffer.length; i++) {
      const weight = i + 1; // Later points get more weight
      const point = this.smoothingBuffer[i];
      
      totalX += point.x * weight;
      totalY += point.y * weight;
      totalWeight += weight;
    }

    return {
      x: totalX / totalWeight,
      y: totalY / totalWeight,
      timestamp: Date.now()
    };
  }

  /**
   * Find the nearest cell to a touch point
   */
  private findNearestCell(
    touchPoint: TouchPoint, 
    cellPositions: Map<string, { x: number; y: number }>
  ): { cell: string; distance: number } | null {
    let nearestCell: string | null = null;
    let minDistance = Infinity;

    for (const [cell, position] of cellPositions) {
      const distance = Math.sqrt(
        Math.pow(touchPoint.x - position.x, 2) + 
        Math.pow(touchPoint.y - position.y, 2)
      );

      if (distance < minDistance && distance <= this.tolerance) {
        minDistance = distance;
        nearestCell = cell;
      }
    }

    return nearestCell ? { cell: nearestCell, distance: minDistance } : null;
  }

  /**
   * Validate if a move to a new cell is legal
   */
  private validateMove(
    targetCell: string, 
    distance: number, 
    cellPositions: Map<string, { x: number; y: number }>
  ): InputValidation {
    const lastCell = this.drawingState.lastValidatedCell;
    
    // Check if cell is already in path
    if (this.drawingState.currentPath.includes(targetCell)) {
      return {
        isValid: false,
        accuracy: 0,
        deviation: distance,
        message: 'Cell already visited'
      };
    }

    // Check adjacency if not the first cell
    if (lastCell && !this.areAdjacent(lastCell, targetCell)) {
      return {
        isValid: false,
        accuracy: 0,
        deviation: distance,
        message: 'Cells must be adjacent'
      };
    }

    // Check if within tolerance
    if (distance > this.tolerance) {
      return {
        isValid: false,
        accuracy: 0,
        deviation: distance,
        message: `Outside tolerance (${distance.toFixed(1)}px > ${this.tolerance}px)`
      };
    }

    // Calculate accuracy based on how close to cell center
    const accuracy = Math.max(0, Math.min(100, 100 - (distance / this.tolerance) * 100));

    return {
      isValid: true,
      accuracy,
      deviation: distance
    };
  }

  /**
   * Check if two cells are adjacent (horizontal or vertical only)
   */
  private areAdjacent(cell1: string, cell2: string): boolean {
    const [row1, col1] = cell1.split(',').map(Number);
    const [row2, col2] = cell2.split(',').map(Number);

    const rowDiff = Math.abs(row2 - row1);
    const colDiff = Math.abs(col2 - col1);

    return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
  }

  /**
   * Add a valid move to the current path
   */
  private addValidMove(cell: string): void {
    this.drawingState.currentPath.push(cell);
    this.drawingState.lastValidatedCell = cell;
    
    if (this.onValidMove) {
      this.onValidMove(cell);
    }
  }

  /**
   * Calculate overall path accuracy
   */
  calculatePathAccuracy(): number {
    if (this.drawingState.moveCount === 0) return 100;
    
    const averageDeviation = this.drawingState.totalDeviation / this.drawingState.moveCount;
    const accuracy = Math.max(0, Math.min(100, 100 - (averageDeviation / this.tolerance) * 100));
    
    return Math.round(accuracy);
  }

  /**
   * Get current drawing state
   */
  getDrawingState(): DrawingState {
    return { ...this.drawingState };
  }

  /**
   * Reset drawing state
   */
  reset(): void {
    this.drawingState = {
      isDrawing: false,
      currentPath: [],
      touchPoints: [],
      lastValidatedCell: null,
      totalDeviation: 0,
      moveCount: 0
    };
    this.smoothingBuffer = [];
    this.notifyStateChange();
  }

  /**
   * Set callback functions
   */
  setCallbacks(
    onValidMove: (cell: string) => void,
    onInvalidMove: (reason: string) => void,
    onDrawingStateChange: (state: DrawingState) => void
  ): void {
    this.onValidMove = onValidMove;
    this.onInvalidMove = onInvalidMove;
    this.onDrawingStateChange = onDrawingStateChange;
  }

  /**
   * Notify state change to callback
   */
  private notifyStateChange(): void {
    if (this.onDrawingStateChange) {
      this.onDrawingStateChange(this.getDrawingState());
    }
  }

  /**
   * Enable haptic feedback for mobile devices
   */
  triggerHapticFeedback(type: 'light' | 'medium' | 'heavy' = 'light'): void {
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30]
      };
      
      navigator.vibrate(patterns[type]);
    }
  }

  /**
   * Adaptive tolerance based on device and user performance
   */
  adaptTolerance(userAccuracy: number, deviceType: 'mobile' | 'desktop' = 'mobile'): void {
    const baseTolerance = deviceType === 'mobile' ? 25 : 15;
    
    // Increase tolerance for users with lower accuracy
    if (userAccuracy < 70) {
      this.setTolerance(baseTolerance * 1.2);
    } else if (userAccuracy > 90) {
      this.setTolerance(baseTolerance * 0.8);
    } else {
      this.setTolerance(baseTolerance);
    }
  }

  /**
   * Get performance metrics for analytics
   */
  getPerformanceMetrics(): {
    averageAccuracy: number;
    totalDeviation: number;
    moveCount: number;
    averageDeviation: number;
  } {
    const averageDeviation = this.drawingState.moveCount > 0 ? 
      this.drawingState.totalDeviation / this.drawingState.moveCount : 0;
    
    return {
      averageAccuracy: this.calculatePathAccuracy(),
      totalDeviation: this.drawingState.totalDeviation,
      moveCount: this.drawingState.moveCount,
      averageDeviation
    };
  }
}

export default InputHandler;