import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { COMPLEXITY_LEVELS, generateRandomDotsWithSolution } from '../data/puzzle';
import { ClockIcon } from './icons/ClockIcon';
import { ReplayIcon } from './icons/ReplayIcon';
import { useFBInstant } from '../hooks/useFBInstant';
import { shouldReduceAnimations, getPerformanceMode } from '../utils/mobileDetection';

type Path = { from: number; to: number; cells: string[] };

const GAME_STATE = {
  IDLE: 'idle',
  PLAYING: 'playing',
  WON: 'won',
};

interface PointEvent {
  clientX: number;
  clientY: number;
}

export const PuzzleGame: React.FC = () => {
  // Performance optimization settings
  const reducedAnimations = shouldReduceAnimations();
  const performanceMode = getPerformanceMode();
  
  // Performance refs for throttling updates and caching
  const lastUpdateRef = useRef(0);
  const updateThrottle = performanceMode === 'low' ? 100 : performanceMode === 'medium' ? 66 : 33;
  const svgRectCacheRef = useRef<{ rect: DOMRect; timestamp: number } | null>(null);
  const RECT_CACHE_DURATION = 100; // Cache getBoundingClientRect for 100ms
  
  // Facebook Instant Games integration
  const [fbState, fbActions] = useFBInstant();
  
  const [gameState, setGameState] = useState(GAME_STATE.IDLE);
  const [paths, setPaths] = useState<Path[]>([]);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [cursorPos, setCursorPos] = useState<{ x: number, y: number } | null>(null);
  const [timer, setTimer] = useState(0);
  const [complexityLevel, setComplexityLevel] = useState(0);
  const [puzzleId, setPuzzleId] = useState(0); // Add unique puzzle ID to force re-renders
  
  // Initialize puzzle with solution
  const [initialPuzzleState] = useState(() => generateRandomDotsWithSolution(COMPLEXITY_LEVELS[0]));
  
  const [puzzleDots, setPuzzleDots] = useState(() => {
    console.log('Initial puzzle generation:', {
      complexityLevel: 0,
      complexity: COMPLEXITY_LEVELS[0],
      generatedDots: initialPuzzleState.dots,
      solution: initialPuzzleState.solution,
      expectedDots: COMPLEXITY_LEVELS[0].numDots,
      actualDots: initialPuzzleState.dots.length
    });
    return initialPuzzleState.dots;
  });
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const [showTip, setShowTip] = useState(false);
  const [solutionPath, setSolutionPath] = useState<string[]>([]);
  const [validatedSolution, setValidatedSolution] = useState<string[]>(initialPuzzleState.solution); // Store the validated solution from puzzle generation
  const [pathHistory, setPathHistory] = useState<Path[][]>([]); // Store history of path states for undo
  const [redoHistory, setRedoHistory] = useState<Path[][]>([]); // Store history of path states for redo
  const svgRef = useRef<SVGSVGElement>(null);

  const currentComplexity = COMPLEXITY_LEVELS[complexityLevel];
  const totalCells = currentComplexity.gridSize * currentComplexity.gridSize;
  const occupiedCells = useMemo(() => new Set(paths.flatMap(p => p.cells)), [paths]);

  useEffect(() => {
    let interval: number;
    if (gameState === GAME_STATE.PLAYING) {
      interval = window.setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameState]);

  const resetGame = useCallback(() => {
    console.log('🔄 RESET: Generating new puzzle...');
    
    // Generate NEW random dots WITH validated solution
    const puzzleResult = generateRandomDotsWithSolution(currentComplexity);
    console.log('🔄 RESET: Generated puzzle:', puzzleResult);
    
    // Set the state
    setPaths([]);
    setCurrentPath([]);
    setIsDrawing(false);
    setCursorPos(null);
    setTimer(0);
    setGameState(GAME_STATE.IDLE);
    setShowTip(false);
    setSolutionPath([]);
    setValidatedSolution(puzzleResult.solution); // Store the EXACT validated solution
    setPathHistory([]); // Clear undo history
    setRedoHistory([]); // Clear redo history
    setPuzzleDots(puzzleResult.dots); // Use the validated dots
    setPuzzleId(prev => prev + 1); // Force re-render with new puzzle ID
    
    console.log('🔄 RESET: State updated with new dots');
  }, [currentComplexity]);

  const showNotification = useCallback((message: string, type: 'success' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000); // Auto-hide after 3 seconds
  }, []);

  // Save current state to history (called before making changes)
  const saveToHistory = useCallback(() => {
    setPathHistory(prev => [...prev, [...paths]]);
    setRedoHistory([]); // Clear redo history when new action is taken
    console.log('Saved state to history. Paths count:', paths.length);
  }, [paths]);

  const undoLastPath = useCallback(() => {
    if (pathHistory.length === 0) {
      showNotification('Nothing to undo!', 'info');
      return;
    }

    console.log('Undoing. History length:', pathHistory.length, 'Current paths:', paths.length);

    // Get the previous state
    const previousState = pathHistory[pathHistory.length - 1];
    
    // Save current state to redo history
    setRedoHistory(prev => [...prev, [...paths]]);
    
    // Remove last item from undo history
    setPathHistory(prev => prev.slice(0, -1));
    
    // Restore previous state
    setPaths(previousState);
    
    // Clear current drawing path
    setCurrentPath([]);
    setIsDrawing(false);
    setCursorPos(null);
    
    // Show notification
    showNotification(`🔙 Undid last action`, 'info');
    
    console.log('Undid path. Restored to paths count:', previousState.length);
  }, [pathHistory, paths, showNotification]);

  const redoLastPath = useCallback(() => {
    if (redoHistory.length === 0) {
      showNotification('Nothing to redo!', 'info');
      return;
    }

    console.log('Redoing. Redo history length:', redoHistory.length, 'Current paths:', paths.length);

    // Get the next state
    const nextState = redoHistory[redoHistory.length - 1];
    
    // Save current state to undo history
    setPathHistory(prev => [...prev, [...paths]]);
    
    // Remove last item from redo history
    setRedoHistory(prev => prev.slice(0, -1));
    
    // Restore next state
    setPaths(nextState);
    
    // Clear current drawing path
    setCurrentPath([]);
    setIsDrawing(false);
    setCursorPos(null);
    
    showNotification(`🔄 Redid last action`, 'info');
    
    console.log('Redid path. Restored to paths count:', nextState.length);
  }, [redoHistory, paths, showNotification]);

  // Helper function to find the next dot in the solution path
  const findNextDotInSolution = useCallback((solution: string[], currentIndex: number, dots: any[]) => {
    // Create a map of dot positions
    const dotPositions = new Set<string>();
    dots.forEach(dot => {
      dotPositions.add(`${dot.row},${dot.col}`);
    });
    
    // Find the next cell in the solution that contains a dot
    for (let i = currentIndex + 1; i < solution.length; i++) {
      if (dotPositions.has(solution[i])) {
        return i;
      }
    }
    
    return -1; // No more dots found
  }, []);

  const showTipHandler = useCallback(() => {
    if (gameState === GAME_STATE.WON) return;
    
    console.log('💡 TIP REQUESTED: Using validated solution...');
    console.log('Validated solution length:', validatedSolution?.length || 0);
    console.log('Current paths:', paths.length);
    console.log('Current path length:', currentPath.length);
    
    fbActions.logEvent('tip_requested', 1, { stage: complexityLevel + 1 });
    
    // Use the VALIDATED solution from puzzle generation
    if (!validatedSolution || validatedSolution.length === 0) {
      console.log('❌ TIP FAILED: No validated solution available');
      showNotification('🚨 No solution available! Click "New" to generate a new puzzle.', 'info');
      return;
    }
    
    const fullSolution = validatedSolution;
    const totalCells = currentComplexity.gridSize * currentComplexity.gridSize;
    
    console.log('✅ TIP SUCCESS: Using validated solution with', fullSolution.length, 'cells');
    console.log('Expected total cells:', totalCells);
    
    if (fullSolution.length !== totalCells) {
      console.log('⚠️ WARNING: Solution length mismatch!');
      showNotification('⚠️ Puzzle solution issue! Click "New" to generate a fresh puzzle.', 'info');
      return;
    }
    
    // Calculate what cells are already filled by current paths
    const filledCells = new Set<string>();
    paths.forEach(path => {
      path.cells.forEach(cell => filledCells.add(cell));
    });
    currentPath.forEach(cell => filledCells.add(cell));
    
    console.log('Already filled cells count:', filledCells.size);
    
    // Find where we are in the solution and show meaningful segments
    let tipPath: string[] = [];
    let startIndex = 0;
    
    if (filledCells.size === 0) {
      // No progress yet - show from start to first or second dot
      const firstDot = puzzleDots.find(dot => dot.num === 1);
      const secondDot = puzzleDots.find(dot => dot.num === 2);
      
      if (firstDot && secondDot) {
        const firstDotCell = `${firstDot.row},${firstDot.col}`;
        const secondDotCell = `${secondDot.row},${secondDot.col}`;
        const firstDotIndex = fullSolution.indexOf(firstDotCell);
        const secondDotIndex = fullSolution.indexOf(secondDotCell);
        
        if (firstDotIndex >= 0 && secondDotIndex > firstDotIndex) {
          // Show path to second dot plus some more
          const endIndex = Math.min(secondDotIndex + 8, fullSolution.length);
          tipPath = fullSolution.slice(0, endIndex);
          console.log('🔰 No progress - showing path to second dot + more:', tipPath.length, 'cells');
        }
      }
      
      if (tipPath.length === 0) {
        // Fallback: show first 15-20 steps
        tipPath = fullSolution.slice(0, Math.min(20, fullSolution.length));
        console.log('🔰 No progress - showing first steps:', tipPath.length, 'cells');
      }
    } else {
      // Find the furthest point in the solution that matches our progress
      let lastMatchIndex = -1;
      for (let i = 0; i < fullSolution.length; i++) {
        if (filledCells.has(fullSolution[i])) {
          lastMatchIndex = i;
        }
      }
      
      if (lastMatchIndex >= 0) {
        console.log('📍 Found progress up to solution index:', lastMatchIndex);
        
        // Find the next dot we need to reach
        const nextDotIndex = findNextDotInSolution(fullSolution, lastMatchIndex, puzzleDots);
        
        if (nextDotIndex >= 0) {
          // Show path from current position to next dot plus more steps beyond
          startIndex = lastMatchIndex + 1;
          const endIndex = Math.min(nextDotIndex + 15, fullSolution.length);
          tipPath = fullSolution.slice(startIndex, endIndex);
          console.log(`📍 Showing path from index ${startIndex} to next dot + more:`, tipPath.length, 'cells');
        } else {
          // No more dots - show remaining path for completion
          startIndex = lastMatchIndex + 1;
          const endIndex = Math.min(startIndex + 25, fullSolution.length);
          tipPath = fullSolution.slice(startIndex, endIndex);
          console.log(`📍 Showing final completion path:`, tipPath.length, 'cells');
        }
      } else {
        // Current path doesn't match solution - show corrective guidance
        const firstDot = puzzleDots.find(dot => dot.num === 1);
        if (firstDot) {
          const firstDotCell = `${firstDot.row},${firstDot.col}`;
          const firstDotIndex = fullSolution.indexOf(firstDotCell);
          if (firstDotIndex >= 0) {
            tipPath = fullSolution.slice(0, Math.min(firstDotIndex + 12, fullSolution.length));
            console.log('⚠️ Path mismatch - showing correct path:', tipPath.length, 'cells');
          }
        }
      }
    }
    
    if (tipPath.length === 0) {
      console.log('🎉 TIP: You\'re already at the end or very close!');
      showNotification('🎉 You\'re very close to completion!', 'info');
      return;
    }
    
    // Show the tip with enhanced messaging
    setSolutionPath(tipPath);
    setShowTip(true);
    
    // Create a more informative tip message
    let tipMessage = '💡 Tip: Follow the yellow path!';
    if (filledCells.size === 0) {
      tipMessage = `💡 Tip: Start from dot 1 and follow the yellow path to dot 2!`;
    } else {
      const nextDotNum = paths.length + 2; // Next dot we need to reach
      if (nextDotNum <= puzzleDots.length) {
        tipMessage = `💡 Tip: Follow the yellow path to reach dot ${nextDotNum}!`;
      } else {
        tipMessage = `💡 Tip: Follow the yellow path to complete the puzzle!`;
      }
    }
    
    showNotification(tipMessage, 'info');
    
    console.log('💡 TIP ACTIVE: Solution path set, showing', tipPath.length, 'cells');
    console.log('💡 First 3 cells:', tipPath.slice(0, 3));
    console.log('💡 Last 3 cells:', tipPath.slice(-3));
    
    // Hide tip after 15 seconds (increased for better usability)
    setTimeout(() => {
      console.log('💡 TIP TIMEOUT: Hiding tip after 15 seconds');
      setShowTip(false);
      setSolutionPath([]);
    }, 15000);
  }, [gameState, validatedSolution, paths, currentPath, fbActions, complexityLevel, showNotification, puzzleDots, findNextDotInSolution, currentComplexity]);

  const advanceToNextLevel = useCallback(() => {
    const nextLevel = Math.min(complexityLevel + 1, COMPLEXITY_LEVELS.length - 1);
    const newComplexity = COMPLEXITY_LEVELS[nextLevel];
    
    console.log('Advancing from level', complexityLevel, 'to level', nextLevel);
    console.log('Current stage:', complexityLevel + 1, 'Next stage:', nextLevel + 1);
    
    // Show notification with a brief delay before advancing
    showNotification(`🎉 Stage ${complexityLevel + 1} Complete! Moving to Stage ${nextLevel + 1}`, 'success');
    
    setTimeout(() => {
      console.log('Setting complexity level to:', nextLevel);
      console.log('Setting stage number to:', nextLevel + 1);
      
      setComplexityLevel(nextLevel);
      const puzzleResult = generateRandomDotsWithSolution(newComplexity);
      console.log('Generated new puzzle for level', nextLevel, ':', {
        complexity: newComplexity,
        generatedDots: puzzleResult.dots,
        solution: puzzleResult.solution,
        expectedDots: newComplexity.numDots,
        actualDots: puzzleResult.dots.length
      });
      setPuzzleDots(puzzleResult.dots);
      setValidatedSolution(puzzleResult.solution); // Store the validated solution
      setPuzzleId(prev => prev + 1); // Force re-render with new puzzle ID
      
      // Reset game state manually since resetGame depends on currentComplexity
      setPaths([]);
      setCurrentPath([]);
      setIsDrawing(false);
      setCursorPos(null);
      setTimer(0);
      setGameState(GAME_STATE.IDLE);
      setShowTip(false);
      setSolutionPath([]);
      setPathHistory([]); // Clear undo history
      
      console.log('Advanced to next level successfully');
    }, 1000); // 1 second delay to show notification
  }, [complexityLevel, showNotification]);

  const startNewGame = useCallback(() => {
    console.log('🎲 NEW GAME: Starting for level', complexityLevel);
    
    fbActions.logEvent('new_game_started', 1, { stage: complexityLevel + 1 });
    
    // Generate NEW random dots WITH validated solution
    const puzzleResult = generateRandomDotsWithSolution(currentComplexity);
    console.log('🎲 NEW GAME: Generated puzzle:', puzzleResult);
    console.log('🎲 NEW GAME: Dot positions:', puzzleResult.dots.map(d => `${d.num}: (${d.row},${d.col})`));
    console.log('🎲 NEW GAME: Solution length:', puzzleResult.solution.length);
    
    // Set the puzzle dots FIRST, then reset the game
    setPuzzleDots(puzzleResult.dots);
    setValidatedSolution(puzzleResult.solution); // Store the validated solution
    setPuzzleId(prev => prev + 1); // Force re-render with new puzzle ID
    
    // Clear all game state
    setPaths([]);
    setCurrentPath([]);
    setIsDrawing(false);
    setCursorPos(null);
    setTimer(0);
    setGameState(GAME_STATE.IDLE);
    setShowTip(false);
    setSolutionPath([]);
    setPathHistory([]);
    setRedoHistory([]);
    
    showNotification(`🎲 New Stage ${complexityLevel + 1} puzzle generated!`, 'info');
    console.log('🎲 NEW GAME: Complete!');
  }, [currentComplexity, complexityLevel, showNotification, fbActions]);

  // Optimized coordinate calculation with caching
  const getCachedSVGRect = useCallback(() => {
    if (!svgRef.current) return null;
    
    const now = performance.now();
    const cache = svgRectCacheRef.current;
    
    // Use cached rect if it's fresh (within RECT_CACHE_DURATION)
    if (cache && (now - cache.timestamp) < RECT_CACHE_DURATION) {
      return cache.rect;
    }
    
    // Get fresh rect and cache it
    const rect = svgRef.current.getBoundingClientRect();
    svgRectCacheRef.current = { rect, timestamp: now };
    return rect;
  }, []);

  const getCellFromEvent = useCallback((e: PointEvent): string | null => {
    if (!svgRef.current) return null;
    
    try {
      const rect = getCachedSVGRect();
      if (!rect) return null;
      
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Convert screen coordinates to SVG coordinates
      const svgWidth = currentComplexity.gridSize * currentComplexity.cellSize;
      const svgHeight = currentComplexity.gridSize * currentComplexity.cellSize;
      
      // Scale coordinates from screen space to SVG space
      const svgX = (x / rect.width) * svgWidth;
      const svgY = (y / rect.height) * svgHeight;
      
      // Convert to grid coordinates
      const col = Math.floor(svgX / currentComplexity.cellSize);
      const row = Math.floor(svgY / currentComplexity.cellSize);
      
      // Check bounds
      if (col < 0 || col >= currentComplexity.gridSize || row < 0 || row >= currentComplexity.gridSize) {
        return null;
      }
      
      return `${row},${col}`;
    } catch (error) {
      console.warn('Error getting cell from event:', error);
      return null;
    }
  }, [currentComplexity, getCachedSVGRect]);

  // Memoized cell center calculation for better performance
  const getCenterOfCell = useCallback((cell: string): { x: number, y: number } => {
    const [row, col] = cell.split(',').map(Number);
    return {
      x: col * currentComplexity.cellSize + currentComplexity.cellSize / 2,
      y: row * currentComplexity.cellSize + currentComplexity.cellSize / 2,
    };
  }, [currentComplexity.cellSize]);

  const handleInteractionStart = useCallback((e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    e.preventDefault(); // Prevent default browser behavior
    e.stopPropagation(); // Stop event bubbling
    
    if (e.type === 'mousedown' && (e as React.MouseEvent).button !== 0) return; // Only main button
    if (gameState === GAME_STATE.WON) return;
    
    const point = 'touches' in e ? e.touches[0] : e;
    if (!point) return;

    if (gameState === GAME_STATE.IDLE) {
      setGameState(GAME_STATE.PLAYING);
    }
    
    const cell = getCellFromEvent(point);
    if (!cell) return;

    // Rule 1: Start at cell with number 1 (and continue in order)
    const nextDotNumber = paths.length + 1;
    const startDot = puzzleDots.find(d => d.num === nextDotNumber);
    if (!startDot) return;

    const startDotCell = `${startDot.row},${startDot.col}`;
    
    // If we have a current path, check if we're clicking to continue drawing
    if (currentPath.length > 0) {
      const lastCell = currentPath[currentPath.length - 1];
      if (cell === lastCell) {
        console.log('Continuing from last cell of current path');
        // Clear tip when actually starting to draw
        if (showTip) {
          setShowTip(false);
          setSolutionPath([]);
          console.log('Cleared tip on drawing start');
        }
        setIsDrawing(true);
        return;
      }
      
      // Check if clicking adjacent to last cell to continue path
      const [lastRow, lastCol] = lastCell.split(',').map(Number);
      const [clickRow, clickCol] = cell.split(',').map(Number);
      const rowDiff = Math.abs(lastRow - clickRow);
      const colDiff = Math.abs(lastCol - clickCol);
      
      // Rule 2: Connect adjacent cells (no diagonals)
      const isAdjacent = (rowDiff === 0 && colDiff === 1) || (rowDiff === 1 && colDiff === 0);
      
      // Rule 5: Path cannot cross itself
      if (isAdjacent && !currentPath.includes(cell) && !occupiedCells.has(cell)) {
        console.log('Continuing path from adjacent cell');
        // Clear tip when actually starting to draw
        if (showTip) {
          setShowTip(false);
          setSolutionPath([]);
          console.log('Cleared tip on drawing continuation');
        }
        setIsDrawing(true);
        setCurrentPath(prev => [...prev, cell]);
        return;
      }
    }
    
    // For new paths, ensure we start at the next dot (Rule 3: ascending order)
    if (cell === startDotCell) {
      console.log('Starting to draw from dot', nextDotNumber, 'at cell', cell);
      // Clear tip when actually starting to draw
      if (showTip) {
        setShowTip(false);
        setSolutionPath([]);
        console.log('Cleared tip on new path start');
      }
      // Clear redo history when starting a new action
      setRedoHistory([]);
      
      // Immediately set up drawing state for better responsiveness
      setCurrentPath([startDotCell]); // Always start with the dot cell
      setIsDrawing(true);
      
      // DEBUG: Log drawing start
      console.log('🎯 Drawing STARTED from dot', nextDotNumber, 'at cell', startDotCell, 'isDrawing:', true);
      
      // Set initial cursor position for immediate feedback
      if (svgRef.current) {
        try {
          const rect = svgRef.current.getBoundingClientRect();
          const x = point.clientX - rect.left;
          const y = point.clientY - rect.top;
          
          const svgWidth = currentComplexity.gridSize * currentComplexity.cellSize;
          const svgHeight = currentComplexity.gridSize * currentComplexity.cellSize;
          
          const svgX = (x / rect.width) * svgWidth;
          const svgY = (y / rect.height) * svgHeight;
          
          setCursorPos({ x: svgX, y: svgY });
          console.log('🎯 Initial cursor position set:', { svgX, svgY });
        } catch (error) {
          console.warn('Error setting initial cursor position:', error);
        }
      }
    } else {
      console.log('Must start from dot', nextDotNumber, 'at cell', startDotCell);
      showNotification(`Start from dot ${nextDotNumber} or continue your current path`, 'info');
    }
  }, [gameState, paths, puzzleDots, getCellFromEvent, occupiedCells, showTip, showNotification, currentPath]);
  
  const handleInteractionMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDrawing) return;
    
    // Throttle updates for better performance on mobile devices
    const now = performance.now();
    if (now - lastUpdateRef.current < updateThrottle) return;
    lastUpdateRef.current = now;
    
    // Only prevent default for mouse events, not touch events
    if (e.type === 'mousemove' && e.cancelable) {
      e.preventDefault();
    }

    const point = 'touches' in e ? e.touches[0] : e;
    if (!point) return;

    // CONTINUOUS DRAWING: Always update cursor position for smooth pen-like drawing
    // Update immediately for responsive drawing
    if (svgRef.current) {
      try {
        const rect = getCachedSVGRect();
        
        // Ensure we have valid dimensions
        if (!rect || rect.width === 0 || rect.height === 0) {
          return;
        }
        
        const x = point.clientX - rect.left;
        const y = point.clientY - rect.top;
        
        // Convert screen coordinates to SVG coordinates
        const svgWidth = currentComplexity.gridSize * currentComplexity.cellSize;
        const svgHeight = currentComplexity.gridSize * currentComplexity.cellSize;
        
        // Scale coordinates from screen space to SVG space
        const svgX = (x / rect.width) * svgWidth;
        const svgY = (y / rect.height) * svgHeight;
        
        // Validate coordinates are reasonable
        if (isNaN(svgX) || isNaN(svgY)) {
          return;
        }
        
        // IMMEDIATELY update cursor position for continuous line drawing
        setCursorPos({ x: svgX, y: svgY });
      } catch (error) {
        console.warn('Error setting cursor position:', error);
        return; // Exit early if coordinate calculation fails
      }
    }
    
    // SEPARATE LOGIC: Handle cell-based path updates only when entering new valid cells
    if (currentPath.length === 0) return; // Need at least starting cell
    
    const cell = getCellFromEvent(point);
    if (!cell) return; // Cursor might be outside grid
    
    const lastCellInPath = currentPath[currentPath.length - 1];
    if (cell === lastCellInPath) return; // Still in same cell

    // Rule 2: Connect adjacent cells (no diagonals) first
    const [lastRow, lastCol] = lastCellInPath.split(',').map(Number);
    const [currRow, currCol] = cell.split(',').map(Number);
    const rowDiff = Math.abs(lastRow - currRow);
    const colDiff = Math.abs(lastCol - currCol);
    
    // Ensure only horizontal or vertical movement
    const isHorizontal = (rowDiff === 0 && colDiff === 1);
    const isVertical = (rowDiff === 1 && colDiff === 0);
    const isAdjacent = isHorizontal || isVertical;

    if (!isAdjacent) {
      return; // Don't add non-adjacent cells, but continue showing cursor line
    }

    // Rule 5: Path cannot cross itself
    if (currentPath.includes(cell)) {
      return;
    }

    // Check if cell is already occupied by completed paths
    const isOccupiedByCompletedPath = occupiedCells.has(cell);
    if (isOccupiedByCompletedPath) {
      return;
    }

    // Add the cell to the current path
    const newCurrentPath = [...currentPath, cell];
    setCurrentPath(newCurrentPath);
    
    // Clear tip when actually adding to path (making real progress)
    if (showTip || solutionPath.length > 0) {
      setShowTip(false);
      setSolutionPath([]);
    }

    // Check if we've reached a numbered dot (Rule 3: Visit numbered cells in ascending order)
    const currentDotNum = paths.length + 1;
    const nextDotNum = currentDotNum + 1;
    const nextDot = puzzleDots.find(d => d.num === nextDotNum);
    
    // If we're on a dot cell and it's the next dot in sequence
    if (nextDot && cell === `${nextDot.row},${nextDot.col}`) {
      console.log(`Reached dot ${nextDotNum} at cell ${cell}`);
      
      // Save current state to history before adding new path
      saveToHistory();
      
      // Complete the current path to this dot
      const newPath: Path = { from: currentDotNum, to: nextDotNum, cells: [...newCurrentPath] };
      const newPaths = [...paths, newPath];
      setPaths(newPaths);
      
      // Check if this was the last dot AND if all cells are filled
      const isLastDot = nextDotNum === puzzleDots.length;
      const allCellsAfterPath = new Set(newPaths.flatMap(p => p.cells));
      const allCellsFilled = allCellsAfterPath.size === totalCells;
      
      console.log('=== WIN CONDITION CHECK ===');
      console.log('Connected to dot:', nextDotNum);
      console.log('Total dots in puzzle:', puzzleDots.length);
      console.log('Is last dot:', isLastDot);
      console.log('Cells filled after this path:', allCellsAfterPath.size);
      console.log('Total cells in grid:', totalCells);
      console.log('All cells filled:', allCellsFilled);
      console.log('Should trigger win:', isLastDot && allCellsFilled);
      console.log('========================');
      
      if (isLastDot && allCellsFilled) {
        console.log('🎉 WIN CONDITION TRIGGERED! All README.md rules satisfied');
        
        // Log completion event to Facebook
        fbActions.logEvent('stage_completed', complexityLevel + 1, {
          stage: complexityLevel + 1,
          time: timer,
          paths: newPaths.length,
          complexity: currentComplexity.description
        });
        
        // Submit score to leaderboard if in Facebook
        if (fbState.isInitialized) {
          const score = Math.max(1, 10000 - timer * 10);
          fbActions.submitScore('main_leaderboard', score, {
            stage: complexityLevel + 1,
            time: timer,
            complexity: currentComplexity.description
          });
        }
        
        showNotification(`🎉 Puzzle Solved! Stage ${complexityLevel + 1} Complete!`, 'success');
        setGameState(GAME_STATE.WON);
        setCurrentPath([]);
        setIsDrawing(false);
        setCursorPos(null);
        return;
      }
      
      // Continue drawing from this dot if there are more dots
      if (nextDotNum < puzzleDots.length) {
        // Rule 3: Visit numbered cells in ascending order
        // Continue the path from this dot to maintain visual continuity
        console.log('Continuing to draw from dot', nextDotNum, 'at cell', cell);
        setCurrentPath([cell]); // Start next segment from this dot
      } else {
        console.log('All dots connected! Finishing drawing.');
        setCurrentPath([]);
        setIsDrawing(false);
        setCursorPos(null);
      }
      return;
    }

    // Handle backtracking (moving back one cell) - more reliable logic
    const cellIndexInPath = currentPath.indexOf(cell);
    if (cellIndexInPath >= 0 && cellIndexInPath < currentPath.length - 1) {
      // User is backtracking to a previous cell in the path
      setCurrentPath(prev => prev.slice(0, cellIndexInPath + 1));
      return;
    }
  }, [
    updateThrottle,
    getCachedSVGRect,
    currentPath, 
    occupiedCells, 
    getCellFromEvent, 
    paths, 
    puzzleDots, 
    showTip, 
    setSolutionPath, 
    setShowTip, 
    saveToHistory, 
    currentComplexity,
    totalCells,
    fbActions,
    complexityLevel,
    timer,
    fbState.isInitialized,
    showNotification,
    setGameState,
    setCurrentPath,
    setIsDrawing,
    setCursorPos,
    setPaths,
    solutionPath
  ]);

  const handleInteractionEnd = useCallback(() => {
    if (!isDrawing) return;
    
    setIsDrawing(false);
    setCursorPos(null);
    
    // Keep the current path for visual continuity and to allow continuing later
    // Don't clear currentPath - this maintains the partial path on screen
    console.log('Drawing ended, keeping current path for continuity');
  }, [isDrawing]);

  useEffect(() => {
    // Use passive events for better scroll performance on mobile
    const options = { passive: true };
    window.addEventListener('mousemove', handleInteractionMove, options);
    window.addEventListener('touchmove', handleInteractionMove, options);
    window.addEventListener('mouseup', handleInteractionEnd);
    window.addEventListener('touchend', handleInteractionEnd);
    return () => {
      window.removeEventListener('mousemove', handleInteractionMove);
      window.removeEventListener('touchmove', handleInteractionMove);
      window.removeEventListener('mouseup', handleInteractionEnd);
      window.removeEventListener('touchend', handleInteractionEnd);
    };
  }, [handleInteractionMove, handleInteractionEnd]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState === GAME_STATE.WON) return;
      
      // Ctrl+Z for undo
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undoLastPath();
      }
      
      // Ctrl+Y or Ctrl+Shift+Z for redo
      if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'Z')) {
        e.preventDefault();
        redoLastPath();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameState, undoLastPath, redoLastPath]);

  // Memoized path data generation for better performance
  const getPathData = useCallback((cells: string[]) => {
    if (cells.length === 0) return "";
    return cells.map((cell, i) => {
        const { x, y } = getCenterOfCell(cell);
        return (i === 0 ? 'M' : 'L') + `${x} ${y}`;
    }).join(' ');
  }, [getCenterOfCell]);
  
  // Rule 4: Fill entire grid with one path - combine all path segments
  const allPathsData = useMemo(() => {
    // Combine all completed paths and current path into one continuous line
    const allCells: string[] = [];
    
    // Add all cells from completed paths
    paths.forEach((path, index) => {
      if (index === 0) {
        // First path includes all cells
        allCells.push(...path.cells);
      } else {
        // Subsequent paths skip the first cell (the connecting dot) to avoid duplication
        allCells.push(...path.cells.slice(1));
      }
    });
    
    // Add current path cells if any, avoiding duplication at connection point
    if (currentPath.length > 0) {
      if (paths.length > 0) {
        const lastCompletedPath = paths[paths.length - 1];
        const lastCell = lastCompletedPath.cells[lastCompletedPath.cells.length - 1];
        const firstCurrentCell = currentPath[0];
        
        if (lastCell === firstCurrentCell) {
          // Skip the first cell to avoid duplication
          allCells.push(...currentPath.slice(1));
        } else {
          allCells.push(...currentPath);
        }
      } else {
        allCells.push(...currentPath);
      }
    }
    
    return getPathData(allCells);
  }, [paths, currentPath, getPathData]);

  // Enhanced live cursor line for smooth pen-like drawing
  const cursorLineData = useMemo(() => {
    if (!isDrawing || !cursorPos) return "";
    
    if (currentPath.length === 0) {
      // If no path yet, don't show line (will start when first cell is added)
      return "";
    }
    
    // Always draw from the last cell in current path to cursor position
    const lastCell = getCenterOfCell(currentPath[currentPath.length - 1]);
    
    // Ensure we have valid coordinates
    if (!lastCell || !lastCell.x || !lastCell.y || !cursorPos.x || !cursorPos.y) {
      return "";
    }
    
    return `M ${lastCell.x} ${lastCell.y} L ${cursorPos.x} ${cursorPos.y}`;
  }, [isDrawing, cursorPos, currentPath, getCenterOfCell]);
  
  // Memoized grid lines for better performance
  const gridLines = useMemo(() => {
    return Array.from({ length: currentComplexity.gridSize + 1 }).map((_, i) => (
      <g key={i} className="text-slate-700 pointer-events-none">
        <line x1={i * currentComplexity.cellSize} y1="0" x2={i * currentComplexity.cellSize} y2={currentComplexity.gridSize * currentComplexity.cellSize} stroke="currentColor" strokeWidth="1" />
        <line x1="0" y1={i * currentComplexity.cellSize} x2={currentComplexity.gridSize * currentComplexity.cellSize} y2={i * currentComplexity.cellSize} stroke="currentColor" strokeWidth="1" />
      </g>
    ));
  }, [currentComplexity.gridSize, currentComplexity.cellSize]);

  const nextDot = puzzleDots[paths.length];

  // Memoized dots rendering for better performance
  const dotsElements = useMemo(() => {
    return puzzleDots.map(({ num, row, col }) => {
      const isConnected = occupiedCells.has(`${row},${col}`) || currentPath.includes(`${row},${col}`);
      const isNext = num === nextDot?.num;
      const isStart = num === 1;
      const isEnd = num === puzzleDots.length;
      
      return (
        <g key={`${puzzleId}-${num}`} transform={`translate(${col * currentComplexity.cellSize + currentComplexity.cellSize / 2}, ${row * currentComplexity.cellSize + currentComplexity.cellSize / 2})`}>
          {/* Special styling for start and end dots */}
          {isStart && (
            <circle r="20" fill="none" stroke="#10b981" strokeWidth="3" opacity="0.6" />
          )}
          {isEnd && (
            <circle r="20" fill="none" stroke="#ef4444" strokeWidth="3" opacity="0.6" strokeDasharray="5,5" className={reducedAnimations ? "" : "animate-pulse"} />
          )}
          
          <circle r="15" fill={isConnected ? '#0ea5e9' : '#1e293b'} className="transition-colors"/>
          
          {/* Pulsing indicator for next dot */}
          {isNext && gameState !== GAME_STATE.WON && (
            <circle r="18" fill="none" stroke="#22d3ee" strokeWidth="2" className={reducedAnimations ? "" : "animate-pulse"} />
          )}
          
          {/* Extra visual indicator for the current target dot */}
          {isNext && gameState !== GAME_STATE.WON && !isDrawing && (
            <circle r="25" fill="none" stroke="#10b981" strokeWidth="2" opacity="0.5" className={reducedAnimations ? "" : "animate-ping"} />
          )}
          
          {/* Number with special styling for start and end */}
          <text 
            textAnchor="middle" 
            dy=".3em" 
            fill={isStart ? '#10b981' : isEnd ? '#ef4444' : 'white'} 
            fontSize="16" 
            fontWeight="bold"
          >
            {num}
          </text>
          
          {/* Small indicators */}
          {isStart && (
            <text 
              textAnchor="middle" 
              dy="30" 
              fill="#10b981" 
              fontSize="10" 
              fontWeight="bold"
            >
              START
            </text>
          )}
          {isEnd && (
            <text 
              textAnchor="middle" 
              dy="30" 
              fill="#ef4444" 
              fontSize="10" 
              fontWeight="bold"
            >
              END
            </text>
          )}
        </g>
      );
    });
  }, [puzzleDots, occupiedCells, currentPath, nextDot, puzzleId, currentComplexity.cellSize, reducedAnimations, gameState, isDrawing]);

  // Debug logging for game state changes
  useEffect(() => {
    // Game state changed, can add analytics here if needed
  }, [gameState]);

  // Check for win condition when paths or currentPath changes
  useEffect(() => {
    if (gameState !== GAME_STATE.PLAYING) return;
    
    // Calculate total cells filled from completed paths only
    // (currentPath is temporary and gets cleared when a path is completed)
    const allCellsFromPaths = new Set(paths.flatMap(p => p.cells));
    
    // Win condition: all dots connected AND all cells filled
    const allDotsConnected = paths.length === puzzleDots.length - 1; // -1 because we count path segments between dots
    const allCellsFilled = allCellsFromPaths.size === totalCells;
    
    console.log('=== WIN CHECK (useEffect) ===');
    console.log('Paths completed:', paths.length);
    console.log('Expected paths:', puzzleDots.length - 1);
    console.log('All dots connected:', allDotsConnected);
    console.log('Cells filled from completed paths:', allCellsFromPaths.size, '/', totalCells);
    console.log('All cells filled:', allCellsFilled);
    console.log('Should win:', allDotsConnected && allCellsFilled);
    
    // Debug: show which cells are filled
    if (allDotsConnected && !allCellsFilled) {
      console.log('🔍 Missing cells analysis:');
      const allPossibleCells: string[] = [];
      for (let row = 0; row < currentComplexity.gridSize; row++) {
        for (let col = 0; col < currentComplexity.gridSize; col++) {
          allPossibleCells.push(`${row},${col}`);
        }
      }
      
      const missingCells = allPossibleCells.filter(cell => !allCellsFromPaths.has(cell));
      console.log('Missing cells:', missingCells);
      console.log('Filled cells:', Array.from(allCellsFromPaths).sort());
    }
    console.log('==========================');
    
    if (allDotsConnected && allCellsFilled) {
      console.log('🎉 WIN CONDITION TRIGGERED by useEffect!');
      
      // Log completion event to Facebook
      fbActions.logEvent('stage_completed', complexityLevel + 1, {
        stage: complexityLevel + 1,
        time: timer,
        paths: paths.length,
        complexity: currentComplexity.description
      });
      
      // Submit score to leaderboard if in Facebook
      if (fbState.isInitialized) {
        const score = Math.max(1, 10000 - timer * 10);
        fbActions.submitScore('main_leaderboard', score, {
          stage: complexityLevel + 1,
          time: timer,
          complexity: currentComplexity.description
        });
      }
      
      showNotification(`🎉 Puzzle Solved! Stage ${complexityLevel + 1} Complete!`, 'success');
      setGameState(GAME_STATE.WON);
      setCurrentPath([]);
      setIsDrawing(false);
      setCursorPos(null);
    }
  }, [paths, currentPath, gameState, puzzleDots.length, totalCells, complexityLevel, timer, currentComplexity, fbActions, fbState, showNotification]);

  // Test puzzle generation once on component mount  
  useEffect(() => {
    console.log('🚀 PuzzleGame component initialized');
  }, []);

  // Debug effect to log puzzle state
  useEffect(() => {
    console.log('🔍 CURRENT PUZZLE STATE:');
    console.log('Puzzle dots:', puzzleDots);
    console.log('Validated solution:', validatedSolution);
    console.log('Complexity level:', complexityLevel);
    console.log('Current complexity:', currentComplexity);
    
    if (puzzleDots.length > 0 && validatedSolution.length > 0) {
      const endDot = puzzleDots.find(d => d.num === puzzleDots.length);
      const endDotCell = endDot ? `${endDot.row},${endDot.col}` : 'NOT_FOUND';
      const solutionEndCell = validatedSolution[validatedSolution.length - 1];
      
      console.log('🎯 END DOT ANALYSIS:');
      console.log('Last dot number:', puzzleDots.length);
      console.log('Last dot position:', endDotCell);
      console.log('Solution ends at:', solutionEndCell);
      console.log('Positions match:', endDotCell === solutionEndCell ? '✅ CORRECT' : '❌ WRONG');
      
      // Check if solution visits all cells
      console.log('Solution length:', validatedSolution.length);
      console.log('Expected cells:', currentComplexity.gridSize * currentComplexity.gridSize);
      console.log('Visits all cells:', validatedSolution.length === (currentComplexity.gridSize * currentComplexity.gridSize) ? '✅' : '❌');
    }
  }, [puzzleDots, validatedSolution, complexityLevel, currentComplexity]);

  // Test function to validate current generation
  const testCurrentGeneration = useCallback(() => {
    console.log('🧪 TESTING CURRENT GENERATION...');
    
    for (let i = 0; i < Math.min(5, COMPLEXITY_LEVELS.length); i++) {
      const complexity = COMPLEXITY_LEVELS[i];
      console.log(`\n--- Testing Stage ${i + 1}: ${complexity.description} ---`);
      
      const result = generateRandomDotsWithSolution(complexity);
      
      console.log(`Generated ${result.dots.length} dots:`, result.dots.map(d => `${d.num}:(${d.row},${d.col})`));
      console.log(`Solution length: ${result.solution.length}/${complexity.gridSize * complexity.gridSize}`);
      
      if (result.solution.length === complexity.gridSize * complexity.gridSize) {
        console.log('✅ Stage', i + 1, 'generation: SUCCESS');
      } else {
        console.log('❌ Stage', i + 1, 'generation: FAILED');
      }
    }
    
    showNotification('🧪 Generation test complete! Check console for results.', 'info');
  }, [showNotification]);

  return (
    <div 
      className="w-full min-h-screen bg-gradient-main p-2 relative overflow-hidden game-area"
      onDragStart={(e) => e.preventDefault()} // Prevent drag
    >
      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={reducedAnimations ? { opacity: 0 } : { opacity: 0, y: -20, scale: 0.9 }}
            animate={reducedAnimations ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reducedAnimations ? { opacity: 0 } : { opacity: 0, y: -20, scale: 0.9 }}
            transition={reducedAnimations ? { duration: 0.2 } : { duration: 0.3 }}
            className={`notification ${notification.type}`}
          >
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Game Container - Mobile First Design */}
      <div className="game-container">
        {/* Header Section - Mobile Optimized */}
        <div className="header-section">
          <div className="flex flex-col items-center gap-2">
            {/* Stage Info - Prominent on Mobile */}
            <div className="stage-info">
              <div className="stage-title">
                <span className="stage-emoji">🏆</span>
                <span className="stage-number">Stage {complexityLevel + 1}</span>
              </div>
              <span className="stage-description">{currentComplexity.description}</span>
              {/* Show player name if in Facebook */}
              {fbState.isInitialized && fbState.playerName !== 'Player' && (
                <span className="player-name">Playing as {fbState.playerName}</span>
              )}
            </div>
            
            {/* Timer - Compact on Mobile */}
            <div className="timer-container">
              <ClockIcon className="icon-base"/>
              <span className="timer-time">{new Date(timer * 1000).toISOString().substr(14, 5)}</span>
            </div>
          </div>
          {/* Controls - Mobile Optimized Grid */}
          <div className="controls-grid">
            <button onClick={resetGame} className="control-button reset">
                <ReplayIcon className="icon-sm" />
                <span className="hidden-sm">Reset</span>
                <span className="sm:hidden">↻</span>
            </button>
            <button 
              onClick={undoLastPath}
              disabled={paths.length === 0}
              className={`control-button ${paths.length === 0 ? 'undo disabled' : 'undo'}`}
            >
                <span className="text-xs">🔙</span>
                <span className="hidden-sm">Undo</span>
            </button>
            <button 
              onClick={redoLastPath}
              disabled={redoHistory.length === 0}
              className={`control-button ${redoHistory.length === 0 ? 'redo disabled' : 'redo'}`}
            >
                <span className="text-xs">🔄</span>
                <span className="hidden-sm">Redo</span>
            </button>
            <button 
              onClick={startNewGame}
              className="control-button new"
            >
                <span className="text-xs">🎲</span>
                <span className="hidden-sm">New</span>
            </button>
            <button 
              onClick={showTipHandler}
              disabled={gameState === GAME_STATE.WON}
              className={`control-button ${gameState === GAME_STATE.WON ? 'tip disabled' : 'tip'}`}
            >
                <span className="text-xs">💡</span>
                <span className="hidden-sm">Tip</span>
            </button>
            <button 
              onClick={() => {
                setComplexityLevel(0);
                const puzzleResult = generateRandomDotsWithSolution(COMPLEXITY_LEVELS[0]);
                setPuzzleDots(puzzleResult.dots);
                setValidatedSolution(puzzleResult.solution);
                resetGame();
                showNotification('🔄 Progress reset! Back to Stage 1', 'info');
              }}
              className="control-button reset-progress"
            >
                <span className="text-xs">🔄</span>
                <span>Reset Progress</span>
            </button>
            <button 
              onClick={testCurrentGeneration}
              className="control-button"
              style={{ backgroundColor: '#8b5cf6', color: 'white' }}
            >
                <span className="text-xs">🧪</span>
                <span>Test Gen</span>
            </button>
          </div>
        </div>

        {/* Game Board - Mobile Responsive */}
        <div className="game-board-container">
          <svg
            ref={svgRef}
            className={`game-board puzzle-svg ${isDrawing ? 'drawing' : ''}`}
            onMouseDown={handleInteractionStart}
            onTouchStart={handleInteractionStart}
            style={{ touchAction: 'none', aspectRatio: '1/1' }}
            viewBox={`0 0 ${currentComplexity.gridSize * currentComplexity.cellSize} ${currentComplexity.gridSize * currentComplexity.cellSize}`}
          >
            {/* Grid Lines - Memoized for performance */}
            {gridLines}

            {/* Drawn Paths */}
            <g className="pointer-events-none">
              {/* Rule 4: Render all paths as one continuous line (Fill entire grid with one path) */}
              {(paths.length > 0 || currentPath.length > 0) && (
                <path 
                  d={allPathsData} 
                  stroke="url(#path-gradient)" 
                  strokeWidth="12" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  fill="none" 
                />
              )}
              
              {/* Live drawing cursor line - enhanced pen-like drawing */}
              {isDrawing && cursorPos && currentPath.length >= 1 && cursorLineData && (
                <g className="cursor-line-glow">
                  {/* Background glow for pen effect */}
                  <path 
                    d={cursorLineData} 
                    stroke="#22d3ee" 
                    strokeWidth="20" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    fill="none" 
                    opacity="0.2"
                    filter="blur(2px)"
                  />
                  {/* Outer glow */}
                  <path 
                    d={cursorLineData} 
                    stroke="#22d3ee" 
                    strokeWidth="16" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    fill="none" 
                    opacity="0.4"
                  />
                  {/* Main cursor line */}
                  <path 
                    d={cursorLineData} 
                    stroke="url(#path-gradient)" 
                    strokeWidth="12" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    fill="none" 
                    opacity="0.9"
                  />
                  {/* Inner highlight for pen shine effect */}
                  <path 
                    d={cursorLineData} 
                    stroke="#ffffff" 
                    strokeWidth="4" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    fill="none" 
                    opacity="0.6"
                  />
                </g>
              )}
              
              {/* Tip/Solution path - enhanced visibility with animation */}
              {showTip && solutionPath.length > 0 && (
                <g>
                  {/* Background glow for tip path */}
                  <path 
                    d={getPathData(solutionPath)} 
                    stroke="#fbbf24" 
                    strokeWidth="16" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    fill="none" 
                    opacity="0.3"
                    strokeDasharray="20,15"
                    className="animate-enhanced-pulse"
                  />
                  {/* Main tip path */}
                  <path 
                    d={getPathData(solutionPath)} 
                    stroke="#fbbf24" 
                    strokeWidth="10" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    fill="none" 
                    opacity="0.9"
                    strokeDasharray="15,10"
                  />
                  {/* Animated overlay for movement effect */}
                  <path 
                    d={getPathData(solutionPath)} 
                    stroke="#ffffff" 
                    strokeWidth="6" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    fill="none" 
                    opacity="0.6"
                    strokeDasharray="8,12"
                    className="tip-path-animated"
                  />
                </g>
              )}
            </g>
            
            {/* Dots - Memoized for performance */}
            <g className="pointer-events-none">
              {dotsElements}
            </g>
            
            <defs>
              <linearGradient id="path-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0ea5e9" />
                <stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
              <linearGradient id="tip-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        
        {/* Instructions - Mobile Optimized */}
        <div className="instructions">
          <div className="instructions-text">
            Connect dots <span className="instructions-start">1 (START)</span> to <span className="instructions-end">{puzzleDots[puzzleDots.length - 1].num} (END)</span>
            <br className="hidden-sm" />
            <span className="sm:hidden"> • </span>Fill every cell to win!
            <br />
            <span className="instructions-tip">💡 Tap Undo/Redo or use Ctrl+Z/Y</span>
            {/* Debug info - Remove in production */}
            <br />
            <span style={{ fontSize: '10px', color: '#666' }}>
              Debug: Level {complexityLevel}, Expected: {currentComplexity.numDots} dots, Actual: {puzzleDots.length} dots
            </span>
          </div>
        </div>
        
        {/* Facebook CTA for non-Facebook users - Mobile Optimized */}
        {!fbState.isSupported && (
          <div className="facebook-cta">
            <div className="facebook-cta-text">
              🎮 Compete with friends & track progress!
            </div>
            <button 
              onClick={() => {
                window.open('https://fb.gg/your-game-id', '_blank');
              }}
              className="facebook-cta-button"
            >
              🚀 Play on Facebook
            </button>
          </div>
        )}
      </div>
      
      {/* Loading state for Facebook initialization - Mobile Optimized */}
      {fbState.isSupported && fbState.isLoading && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="loading-spinner"></div>
            <p className="loading-text">Loading Facebook Instant Game...</p>
          </div>
        </div>
      )}

      {/* Victory Screen Overlay - Mobile Optimized */}
      <AnimatePresence>
        {gameState === GAME_STATE.WON && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reducedAnimations ? { duration: 0.2 } : undefined}
            className="victory-overlay"
          >
            <motion.div
              initial={reducedAnimations ? { opacity: 0 } : { scale: 0.8, y: 20 }}
              animate={reducedAnimations ? { opacity: 1 } : { scale: 1, y: 0 }}
              exit={reducedAnimations ? { opacity: 0 } : { scale: 0.8, y: 20 }}
              transition={reducedAnimations ? { duration: 0.3 } : { duration: 0.5 }}
              className="victory-content"
            >
              <div className="victory-emoji">🎉</div>
              <h2 className="victory-title">Puzzle Solved!</h2>
              <div className="victory-details">
                <p className="victory-stage">Stage {complexityLevel + 1} Complete!</p>
                <p className="victory-stats">Time: {new Date(timer * 1000).toISOString().substr(14, 5)}</p>
                <p className="victory-stats">Paths Used: {paths.length}</p>
              </div>
              
              <div className="victory-buttons">
                {complexityLevel < COMPLEXITY_LEVELS.length - 1 ? (
                  <button 
                    onClick={advanceToNextLevel}
                    className="victory-button next"
                  >
                    🚀 Next Stage
                  </button>
                ) : (
                  <div className="victory-complete">
                    🏆 All Stages Complete! 🏆
                  </div>
                )}
                
                <button 
                  onClick={startNewGame}
                  className="victory-button new"
                >
                  🎲 New Stage {complexityLevel + 1}
                </button>
                
                <button 
                  onClick={resetGame}
                  className="victory-button retry"
                >
                  🔄 Try Again
                </button>

                {/* Facebook sharing options */}
                {fbState.isInitialized && (
                  <div className="victory-share-section">
                    <button 
                      onClick={() => {
                        fbActions.shareGame({
                          stage: complexityLevel + 1,
                          time: timer,
                          message: `I just solved Stage ${complexityLevel + 1} in ${new Date(timer * 1000).toISOString().substr(14, 5)}! Can you beat my time?`
                        });
                      }}
                      className="victory-share-button"
                    >
                      📤 Share Victory
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PuzzleGame;