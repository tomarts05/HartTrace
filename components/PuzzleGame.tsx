import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { COMPLEXITY_LEVELS, generateRandomDotsWithSolution } from '../data/puzzle';
import { ClockIcon } from './icons/ClockIcon';
import { ReplayIcon } from './icons/ReplayIcon';
import { useFBInstant } from '../hooks/useFBInstant';
import { shouldReduceAnimations, getPerformanceMode } from '../utils/mobileDetection';

type Path = { from: number; to: number; cells: string[] };

const GAME_STATE = {
  DIFFICULTY_SELECTION: 'difficulty-selection', // New initial state for difficulty selection
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
  const maxPenPoints = performanceMode === 'low' ? 15 : performanceMode === 'medium' ? 25 : 40;
  const penUpdateFrequency = performanceMode === 'low' ? 8 : performanceMode === 'medium' ? 6 : 4;
  
  // Performance refs for throttling updates
  const penUpdateCounterRef = useRef(0);
  const lastPenUpdateRef = useRef(0);
  
  // Facebook Instant Games integration
  const [fbState, fbActions] = useFBInstant();
  
  const [gameState, setGameState] = useState(GAME_STATE.DIFFICULTY_SELECTION); // Start with difficulty selection
  const [paths, setPaths] = useState<Path[]>([]);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [cursorPos, setCursorPos] = useState<{ x: number, y: number } | null>(null);
  const penPathRef = useRef<{ x: number, y: number }[]>([]); // Use ref for performance
  const [penPathUpdate, setPenPathUpdate] = useState(0); // Trigger for pen path updates
  const [timer, setTimer] = useState(0);
  const [globalTimer, setGlobalTimer] = useState(0); // Track total progress time across all stages
  const [complexityLevel, setComplexityLevel] = useState(1); // Start with Medium complexity (index 1) - can reset to Easy (index 0) with Reset All
  const [puzzleId, setPuzzleId] = useState(0); // Add unique puzzle ID to force re-renders
  
  // Stage completion tracking for detailed progress and sharing
  const [stageCompletionTimes, setStageCompletionTimes] = useState<number[]>(() => {
    const saved = localStorage.getItem('hartai-stage-times');
    return saved ? JSON.parse(saved) : [];
  });
  const [totalGameCompletions, setTotalGameCompletions] = useState<number>(() => {
    const saved = localStorage.getItem('hartai-completions');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [bestTotalTime, setBestTotalTime] = useState<number>(() => {
    const saved = localStorage.getItem('hartai-best-time');
    return saved ? parseInt(saved, 10) : Infinity;
  });
  const [showProgressSummary, setShowProgressSummary] = useState(false);
  
  // Initialize puzzle with solution (use Medium complexity)
  const [initialPuzzleState] = useState(() => generateRandomDotsWithSolution(COMPLEXITY_LEVELS[1]));
  
  const [puzzleDots, setPuzzleDots] = useState(() => {
    console.log('Initial puzzle generation:', {
      complexityLevel: 1, // Medium complexity
      complexity: COMPLEXITY_LEVELS[1],
      generatedDots: initialPuzzleState.dots,
      solution: initialPuzzleState.solution,
      expectedDots: COMPLEXITY_LEVELS[1].numDots,
      actualDots: initialPuzzleState.dots.length
    });
    return initialPuzzleState.dots;
  });
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const [showTip, setShowTip] = useState(false);
  const [solutionPath, setSolutionPath] = useState<string[]>([]);
  const [validatedSolution, setValidatedSolution] = useState<string[]>(initialPuzzleState.fullSolution); // Store the validated solution from puzzle generation
  // Removed redoHistory state since Redo functionality was removed
  const svgRef = useRef<SVGSVGElement>(null);

  const currentComplexity = COMPLEXITY_LEVELS[complexityLevel];
  const totalCells = currentComplexity.gridSize * currentComplexity.gridSize;
  const occupiedCells = useMemo(() => new Set(paths.flatMap(p => p.cells)), [paths]);

  // Memoize grid lines for better performance
  const gridLines = useMemo(() => {
    return Array.from({ length: currentComplexity.gridSize + 1 }).map((_, i) => (
      <g key={i} className="grid-lines">
        <line x1={i * currentComplexity.cellSize} y1="0" x2={i * currentComplexity.cellSize} y2={currentComplexity.gridSize * currentComplexity.cellSize} stroke="currentColor" strokeWidth="1" />
        <line x1="0" y1={i * currentComplexity.cellSize} x2={currentComplexity.gridSize * currentComplexity.cellSize} y2={i * currentComplexity.cellSize} stroke="currentColor" strokeWidth="1" />
      </g>
    ));
  }, [currentComplexity.gridSize, currentComplexity.cellSize]);

  useEffect(() => {
    let interval: number;
    if (gameState === GAME_STATE.PLAYING) {
      interval = window.setInterval(() => {
        // Batch timer updates to reduce re-renders
        setTimer(prev => prev + 1);
        setGlobalTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameState]);

  const resetGame = useCallback(() => {
    console.log('🔄 RESET: Generating new puzzle...');
    
    // Generate new puzzle with current complexity
    const puzzleResult = generateRandomDotsWithSolution(currentComplexity);
    
    // Immediate state updates for smooth experience
    setPaths([]);
    setCurrentPath([]);
    penPathRef.current = [];
    setIsDrawing(false);
    setCursorPos(null);
    setTimer(0); // Only reset stage timer, keep global timer
    setGameState(GAME_STATE.IDLE);
    setShowTip(false);
    setSolutionPath([]);
    setValidatedSolution(puzzleResult.fullSolution);
    // Removed setRedoHistory call since redo functionality was removed
    setPuzzleDots(puzzleResult.dots);
    setPuzzleId(prev => prev + 1);
    
    console.log('✅ INSTANT reset complete for Stage', complexityLevel + 1, 'with unique pattern');
  }, [currentComplexity, complexityLevel]);

  const showNotification = useCallback((message: string, type: 'success' | 'info' = 'success') => {
    // Use requestAnimationFrame for smoother notification updates
    requestAnimationFrame(() => {
      setNotification({ message, type });
      setTimeout(() => setNotification(null), 3000); // Auto-hide after 3 seconds
    });
  }, []);



  // Removed clearStoredProgress function since Clear Records button was removed

  const resetAllProgress = useCallback(() => {
    console.log('🔄 RESET ALL: Going back to Stage 1 and clearing ALL stored progress...');
    
    // Clear ALL localStorage data for fresh start
    localStorage.removeItem('hartai-stage-times');
    localStorage.removeItem('hartai-completions');
    localStorage.removeItem('hartai-best-time');
    console.log('🗑️ Cleared all stored progress data from localStorage');
    
    // Reset to first complexity level (Stage 1)
    const firstComplexity = COMPLEXITY_LEVELS[0]; // Start from Easy (Stage 1)
    const puzzleResult = generateRandomDotsWithSolution(firstComplexity);
    
    // Use requestAnimationFrame for smoother reset
    requestAnimationFrame(() => {
      // Batch all state updates including level reset
      setComplexityLevel(0); // Reset to Stage 1 (Easy)
      setPaths([]);
      setCurrentPath([]);
      penPathRef.current = [];
      setIsDrawing(false);
      setCursorPos(null);
      setTimer(0); // Reset stage timer
      setGlobalTimer(0); // Reset global progress timer
      setGameState(GAME_STATE.IDLE);
      setShowTip(false);
      setSolutionPath([]);
      setValidatedSolution(puzzleResult.fullSolution);
      setPuzzleDots(puzzleResult.dots);
      setPuzzleId(prev => prev + 1);
      
      // Reset all progress tracking state to initial values
      setStageCompletionTimes([]);
      setTotalGameCompletions(0);
      setBestTotalTime(Infinity);
      setShowProgressSummary(false);
      
      showNotification('🔄 Reset to Stage 1! ALL progress data cleared completely.', 'info');
      console.log('✅ Complete reset: Stage 1, all timers cleared, all localStorage cleared');
    });
  }, [showNotification]);

  // Save current state to history (called before making changes)
  // Removed - now using simpler path-by-path undo system

  const undoLastPath = useCallback(() => {
    if (paths.length === 0 && currentPath.length === 0) {
      showNotification('Nothing to undo!', 'info');
      return;
    }

    console.log('Undoing last connection. Current paths:', paths.length, 'Current path:', currentPath.length);

    // If we're currently drawing (have a current path), just clear it
    if (currentPath.length > 0) {
      console.log('🔙 Undoing current drawing path');
      setCurrentPath([]);
      penPathRef.current = [];
      setIsDrawing(false);
      setCursorPos(null);
      showNotification(`🔙 Cleared current drawing`, 'info');
      return;
    }

    // If we have completed paths, undo the last one
    if (paths.length > 0) {
      const lastPath = paths[paths.length - 1];
      console.log(`🔙 Undoing path from dot ${lastPath.from} to dot ${lastPath.to}`);
      
      // Remove the last path
      setPaths(prev => prev.slice(0, -1));
      
      // Clear any current drawing state
      setCurrentPath([]);
      penPathRef.current = [];
      setIsDrawing(false);
      setCursorPos(null);
      
      // Show notification with specific path info
      showNotification(`🔙 Undid connection ${lastPath.from} → ${lastPath.to}`, 'info');
      
      console.log('Undid last path. New paths count:', paths.length - 1);
    }
  }, [paths, currentPath, showNotification]);

  // Removed redoLastPath function since Redo button was removed

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
    
    // Show only a SMALL HINT instead of complete solution
    let tipPath: string[] = [];
    
    if (filledCells.size === 0) {
      // No progress yet - show only the first 3-4 moves as a hint
      tipPath = fullSolution.slice(0, 4);
      console.log('🔰 No progress - showing small hint:', tipPath.length, 'cells');
    } else {
      // Find the furthest point in the solution that matches our progress
      let lastMatchIndex = -1;
      for (let i = 0; i < fullSolution.length; i++) {
        if (filledCells.has(fullSolution[i])) {
          lastMatchIndex = i;
        }
      }
      
      if (lastMatchIndex >= 0) {
        console.log('� Found progress up to solution index:', lastMatchIndex);
        
        // Show the COMPLETE remaining path from current position to the end
        const startIndex = lastMatchIndex + 1;
        tipPath = fullSolution.slice(startIndex, startIndex + Math.min(5, fullSolution.length - startIndex)); // Show small hint only
        console.log(`� Showing path continuation:`, tipPath.length, 'cells');
      } else {
        // Current path doesn't match solution - show small hint from start
        tipPath = fullSolution.slice(0, 4);
        console.log('⚠️ Path mismatch - showing small hint from start:', tipPath.length, 'cells');
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
    let tipMessage = '💡 Tip: Follow the yellow hint path!';
    if (filledCells.size === 0) {
      tipMessage = `💡 Tip: Start from dot 1 and follow the yellow hint for your next few moves!`;
    } else {
      const nextDotNum = paths.length + 2; // Next dot we need to reach
      if (nextDotNum <= puzzleDots.length) {
        tipMessage = `💡 Tip: Follow the yellow hint to get closer to dot ${nextDotNum}!`;
      } else {
        tipMessage = `💡 Tip: Follow the yellow hint for your next moves!`;
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
  }, [gameState, validatedSolution, paths, currentPath, fbActions, complexityLevel, showNotification, puzzleDots, currentComplexity]);

  const advanceToNextLevel = useCallback(() => {
    const nextLevel = Math.min(complexityLevel + 1, COMPLEXITY_LEVELS.length - 1);
    const newComplexity = COMPLEXITY_LEVELS[nextLevel];
    
    console.log('🚀 ADVANCE: From Stage', complexityLevel + 1, 'to Stage', nextLevel + 1);
    console.log('🎯 NEW COMPLEXITY:', newComplexity);
    
    // Show notification briefly
    showNotification(`🎉 Stage ${complexityLevel + 1} Complete! Moving to Stage ${nextLevel + 1}`, 'success');
    
    // For high complexity levels, use optimized generation
    if (newComplexity.gridSize >= 7) {
      console.log('⚡ HIGH COMPLEXITY: Using INSTANT generation (no delays)');
      
      // INSTANT generation for Stage 11 & 12 - no setTimeout delays
      try {
        console.log('🚀 INSTANT puzzle generation:', newComplexity);
        const puzzleResult = generateRandomDotsWithSolution(newComplexity);
        
        // Immediate state updates - no async delays
        setComplexityLevel(nextLevel);
        setPuzzleDots(puzzleResult.dots);
        setValidatedSolution(puzzleResult.fullSolution);
        setPuzzleId(prev => prev + 1);
        setPaths([]);
        setCurrentPath([]);
        penPathRef.current = [];
        setIsDrawing(false);
        setCursorPos(null);
        setTimer(0); // Reset stage timer, but keep global timer running
        setGameState(GAME_STATE.IDLE);
        setShowTip(false);
        setSolutionPath([]);
        
        console.log('✅ INSTANT ADVANCE to Stage', nextLevel + 1, 'complete!');
        
        if (nextLevel + 1 === 12) {
          showNotification(`🏆 Welcome to Master Stage 12!`, 'success');
        } else {
          showNotification(`⚡ Welcome to Stage ${nextLevel + 1}!`, 'success');
        }
      } catch (error) {
        console.error('❌ INSTANT GENERATION ERROR:', error);
        showNotification(`⚠️ Error generating Stage ${nextLevel + 1}. Please try again.`, 'info');
      }
    } else {
      // For simpler puzzles, use immediate generation
      requestAnimationFrame(() => {
        try {
          console.log('🎲 Generating simple puzzle:', newComplexity);
          const puzzleResult = generateRandomDotsWithSolution(newComplexity);
          
          // Batch all state updates for better performance
          setComplexityLevel(nextLevel);
          setPuzzleDots(puzzleResult.dots);
          setValidatedSolution(puzzleResult.fullSolution);
          setPuzzleId(prev => prev + 1);
          setPaths([]);
          setCurrentPath([]);
          penPathRef.current = [];
          setIsDrawing(false);
          setCursorPos(null);
          setTimer(0); // Reset stage timer, but keep global timer running
          setGameState(GAME_STATE.IDLE);
          setShowTip(false);
          setSolutionPath([]);
          
          console.log('✅ ADVANCED TO STAGE', nextLevel + 1, 'successfully');
        } catch (error) {
          console.error('❌ PUZZLE GENERATION ERROR:', error);
          showNotification(`⚠️ Error generating Stage ${nextLevel + 1}. Please try again.`, 'info');
        }
      });
    }
  }, [complexityLevel, showNotification]);

  // Removed startNewGame function since New button was removed

  const getCellFromEvent = useCallback((e: PointEvent): string | null => {
    if (!svgRef.current) return null;
    
    try {
      const rect = svgRef.current.getBoundingClientRect();
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
  }, [currentComplexity]);

  const getCenterOfCell = (cell: string): { x: number, y: number } => {
    const [row, col] = cell.split(',').map(Number);
    return {
      x: col * currentComplexity.cellSize + currentComplexity.cellSize / 2,
      y: row * currentComplexity.cellSize + currentComplexity.cellSize / 2,
    };
  };

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
        
        // Set initial cursor position
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
      
      // Immediately set up drawing state for better responsiveness
      setCurrentPath([startDotCell]); // Always start with the dot cell
      const dotCenter = getCenterOfCell(startDotCell);
      penPathRef.current = [dotCenter]; // Start pen path from dot center
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
      // Check if user clicked on any numbered dot (but wrong one)
      const clickedDot = puzzleDots.find(d => cell === `${d.row},${d.col}`);
      if (clickedDot) {
        console.log(`❌ WRONG START DOT: Clicked dot ${clickedDot.num} but must start from dot ${nextDotNumber}`);
        showNotification(`Must connect dots in order! Start from dot ${nextDotNumber}, not dot ${clickedDot.num}`, 'info');
      } else {
        console.log('Must start from dot', nextDotNumber, 'at cell', startDotCell);
        showNotification(`Start from dot ${nextDotNumber} or continue your current path`, 'info');
      }
    }
  }, [gameState, paths, puzzleDots, getCellFromEvent, occupiedCells, showTip, showNotification, currentPath, currentComplexity]);

  const handleInteractionMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDrawing) return;
    
    // Prevent default behavior
    if (e.cancelable) {
      e.preventDefault();
    }

    const point = 'touches' in e ? e.touches[0] : e;
    if (!point) return;

    // PEN-LIKE DRAWING: Always update cursor position for smooth, continuous drawing
    if (svgRef.current) {
      try {
        const rect = svgRef.current.getBoundingClientRect();
        
        // Ensure we have valid dimensions
        if (rect.width === 0 || rect.height === 0) {
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
        
        // Update cursor position with throttling for mobile performance
        const now = performance.now();
        const shouldUpdateCursor = performanceMode === 'low' ? (now - lastPenUpdateRef.current >= 33) : true;
        
        if (shouldUpdateCursor) {
          setCursorPos({ x: svgX, y: svgY });
        }
        
        // Add point to pen path for smooth curve drawing (use ref for performance)
        penPathRef.current.push({ x: svgX, y: svgY });
        
        // Keep only last N points for performance (optimized based on device capability)
        if (penPathRef.current.length > maxPenPoints) {
          penPathRef.current = penPathRef.current.slice(-maxPenPoints);
        }
        
        // Throttle pen path updates for better performance
        penUpdateCounterRef.current++;
        
        // Update pen path visualization based on time-based throttling for smoother performance
        if (now - lastPenUpdateRef.current >= (performanceMode === 'low' ? 50 : performanceMode === 'medium' ? 33 : 16)) {
          lastPenUpdateRef.current = now;
          setPenPathUpdate(prev => prev + 1);
        }
      } catch (error) {
        console.warn('Error setting cursor position:', error);
        return;
      }
    }
    
    // CELL VALIDATION: Handle game logic updates when entering new valid cells
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
      return; // Don't add non-adjacent cells, but continue showing smooth cursor line
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

    // EARLY ORDER VALIDATION: Prevent approaching wrong numbered dots
    const dotAtTargetCell = puzzleDots.find(d => cell === `${d.row},${d.col}`);
    
    if (dotAtTargetCell) {
      const currentDotNum = paths.length + 1;
      const nextDotNum = currentDotNum + 1;
      
      if (dotAtTargetCell.num !== nextDotNum) {
        console.log(`❌ BLOCKED APPROACH: Cannot approach dot ${dotAtTargetCell.num}, must reach dot ${nextDotNum} first`);
        showNotification(`Must connect dots in order! Next dot should be ${nextDotNum}`, 'info');
        
        // STOP drawing immediately when trying to approach wrong dot
        setIsDrawing(false);
        setCursorPos(null);
        penPathRef.current = [];
        return;
      }
    }

    // Add the cell to the current path
    const newCurrentPath = [...currentPath, cell];
    setCurrentPath(newCurrentPath);
    
    // Clear tip when actually adding to path (making real progress)
    if (showTip || solutionPath.length > 0) {
      setShowTip(false);
      setSolutionPath([]);
      console.log('Cleared tip on path progress');
    }

    // Check if we've reached a numbered dot (Rule 3: Visit numbered cells in ascending order)
    const currentDotNum = paths.length + 1;
    const nextDotNum = currentDotNum + 1;
    
    // STRICT ORDER ENFORCEMENT: Only allow connecting to the NEXT dot in sequence
    // Check if we're on ANY dot cell first
    const dotAtCell = puzzleDots.find(d => cell === `${d.row},${d.col}`);
    
    if (dotAtCell) {
      // STRICT ORDER ENFORCEMENT: If we're on a dot cell, it MUST be the next dot in sequence
      if (dotAtCell.num !== nextDotNum) {
        console.log(`❌ WRONG ORDER: Reached dot ${dotAtCell.num} but expected dot ${nextDotNum}`);
        showNotification(`Must connect dots in order! Next dot should be ${nextDotNum}`, 'info');
        
        // STOP drawing immediately when wrong order is detected
        setIsDrawing(false);
        setCursorPos(null);
        penPathRef.current = [];
        return; // Block the connection completely
      }
      
      console.log(`✅ VALID CONNECTION: Reached correct dot ${nextDotNum} at cell ${cell}`);
      
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
        
        // Track stage completion with detailed timing
        const currentStageTime = timer;
        const newStageCompletionTimes = [...stageCompletionTimes];
        newStageCompletionTimes[complexityLevel] = currentStageTime;
        setStageCompletionTimes(newStageCompletionTimes);
        localStorage.setItem('hartai-stage-times', JSON.stringify(newStageCompletionTimes));
        
        console.log('📊 STAGE TRACKING:', {
          stage: complexityLevel + 1,
          stageTime: currentStageTime,
          globalTime: globalTimer,
          completedStages: newStageCompletionTimes.length
        });
        
        // Check if this completes the entire game (Stage 12)
        const isGameComplete = complexityLevel === COMPLEXITY_LEVELS.length - 1; // Stage 12 (index 11)
        
        if (isGameComplete) {
          // Track full game completion
          const newCompletions = totalGameCompletions + 1;
          setTotalGameCompletions(newCompletions);
          localStorage.setItem('hartai-completions', newCompletions.toString());
          
          // Update best time if this is better
          if (globalTimer < bestTotalTime) {
            setBestTotalTime(globalTimer);
            localStorage.setItem('hartai-best-time', globalTimer.toString());
            console.log('🏆 NEW BEST TIME:', globalTimer, 'seconds');
          }
          
          console.log('🎊 GAME COMPLETION TRACKED:', {
            totalCompletions: newCompletions,
            totalTime: globalTimer,
            bestTime: Math.min(globalTimer, bestTotalTime),
            allStageTimes: newStageCompletionTimes
          });
        }
        
        // Log completion event to Facebook
        fbActions.logEvent('stage_completed', complexityLevel + 1, {
          stage: complexityLevel + 1,
          time: timer,
          paths: newPaths.length,
          complexity: currentComplexity.description,
          globalTime: globalTimer,
          isGameComplete
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
        penPathRef.current = [];
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
        const dotCenter = getCenterOfCell(cell);
        penPathRef.current = [dotCenter]; // Reset pen path from new dot center
      } else {
        console.log('All dots connected! Finishing drawing.');
        setCurrentPath([]);
        penPathRef.current = [];
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
    currentPath, 
    occupiedCells, 
    getCellFromEvent, 
    paths, 
    puzzleDots, 
    showTip, 
    setSolutionPath, 
    setShowTip, 
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
    solutionPath,
    isDrawing
  ]);

  const handleInteractionEnd = useCallback(() => {
    if (!isDrawing) return;
    
    setIsDrawing(false);
    setCursorPos(null);
    
    // Keep the current path for visual continuity and to allow continuing later
    // Clear pen path to start fresh for next drawing session
    penPathRef.current = [];
    console.log('Drawing ended, keeping current path for continuity, cleared pen path');
  }, [isDrawing]);

  useEffect(() => {
    window.addEventListener('mousemove', handleInteractionMove);
    window.addEventListener('touchmove', handleInteractionMove, { passive: true });
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
      
      // Removed Ctrl+Y redo functionality since redo was removed
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameState, undoLastPath]); // Removed redoLastPath from dependencies

  // Create smooth SVG path from pen movements
  const createSmoothPath = useCallback((points: { x: number, y: number }[]) => {
    if (points.length === 0) return "";
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    
    let path = `M ${points[0].x} ${points[0].y}`;
    
    for (let i = 1; i < points.length; i++) {
      const curr = points[i];
      
      if (i === 1) {
        // First line segment
        path += ` L ${curr.x} ${curr.y}`;
      } else {
        // Use quadratic curves for smoothness
        const next = points[i + 1];
        if (next) {
          const cpX = curr.x;
          const cpY = curr.y;
          const endX = (curr.x + next.x) / 2;
          const endY = (curr.y + next.y) / 2;
          path += ` Q ${cpX} ${cpY} ${endX} ${endY}`;
        } else {
          // Last point
          path += ` L ${curr.x} ${curr.y}`;
        }
      }
    }
    
    return path;
  }, []);

  // Memoized path data generation for better performance
  const getPathData = useCallback((cells: string[]) => {
    if (cells.length === 0) return "";
    return cells.map((cell, i) => {
        const { x, y } = getCenterOfCell(cell);
        return (i === 0 ? 'M' : 'L') + `${x} ${y}`;
    }).join(' ');
  }, [currentComplexity]); // Only depend on cell size changes
  
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
  }, [puzzleDots, occupiedCells, currentPath, nextDot, gameState, isDrawing, puzzleId, currentComplexity]);
  
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
  }, [paths, currentPath]);

  // Enhanced live cursor line for smooth pen-like drawing
  const cursorLineData = useMemo(() => {
    if (!isDrawing || penPathRef.current.length === 0) return "";
    
    // Use the smooth pen path for natural drawing
    return createSmoothPath(penPathRef.current);
  }, [isDrawing, penPathUpdate, createSmoothPath]);

  return (
    <div 
      className="game-area"
      onDragStart={(e) => e.preventDefault()} // Prevent drag
    >
      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={reducedAnimations ? { opacity: 0 } : { opacity: 0, y: -20, scale: 0.9 }}
            animate={reducedAnimations ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reducedAnimations ? { opacity: 0 } : { opacity: 0, y: -20, scale: 0.9 }}
            transition={reducedAnimations ? { duration: 0.15 } : { duration: 0.2 }}
            className={`notification ${notification.type}`}
          >
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Game Container - Mobile First Design */}
      <div className="game-container">
        {/* Game Title with Logo */}
        <div className="game-title">
          <img 
            src="/hart-logo.png" 
            alt="Hart Logo" 
            className="logo"
          />
          <h1>HartTrace</h1>
        </div>
        
        {/* Header Section - Mobile Optimized */}
        <div className="header-section">
          <div className="stage-timer-section">
            {/* Stage Info - Compact Single Line */}
            <div className="stage-info">
              <div className="stage-title-compact">
                <span className="stage-emoji">🏆</span>
                <span className="stage-number">Stage {complexityLevel + 1}</span>
                <span className="stage-description-inline">- {currentComplexity.description}</span>
              </div>
              {/* Show player name if in Facebook */}
              {fbState.isInitialized && fbState.playerName !== 'Player' && (
                <span className="player-name">Playing as {fbState.playerName}</span>
              )}
            </div>
            
            {/* Timers - Combined on Same Line */}
            <div className="timer-container-combined">
              <div className="timer-item">
                <ClockIcon className="icon-base"/>
                <span className="timer-time">{new Date(timer * 1000).toISOString().substr(14, 5)}</span>
              </div>
              <div className="timer-separator">•</div>
              <div className="timer-item global">
                <span>🌍</span>
                <span className="timer-time">Total: {new Date(globalTimer * 1000).toISOString().substr(14, 5)}</span>
              </div>
            </div>
          </div>
          
          {/* Controls - Mobile Optimized Grid */}
          <div className="controls-grid">
            <button onClick={resetGame} className="control-button reset">
                <ReplayIcon className="icon-sm" />
                <span className="btn-text">Reset</span>
                <span className="btn-icon">↻</span>
            </button>
            <button 
              onClick={resetAllProgress}
              className="control-button reset"
              style={{ backgroundColor: '#dc2626', borderColor: '#dc2626' }}
              title="Reset to Stage 1 and clear ALL progress records"
            >
                <span>🔄</span>
                <span className="btn-text">Reset All</span>
                <span className="btn-icon">⏮</span>
            </button>
            <button 
              onClick={undoLastPath}
              disabled={paths.length === 0 && currentPath.length === 0}
              className={`control-button ${paths.length === 0 && currentPath.length === 0 ? 'undo disabled' : 'undo'}`}
            >
                <span>🔙</span>
                <span className="btn-text">Undo</span>
            </button>
            {/* <button 
              onClick={showTipHandler}
              disabled={gameState === GAME_STATE.WON}
              className={`control-button ${gameState === GAME_STATE.WON ? 'tip disabled' : 'tip'}`}
            >
                <span className="text-xs">💡</span>
                <span className="hidden-sm">Tip</span>
            </button> */}
            <button 
              onClick={() => setShowProgressSummary(true)}
              className="control-button progress"
              title="View Progress Summary"
            >
                <span>📈</span>
                <span className="btn-text">Progress</span>
            </button>
          </div>
        </div>

        {/* Game Board - Mobile Responsive */}
        <div className="game-board-container">
          <svg
            ref={svgRef}
            className={`game-board game-svg ${isDrawing ? 'drawing' : ''}`}
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
              
              {/* Live drawing cursor line - clean simple version */}
              {isDrawing && cursorPos && currentPath.length >= 1 && cursorLineData && (
                <path 
                  d={cursorLineData} 
                  stroke="url(#path-gradient)" 
                  strokeWidth="12" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  fill="none" 
                  opacity="0.8"
                />
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
            
            {/* Dots */}
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
            <br />
            <span> • </span>Fill every cell to win!
            <br />
            <span className="instructions-tip">💡 Tap Undo/Redo or use Ctrl+Z/Y</span>
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

      {/* Progress Summary Modal */}
      <AnimatePresence>
        {showProgressSummary && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reducedAnimations ? { duration: 0.1 } : { duration: 0.2 }}
            className="victory-overlay"
            onClick={() => setShowProgressSummary(false)}
          >
            <motion.div
              initial={reducedAnimations ? { opacity: 0 } : { scale: 0.8, y: 20 }}
              animate={reducedAnimations ? { opacity: 1 } : { scale: 1, y: 0 }}
              exit={reducedAnimations ? { opacity: 0 } : { scale: 0.8, y: 20 }}
              transition={reducedAnimations ? { duration: 0.15 } : { duration: 0.25 }}
              className="victory-content"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="victory-emoji">📈</div>
              <h2 className="victory-title">Progress Summary</h2>
              
              <div className="victory-details">
                <p className="victory-stage">Current Stage: {complexityLevel + 1} of 12</p>
                <p className="victory-stats">Current Session: {new Date(globalTimer * 1000).toISOString().substr(11, 8)}</p>
                
                {/* Overall Statistics */}
                <div className="completion-stats">
                  <div className="stats-section">
                    <h3 className="stats-title">🏆 Your Records</h3>
                    <p className="stats-highlight">Game Completions: {totalGameCompletions}</p>
                    <p className="stats-highlight">
                      Best Total Time: {bestTotalTime === Infinity ? 'None yet' : new Date(bestTotalTime * 1000).toISOString().substr(11, 8)}
                    </p>
                    <p className="stats-highlight">Stages Completed: {stageCompletionTimes.length}/12</p>
                  </div>
                </div>
                
                {/* Stage-by-stage breakdown */}
                {stageCompletionTimes.length > 0 && (
                  <div className="stage-breakdown">
                    <h4 className="breakdown-title">📊 Best Stage Times:</h4>
                    <div className="stage-times-grid">
                      {Array.from({ length: 12 }, (_, index) => {
                        const time = stageCompletionTimes[index];
                        return (
                          <div key={index} className={`stage-time-item ${time ? 'completed' : 'incomplete'}`}>
                            <span className="stage-number">S{index + 1}</span>
                            <span className="stage-time">
                              {time ? new Date(time * 1000).toISOString().substr(14, 5) : '--:--'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* Progress percentage */}
                <div className="progress-indicator">
                  <p className="progress-text">
                    Progress: {Math.round((stageCompletionTimes.length / 12) * 100)}% Complete
                  </p>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${(stageCompletionTimes.length / 12) * 100}%` }}
                    ></div>
                  </div>
                </div>
                
                {/* Motivational messages */}
                {stageCompletionTimes.length === 0 && (
                  <p className="motivation-text">🌟 Start your journey! Complete stages to track your progress.</p>
                )}
                {stageCompletionTimes.length > 0 && stageCompletionTimes.length < 6 && (
                  <p className="motivation-text">🚀 Great start! Keep going to unlock harder challenges.</p>
                )}
                {stageCompletionTimes.length >= 6 && stageCompletionTimes.length < 12 && (
                  <p className="motivation-text">🔥 You're on fire! Master the remaining stages.</p>
                )}
                {stageCompletionTimes.length === 12 && (
                  <p className="motivation-text">🏆 MASTER ACHIEVED! You've conquered all stages!</p>
                )}
              </div>
              
              <div className="victory-buttons">
                <button 
                  onClick={() => setShowProgressSummary(false)}
                  className="victory-button retry"
                >
                  ✓ Continue Playing
                </button>
                
                {/* Social sharing from progress summary */}
                {fbState.isInitialized && stageCompletionTimes.length > 0 && (
                  <button 
                    onClick={() => {
                      const completionPercentage = Math.round((stageCompletionTimes.length / 12) * 100);
                      const shareMessage = stageCompletionTimes.length === 12
                        ? `🏆 I've MASTERED all 12 stages! My best time: ${new Date(bestTotalTime * 1000).toISOString().substr(11, 8)}. Think you can beat me?`
                        : `🎯 I'm ${completionPercentage}% through the puzzle challenge! Currently on Stage ${complexityLevel + 1}. Join me!`;
                      
                      fbActions.shareGame({
                        stage: complexityLevel + 1,
                        time: globalTimer,
                        message: shareMessage
                      });
                      setShowProgressSummary(false);
                    }}
                    className="victory-share-button"
                  >
                    📤 Share Progress
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Victory Screen Overlay - Enhanced with Progress Tracking */}
      <AnimatePresence>
        {gameState === GAME_STATE.WON && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reducedAnimations ? { duration: 0.1 } : { duration: 0.2 }}
            className="victory-overlay"
          >
            <motion.div
              initial={reducedAnimations ? { opacity: 0 } : { scale: 0.8, y: 20 }}
              animate={reducedAnimations ? { opacity: 1 } : { scale: 1, y: 0 }}
              exit={reducedAnimations ? { opacity: 0 } : { scale: 0.8, y: 20 }}
              transition={reducedAnimations ? { duration: 0.15 } : { duration: 0.25 }}
              className="victory-content"
            >
              {/* Dynamic victory celebration based on completion level */}
              {complexityLevel === COMPLEXITY_LEVELS.length - 1 ? (
                <div className="victory-emoji">🏆</div>
              ) : (
                <div className="victory-emoji">🎉</div>
              )}
              
              <h2 className="victory-title">
                {complexityLevel === COMPLEXITY_LEVELS.length - 1 ? 'MASTER COMPLETE!' : 'Puzzle Solved!'}
              </h2>
              
              <div className="victory-details">
                <p className="victory-stage">Stage {complexityLevel + 1} Complete!</p>
                <p className="victory-stats">Stage Time: {new Date(timer * 1000).toISOString().substr(14, 5)}</p>
                <p className="victory-stats">Total Progress: {new Date(globalTimer * 1000).toISOString().substr(14, 5)}</p>
                <p className="victory-stats">Paths Used: {paths.length}</p>
                
                {/* Enhanced completion statistics */}
                {complexityLevel === COMPLEXITY_LEVELS.length - 1 && (
                  <div className="completion-stats">
                    <div className="stats-section">
                      <h3 className="stats-title">🎊 GAME COMPLETED! 🎊</h3>
                      <p className="stats-highlight">Total Completions: {totalGameCompletions + 1}</p>
                      <p className="stats-highlight">
                        Best Time: {bestTotalTime === Infinity ? 'First completion!' : new Date(Math.min(globalTimer, bestTotalTime) * 1000).toISOString().substr(11, 8)}
                      </p>
                      {globalTimer < bestTotalTime && (
                        <p className="stats-new-record">🥇 NEW PERSONAL BEST!</p>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Stage-by-stage breakdown for completed stages */}
                {stageCompletionTimes.length > 0 && (
                  <div className="stage-breakdown">
                    <h4 className="breakdown-title">📊 Stage Times:</h4>
                    <div className="stage-times-grid">
                      {stageCompletionTimes.map((time, index) => (
                        <div key={index} className="stage-time-item">
                          <span className="stage-number">S{index + 1}:</span>
                          <span className="stage-time">{new Date(time * 1000).toISOString().substr(14, 5)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="victory-buttons">
                {(() => {
                  console.log('🏆 VICTORY DEBUG:', { 
                    complexityLevel, 
                    maxLevel: COMPLEXITY_LEVELS.length - 1,
                    shouldShowNext: complexityLevel < COMPLEXITY_LEVELS.length - 1,
                    totalLevels: COMPLEXITY_LEVELS.length 
                  });
                  return null;
                })()}
                
                {complexityLevel < COMPLEXITY_LEVELS.length - 1 ? (
                  <button 
                    onClick={advanceToNextLevel}
                    className="victory-button next"
                  >
                    🚀 Next Stage (to Stage {complexityLevel + 2})
                  </button>
                ) : (
                  <div className="victory-complete">
                    <h3 className="complete-title">🏆 ALL STAGES MASTERED! 🏆</h3>
                    <p className="complete-subtitle">You've conquered all 12 stages!</p>
                  </div>
                )}
                
                {/* Social sharing and leaderboard section */}
                {fbState.isInitialized && (
                  <div className="victory-social-section">
                    <div className="social-buttons">
                      <button 
                        onClick={() => {
                          const isGameComplete = complexityLevel === COMPLEXITY_LEVELS.length - 1;
                          const shareMessage = isGameComplete 
                            ? `� I just MASTERED all 12 stages in ${new Date(globalTimer * 1000).toISOString().substr(11, 8)} total time! Think you can beat me?`
                            : `🎯 Just solved Stage ${complexityLevel + 1} in ${new Date(timer * 1000).toISOString().substr(14, 5)}! Can you do better?`;
                          
                          fbActions.shareGame({
                            stage: complexityLevel + 1,
                            time: timer,
                            message: shareMessage
                          });
                        }}
                        className="victory-share-button"
                      >
                        � Share {complexityLevel === COMPLEXITY_LEVELS.length - 1 ? 'Master Achievement' : 'Stage Victory'}
                      </button>
                      
                      <button 
                        onClick={() => {
                          const score = complexityLevel === COMPLEXITY_LEVELS.length - 1 
                            ? Math.max(1, 100000 - globalTimer * 10) // Higher score for full completion
                            : Math.max(1, 10000 - timer * 10);
                          
                          fbActions.submitScore('main_leaderboard', score, {
                            stage: complexityLevel + 1,
                            time: timer,
                            totalTime: globalTimer,
                            complexity: currentComplexity.description,
                            isGameComplete: complexityLevel === COMPLEXITY_LEVELS.length - 1
                          });
                          
                          showNotification('🏆 Score submitted to leaderboard!', 'success');
                        }}
                        className="victory-leaderboard-button"
                      >
                        🏆 Submit to Leaderboard
                      </button>
                      
                      <button 
                        onClick={async () => {
                          try {
                            const leaderboard = await fbActions.getLeaderboard('main_leaderboard');
                            console.log('🏆 LEADERBOARD:', leaderboard);
                            showNotification(`📊 Found ${leaderboard.length} leaderboard entries!`, 'info');
                          } catch (error) {
                            console.error('Leaderboard error:', error);
                            showNotification('📊 Leaderboard not available', 'info');
                          }
                        }}
                        className="victory-leaderboard-button"
                      >
                        📊 View Leaderboard
                      </button>
                    </div>
                    
                    {/* Competitive message for completed game */}
                    {complexityLevel === COMPLEXITY_LEVELS.length - 1 && (
                      <div className="competitive-section">
                        <p className="competitive-text">
                          🎯 Challenge friends to beat your {new Date(globalTimer * 1000).toISOString().substr(11, 8)} completion time!
                        </p>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Action buttons */}
                <div className="action-buttons">
                  
                  <button 
                    onClick={resetGame}
                    className="victory-button retry"
                  >
                    🔄 Try Again
                  </button>
                  
                  <button 
                    onClick={resetAllProgress}
                    className="victory-button retry"
                    style={{ backgroundColor: '#dc2626', borderColor: '#dc2626' }}
                  >
                    🏁 Reset All Progress
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PuzzleGame;
