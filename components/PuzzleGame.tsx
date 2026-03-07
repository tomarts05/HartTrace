import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { COMPLEXITY_LEVELS, generateRandomDotsWithSolution, makeWallKey } from '../data/puzzle';
import { ClockIcon } from './icons/ClockIcon';
import { ReplayIcon } from './icons/ReplayIcon';
import { useFBInstant } from '../hooks/useFBInstant';
import { shouldReduceAnimations } from '../utils/mobileDetection';
import soundManager from '../utils/soundManager';
import { triggerVictoryConfetti, PulseEffect } from '../utils/visualEffects';
import progressionManager from '../utils/progressionManager';
import serviceWorkerManager from '../utils/serviceWorkerManager';

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
  const lastUpdateRef = useRef(0);
  
  // Enhanced performance caching for coordinate transformations
  const coordinateTransformCacheRef = useRef<{
    svgWidth: number;
    svgHeight: number;
    rect: DOMRect;
    scaleX: number;
    scaleY: number;
    timestamp: number;
  } | null>(null);
  const COORDINATE_CACHE_DURATION = 50;
  
  // Pre-calculated cell positions cache
  const cellPositionCacheRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const cellCacheValidRef = useRef(false);
  
  // Refs for cursor line DOM manipulation (avoids re-renders during drawing)
  const cursorLineRef = useRef<SVGPathElement>(null);
  const cursorDotRef = useRef<SVGCircleElement>(null);
  
  // Facebook Instant Games integration
  const [fbState, fbActions] = useFBInstant();
  
  const [gameState, setGameState] = useState(GAME_STATE.IDLE);
  const [paths, setPaths] = useState<Path[]>([]);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [timer, setTimer] = useState(0);
  const [complexityLevel, setComplexityLevel] = useState(0);
  const [puzzleId, setPuzzleId] = useState(0);
  
  // Initialize puzzle with solution
  const [initialPuzzleState] = useState(() => generateRandomDotsWithSolution(COMPLEXITY_LEVELS[0]));
  
  const [puzzleDots, setPuzzleDots] = useState(() => initialPuzzleState.dots);
  const [puzzleWalls, setPuzzleWalls] = useState<Set<string>>(() => new Set(initialPuzzleState.walls));
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const [validatedSolution, setValidatedSolution] = useState<string[]>(initialPuzzleState.solution);
  const [pathHistory, setPathHistory] = useState<Path[][]>([]);
  const [redoHistory, setRedoHistory] = useState<Path[][]>([]);

  const svgRef = useRef<SVGSVGElement>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const [moveCount, setMoveCount] = useState(0);
  const [showVictoryEffect, setShowVictoryEffect] = useState(false);
  const [globalTimer, setGlobalTimer] = useState(0);
  const [showTip, setShowTip] = useState(false);
  const [solutionPath, setSolutionPath] = useState<string[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(!soundManager.isSoundMuted());
  
  // Initialize sound system
  useEffect(() => {
    soundManager.preloadSounds();
  }, []);
  
  // Initialize background enhancements (service worker)
  useEffect(() => {
    serviceWorkerManager.register();
  }, []);
  
  // Initialize progression from saved state
  useEffect(() => {
    const savedLevel = progressionManager.getCurrentLevel();
    if (savedLevel !== complexityLevel && progressionManager.isLevelUnlocked(savedLevel)) {
      setComplexityLevel(savedLevel);
    }
  }, []);

  const currentComplexity = COMPLEXITY_LEVELS[complexityLevel];
  const totalCells = currentComplexity.gridSize * currentComplexity.gridSize;
  const occupiedCells = useMemo(() => new Set(paths.flatMap(p => p.cells)), [paths]);

  // Enhanced coordinate transformation functions (moved here after currentComplexity is available)
  const getCachedSVGRect = useCallback(() => {
    if (!svgRef.current) return null;
    
    const now = performance.now();
    const cache = coordinateTransformCacheRef.current;
    
    if (cache && (now - cache.timestamp) < COORDINATE_CACHE_DURATION) {
      return cache;
    }
    
    const rect = svgRef.current.getBoundingClientRect();
    const svgWidth = currentComplexity.gridSize * currentComplexity.cellSize;
    const svgHeight = currentComplexity.gridSize * currentComplexity.cellSize;
    
    const newCache = {
      svgWidth,
      svgHeight,
      rect,
      scaleX: svgWidth / rect.width,
      scaleY: svgHeight / rect.height,
      timestamp: now
    };
    
    coordinateTransformCacheRef.current = newCache;
    return newCache;
  }, [currentComplexity]);

  // Enhanced cell position caching
  const getCachedCellPositions = useCallback(() => {
    if (cellCacheValidRef.current && cellPositionCacheRef.current.size > 0) {
      return cellPositionCacheRef.current;
    }
    
    const positions = new Map<string, { x: number; y: number }>();
    const cellSize = currentComplexity.cellSize;
    
    for (let row = 0; row < currentComplexity.gridSize; row++) {
      for (let col = 0; col < currentComplexity.gridSize; col++) {
        const cell = `${row},${col}`;
        positions.set(cell, {
          x: col * cellSize + cellSize / 2,
          y: row * cellSize + cellSize / 2
        });
      }
    }
    
    cellPositionCacheRef.current = positions;
    cellCacheValidRef.current = true;
    return positions;
  }, [currentComplexity]);

  // Performance-optimized coordinate transformation with caching
  const getCachedCoordinateTransform = useCallback(() => {
    if (!svgRef.current) return null;
    
    const now = performance.now();
    const cache = coordinateTransformCacheRef.current;
    
    if (cache && (now - cache.timestamp) < COORDINATE_CACHE_DURATION) {
      return cache;
    }
    
    const rect = getCachedSVGRect();
    if (!rect || rect.svgWidth === 0 || rect.svgHeight === 0) return null;
    
    const transform = {
      svgWidth: rect.svgWidth,
      svgHeight: rect.svgHeight,
      rect: rect.rect,
      scaleX: rect.scaleX,
      scaleY: rect.scaleY,
      timestamp: now
    };
    
    coordinateTransformCacheRef.current = transform;
    return transform;
  }, [getCachedSVGRect]);

  // Clear cell cache when complexity changes
  useEffect(() => {
    cellCacheValidRef.current = false;
    cellPositionCacheRef.current.clear();
  }, [currentComplexity]);

  // Timer system
  useEffect(() => {
    let interval: number;
    if (gameState === GAME_STATE.PLAYING) {
      interval = window.setInterval(() => {
        setTimer(prev => prev + 1);
        setGlobalTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameState]);

  // Helper: hide cursor line elements via refs
  const hideCursorLine = useCallback(() => {
    if (cursorLineRef.current) cursorLineRef.current.style.display = 'none';
    if (cursorDotRef.current) cursorDotRef.current.style.display = 'none';
  }, []);

  // Helper: update cursor line via refs (no re-render)
  const updateCursorLine = useCallback((startX: number, startY: number, endX: number, endY: number) => {
    if (cursorLineRef.current) {
      cursorLineRef.current.setAttribute('d', `M ${startX} ${startY} L ${endX} ${endY}`);
      cursorLineRef.current.style.display = '';
    }
    if (cursorDotRef.current) {
      cursorDotRef.current.setAttribute('cx', String(endX));
      cursorDotRef.current.setAttribute('cy', String(endY));
      cursorDotRef.current.style.display = '';
    }
  }, []);

  const resetGame = useCallback(() => {
    const puzzleResult = generateRandomDotsWithSolution(currentComplexity);
    
    setPaths([]);
    setCurrentPath([]);
    setIsDrawing(false);
    hideCursorLine();
    setTimer(0);
    setGameState(GAME_STATE.IDLE);
    setValidatedSolution(puzzleResult.solution);
    setPuzzleDots(puzzleResult.dots);
    setPuzzleWalls(new Set(puzzleResult.walls));
    setPuzzleId(prev => prev + 1);
    setMoveCount(0);
    setStartTime(Date.now());
    setShowVictoryEffect(false);
    
    if (soundManager && !soundManager.isSoundMuted()) {
      soundManager.playClick();
    }
  }, [currentComplexity, hideCursorLine]);

  const showNotification = useCallback((message: string, type: 'success' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // Save current state to history (called before making changes)
  const saveToHistory = useCallback(() => {
    setPathHistory(prev => [...prev, [...paths]]);
    setRedoHistory([]);
  }, [paths]);

  const undoLastPath = useCallback(() => {
    if (paths.length === 0 && currentPath.length === 0) {
      showNotification('Nothing to undo', 'info');
      return;
    }

    if (currentPath.length > 0) {
      setCurrentPath([]);
      setIsDrawing(false);
      hideCursorLine();
      showNotification('Drawing cleared', 'info');
      return;
    }

    if (paths.length > 0) {
      const lastPath = paths[paths.length - 1];
      setPaths(prev => prev.slice(0, -1));
      setCurrentPath([]);
      setIsDrawing(false);
      hideCursorLine();
      showNotification(`Undid connection ${lastPath.from} \u2192 ${lastPath.to}`, 'info');
    }
  }, [paths, currentPath, showNotification, hideCursorLine]);

  const redoLastPath = useCallback(() => {
    if (redoHistory.length === 0) {
      showNotification('Nothing to redo', 'info');
      return;
    }

    const nextState = redoHistory[redoHistory.length - 1];
    setPathHistory(prev => [...prev, [...paths]]);
    setRedoHistory(prev => prev.slice(0, -1));
    setPaths(nextState);
    setCurrentPath([]);
    setIsDrawing(false);
    hideCursorLine();
    showNotification('Action restored', 'info');
  }, [redoHistory, paths, showNotification, hideCursorLine]);

  // Helper function to find the next dot in the solution path
  const findNextDotInSolution = useCallback((solution: string[], currentIndex: number, dots: any[]) => {
    const dotPositions = new Set<string>();
    dots.forEach(dot => {
      dotPositions.add(`${dot.row},${dot.col}`);
    });
    
    for (let i = currentIndex + 1; i < solution.length; i++) {
      if (dotPositions.has(solution[i])) {
        return i;
      }
    }
    
    return -1;
  }, []);

  const showTipHandler = useCallback(() => {
    if (gameState === GAME_STATE.WON) return;
    
    fbActions.logEvent('tip_requested', 1, { stage: complexityLevel + 1 });
    
    if (!validatedSolution || validatedSolution.length === 0) {
      showNotification('No hint available \u2014 try a new puzzle', 'info');
      return;
    }
    
    const fullSolution = validatedSolution;
    const totalCells = currentComplexity.gridSize * currentComplexity.gridSize;
    
    if (fullSolution.length !== totalCells) {
      showNotification('Puzzle issue \u2014 generating new one', 'info');
      return;
    }
    
    const filledCells = new Set<string>();
    paths.forEach(path => {
      path.cells.forEach(cell => filledCells.add(cell));
    });
    currentPath.forEach(cell => filledCells.add(cell));
    
    let tipPath: string[] = [];
    let startIndex = 0;
    
    if (filledCells.size === 0) {
      const firstDot = puzzleDots.find(dot => dot.num === 1);
      const secondDot = puzzleDots.find(dot => dot.num === 2);
      
      if (firstDot && secondDot) {
        const firstDotCell = `${firstDot.row},${firstDot.col}`;
        const secondDotCell = `${secondDot.row},${secondDot.col}`;
        const firstDotIndex = fullSolution.indexOf(firstDotCell);
        const secondDotIndex = fullSolution.indexOf(secondDotCell);
        
        if (firstDotIndex >= 0 && secondDotIndex > firstDotIndex) {
          const endIndex = Math.min(secondDotIndex + 8, fullSolution.length);
          tipPath = fullSolution.slice(0, endIndex);
        }
      }
      
      if (tipPath.length === 0) {
        tipPath = fullSolution.slice(0, Math.min(20, fullSolution.length));
      }
    } else {
      let lastMatchIndex = -1;
      for (let i = 0; i < fullSolution.length; i++) {
        if (filledCells.has(fullSolution[i])) {
          lastMatchIndex = i;
        }
      }
      
      if (lastMatchIndex >= 0) {
        const nextDotIndex = findNextDotInSolution(fullSolution, lastMatchIndex, puzzleDots);
        
        if (nextDotIndex >= 0) {
          startIndex = lastMatchIndex + 1;
          const endIndex = Math.min(nextDotIndex + 15, fullSolution.length);
          tipPath = fullSolution.slice(startIndex, endIndex);
        } else {
          startIndex = lastMatchIndex + 1;
          const endIndex = Math.min(startIndex + 25, fullSolution.length);
          tipPath = fullSolution.slice(startIndex, endIndex);
        }
      } else {
        const firstDot = puzzleDots.find(dot => dot.num === 1);
        if (firstDot) {
          const firstDotCell = `${firstDot.row},${firstDot.col}`;
          const firstDotIndex = fullSolution.indexOf(firstDotCell);
          if (firstDotIndex >= 0) {
            tipPath = fullSolution.slice(0, Math.min(firstDotIndex + 12, fullSolution.length));
          }
        }
      }
    }
    
    if (tipPath.length === 0) {
      showNotification('Almost there!', 'info');
      return;
    }
    
    setSolutionPath(tipPath);
    setShowTip(true);
    
    let tipMessage = 'Hint: Follow the yellow path!';
    if (filledCells.size === 0) {
      tipMessage = 'Hint: Start from dot 1 and follow the yellow path to dot 2!';
    } else {
      const nextDotNum = paths.length + 2;
      if (nextDotNum <= puzzleDots.length) {
        tipMessage = `Hint: Follow the yellow path to reach dot ${nextDotNum}!`;
      } else {
        tipMessage = 'Hint: Follow the yellow path to complete the puzzle!';
      }
    }
    
    showNotification(tipMessage, 'info');
    
    setTimeout(() => {
      setShowTip(false);
      setSolutionPath([]);
    }, 15000);
  }, [gameState, validatedSolution, paths, currentPath, fbActions, complexityLevel, showNotification, puzzleDots, findNextDotInSolution, currentComplexity]);

  const startNewGame = useCallback(() => {
    fbActions.logEvent('new_game_started', 1, { stage: complexityLevel + 1 });
    
    const puzzleResult = generateRandomDotsWithSolution(currentComplexity);
    
    setPuzzleDots(puzzleResult.dots);
    setPuzzleWalls(new Set(puzzleResult.walls));
    setValidatedSolution(puzzleResult.solution);
    setPuzzleId(prev => prev + 1);
    
    setPaths([]);
    setCurrentPath([]);
    setIsDrawing(false);
    hideCursorLine();
    setTimer(0);
    setGameState(GAME_STATE.IDLE);
    setShowTip(false);
    setSolutionPath([]);
    setPathHistory([]);
    setRedoHistory([]);
    
    showNotification('New puzzle ready', 'info');
  }, [currentComplexity, complexityLevel, showNotification, fbActions, hideCursorLine]);

  const advanceToNextLevel = useCallback(() => {
    const nextLevel = Math.min(complexityLevel + 1, COMPLEXITY_LEVELS.length - 1);
    const newComplexity = COMPLEXITY_LEVELS[nextLevel];
    
    showNotification(`Stage ${complexityLevel + 1} complete!`, 'success');
    
    setTimeout(() => {
      try {
        const puzzleResult = generateRandomDotsWithSolution(newComplexity);
        
        setComplexityLevel(nextLevel);
        setPuzzleDots(puzzleResult.dots);
        setPuzzleWalls(new Set(puzzleResult.walls));
        setValidatedSolution(puzzleResult.solution);
        setPuzzleId(prev => prev + 1);
        setPaths([]);
        setCurrentPath([]);
        setIsDrawing(false);
        hideCursorLine();
        setTimer(0);
        setGameState(GAME_STATE.IDLE);
        setShowTip(false);
        setSolutionPath([]);
        setPathHistory([]);
        setRedoHistory([]);
        
        if (nextLevel + 1 === 12) {
          showNotification('Final stage \u2014 good luck!', 'success');
        } else {
          showNotification(`Stage ${nextLevel + 1} ready`, 'success');
        }
      } catch (error) {
        showNotification(`Error generating Stage ${nextLevel + 1}. Please try again.`, 'info');
      }
    }, 1000);
  }, [complexityLevel, showNotification, hideCursorLine]);

  const getCellFromEvent = useCallback((e: PointEvent): string | null => {
    if (!svgRef.current) return null;
    
    try {
      const transform = getCachedCoordinateTransform();
      if (!transform) return null;
      
      const x = e.clientX - transform.rect.left;
      const y = e.clientY - transform.rect.top;
      
      const svgX = x * transform.scaleX;
      const svgY = y * transform.scaleY;
      
      const col = Math.floor(svgX / currentComplexity.cellSize);
      const row = Math.floor(svgY / currentComplexity.cellSize);
      
      if (col < 0 || col >= currentComplexity.gridSize || row < 0 || row >= currentComplexity.gridSize) {
        return null;
      }
      
      return `${row},${col}`;
    } catch {
      return null;
    }
  }, [currentComplexity, getCachedCoordinateTransform]);

  // Optimized cell center calculation using pre-calculated cache
  const getCenterOfCell = useCallback((cell: string): { x: number, y: number } => {
    const cellPositions = getCachedCellPositions();
    const cached = cellPositions.get(cell);
    
    if (cached) {
      return cached;
    }
    
    const [row, col] = cell.split(',').map(Number);
    return {
      x: col * currentComplexity.cellSize + currentComplexity.cellSize / 2,
      y: row * currentComplexity.cellSize + currentComplexity.cellSize / 2,
    };
  }, [getCachedCellPositions, currentComplexity.cellSize]);

  // Helper: get SVG coordinates from a pointer event
  const getSVGCoords = useCallback((point: PointEvent): { svgX: number; svgY: number } | null => {
    if (!svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    const x = point.clientX - rect.left;
    const y = point.clientY - rect.top;
    const svgWidth = currentComplexity.gridSize * currentComplexity.cellSize;
    const svgHeight = currentComplexity.gridSize * currentComplexity.cellSize;
    const svgX = (x / rect.width) * svgWidth;
    const svgY = (y / rect.height) * svgHeight;
    if (isNaN(svgX) || isNaN(svgY)) return null;
    return { svgX, svgY };
  }, [currentComplexity]);

  // Interpolate a line of grid cells between two cells (Bresenham-style stepping)
  // Returns array of cells from `from` (exclusive) to `to` (inclusive)
  // Only returns orthogonal (horizontal/vertical) steps
  const interpolateCells = useCallback((from: string, to: string): string[] => {
    const [r1, c1] = from.split(',').map(Number);
    const [r2, c2] = to.split(',').map(Number);
    
    if (r1 === r2 && c1 === c2) return [];
    
    const cells: string[] = [];
    let cr = r1, cc = c1;
    const maxSteps = Math.abs(r2 - r1) + Math.abs(c2 - c1);
    
    for (let step = 0; step < maxSteps; step++) {
      // Move one step closer: prefer the axis with larger remaining distance
      const dr = r2 - cr;
      const dc = c2 - cc;
      
      if (Math.abs(dr) >= Math.abs(dc)) {
        cr += dr > 0 ? 1 : -1;
      } else {
        cc += dc > 0 ? 1 : -1;
      }
      
      const gs = currentComplexity.gridSize;
      if (cr < 0 || cr >= gs || cc < 0 || cc >= gs) break;
      
      cells.push(`${cr},${cc}`);
    }
    
    return cells;
  }, [currentComplexity.gridSize]);

  const handleInteractionStart = useCallback((e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'mousedown' && (e as React.MouseEvent).button !== 0) return;
    if (gameState === GAME_STATE.WON) return;
    
    const point = 'touches' in e ? e.touches[0] : e;
    if (!point) return;

    if (gameState === GAME_STATE.IDLE) {
      setGameState(GAME_STATE.PLAYING);
      setStartTime(Date.now());
      if (soundEnabled) {
        soundManager.playClick();
      }
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
        if (showTip) {
          setShowTip(false);
          setSolutionPath([]);
        }
        setIsDrawing(true);
        
        // Update cursor line via ref for immediate feedback
        const coords = getSVGCoords(point);
        if (coords) {
          const lastCenter = getCenterOfCell(lastCell);
          updateCursorLine(lastCenter.x, lastCenter.y, coords.svgX, coords.svgY);
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
      
      // Check wall between cells
      const wallBlocked = isAdjacent && puzzleWalls.has(makeWallKey(lastCell, cell));
      
      // Rule 5: Path cannot cross itself
      if (isAdjacent && !wallBlocked && !currentPath.includes(cell) && !occupiedCells.has(cell)) {
        if (showTip) {
          setShowTip(false);
          setSolutionPath([]);
        }
        setIsDrawing(true);
        setCurrentPath(prev => [...prev, cell]);
        setMoveCount(prev => prev + 1);
        
        if (soundEnabled && soundManager && !soundManager.isSoundMuted()) {
          soundManager.playDraw();
        }
        return;
      }
    }
    
    // For new paths, ensure we start at the next dot (Rule 3: ascending order)
    if (cell === startDotCell) {
      if (showTip) {
        setShowTip(false);
        setSolutionPath([]);
      }
      setRedoHistory([]);
      
      setCurrentPath([startDotCell]);
      setIsDrawing(true);
      setMoveCount(prev => prev + 1);
      
      if (soundEnabled && soundManager && !soundManager.isSoundMuted()) {
        soundManager.playClick();
      }
      
      // Update cursor line via ref for immediate feedback
      const coords = getSVGCoords(point);
      if (coords) {
        const dotCenter = getCenterOfCell(startDotCell);
        updateCursorLine(dotCenter.x, dotCenter.y, coords.svgX, coords.svgY);
      }
    } else {
      showNotification(`Start from dot ${nextDotNumber}`, 'info');
    }
  }, [gameState, paths, puzzleDots, getCellFromEvent, occupiedCells, showNotification, currentPath, showTip, soundEnabled, getSVGCoords, getCenterOfCell, updateCursorLine, puzzleWalls]);

  const handleInteractionMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDrawing) return;
    
    // 60fps cap for smooth drawing
    const now = performance.now();
    if (now - lastUpdateRef.current < 16) return;
    lastUpdateRef.current = now;
    
    if (e.type === 'mousemove' && e.cancelable) {
      e.preventDefault();
    }

    const point = 'touches' in e ? e.touches[0] : e;
    if (!point) return;

    // Update cursor line via DOM refs (no re-render)
    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      
      const x = point.clientX - rect.left;
      const y = point.clientY - rect.top;
      const svgWidth = currentComplexity.gridSize * currentComplexity.cellSize;
      const svgHeight = currentComplexity.gridSize * currentComplexity.cellSize;
      const svgX = (x / rect.width) * svgWidth;
      const svgY = (y / rect.height) * svgHeight;
      
      if (isNaN(svgX) || isNaN(svgY)) return;

      // Calculate start point for the cursor line
      let startPoint: { x: number; y: number } | null = null;
      if (currentPath.length === 0) {
        const firstDot = puzzleDots.find(dot => dot.num === 1);
        if (firstDot) {
          startPoint = getCenterOfCell(`${firstDot.row},${firstDot.col}`);
        }
      } else {
        startPoint = getCenterOfCell(currentPath[currentPath.length - 1]);
      }

      if (startPoint) {
        updateCursorLine(startPoint.x, startPoint.y, svgX, svgY);
      }
    }
    
    // Handle cell-based path updates only when entering new valid cells
    const cell = getCellFromEvent(point);
    if (!cell) return;
    
    if (currentPath.length === 0) {
      const firstDot = puzzleDots.find(dot => dot.num === 1);
      if (firstDot && cell === `${firstDot.row},${firstDot.col}`) {
        setCurrentPath([cell]);
        return;
      } else {
        return;
      }
    }
    
    const lastCellInPath = currentPath[currentPath.length - 1];
    if (cell === lastCellInPath) return;

    // Handle backtracking first: if the cursor moves back onto a cell already in the path,
    // trim the path to that cell (allows natural undo by retracing)
    const cellIndexInPath = currentPath.indexOf(cell);
    if (cellIndexInPath >= 0 && cellIndexInPath < currentPath.length - 1) {
      setCurrentPath(prev => prev.slice(0, cellIndexInPath + 1));
      return;
    }

    // Build list of candidate cells to add (supports fast dragging via interpolation)
    const intermediates = interpolateCells(lastCellInPath, cell);
    // If the target cell is directly adjacent use it, otherwise use interpolated path
    const cellsToAdd = intermediates.length > 0 ? intermediates : [cell];
    
    // Process each intermediate cell
    let workingPath = [...currentPath];
    let workingPaths = [...paths];
    let pathChanged = false;
    let victoryTriggered = false;
    
    for (const candidateCell of cellsToAdd) {
      const lastCell = workingPath[workingPath.length - 1];
      const [lastRow, lastCol] = lastCell.split(',').map(Number);
      const [candRow, candCol] = candidateCell.split(',').map(Number);
      
      const rowDiff = Math.abs(lastRow - candRow);
      const colDiff = Math.abs(lastCol - candCol);
      const isAdjacent = (rowDiff === 0 && colDiff === 1) || (rowDiff === 1 && colDiff === 0);
      
      if (!isAdjacent) break;
      
      // Check wall between cells
      if (puzzleWalls.has(makeWallKey(lastCell, candidateCell))) break;
      
      // Rule 5: Path cannot cross itself or enter occupied cells
      if (workingPath.includes(candidateCell)) break;
      
      const isOccupiedByCompletedPath = occupiedCells.has(candidateCell);
      if (isOccupiedByCompletedPath) break;
      
      // Rule 3: Visit numbered cells in ascending order
      const currentPathNum = workingPaths.length + 1;
      const nextExpectedDotNum = currentPathNum + 1;
      
      const dotAtCell = puzzleDots.find(dot => `${dot.row},${dot.col}` === candidateCell);
      
      if (dotAtCell && dotAtCell.num !== nextExpectedDotNum) {
        // Wrong dot in sequence - stop here
        break;
      }
      
      workingPath = [...workingPath, candidateCell];
      pathChanged = true;
      
      // Check if we've reached the next numbered dot
      const nextDotNum = currentPathNum + 1;
      const nextDot = puzzleDots.find(d => d.num === nextDotNum);
      
      if (nextDot && candidateCell === `${nextDot.row},${nextDot.col}`) {
        // Complete this path segment
        saveToHistory();
        
        const newPath: Path = { from: currentPathNum, to: nextDotNum, cells: [...workingPath] };
        workingPaths = [...workingPaths, newPath];
        
        const isLastDot = nextDotNum === puzzleDots.length;
        const allCellsAfterPath = new Set(workingPaths.flatMap(p => p.cells));
        const allCellsFilled = allCellsAfterPath.size === totalCells;
        
        if (isLastDot && allCellsFilled) {
          // VICTORY!
          const completionTime = timer;
          const totalMoves = moveCount;
          const isPerfectRun = true;
          
          fbActions.logEvent('stage_completed', complexityLevel + 1, {
            stage: complexityLevel + 1,
            time: timer,
            paths: workingPaths.length,
            complexity: currentComplexity.description
          });
          
          if (fbState.isInitialized) {
            const score = Math.max(1, 10000 - timer * 10);
            fbActions.submitScore('main_leaderboard', score, {
              stage: complexityLevel + 1,
              time: timer,
              complexity: currentComplexity.description
            });
          }
          
          progressionManager.completeLevel(
            complexityLevel, 
            completionTime, 
            totalMoves, 
            isPerfectRun
          );
          
          progressionManager.getPlayerStats().totalPlayTime = globalTimer;
          
          setShowVictoryEffect(true);
          
          if (soundEnabled) {
            soundManager.playComplete();
          }
          
          setTimeout(() => {
            triggerVictoryConfetti({
              particleCount: 150,
              spread: 90,
              origin: { y: 0.6 }
            });
          }, 200);
          
          showNotification('Puzzle solved!', 'success');
          setPaths(workingPaths);
          setGameState(GAME_STATE.WON);
          setCurrentPath([]);
          setIsDrawing(false);
          hideCursorLine();
          victoryTriggered = true;
          break;
        }
        
        // Continue to next segment
        if (nextDotNum < puzzleDots.length) {
          workingPath = [candidateCell];
        } else {
          workingPath = [];
          break;
        }
      }
    }
    
    if (victoryTriggered) return;
    
    if (pathChanged) {
      if (showTip || solutionPath.length > 0) {
        setShowTip(false);
        setSolutionPath([]);
      }
      
      if (workingPaths.length > paths.length) {
        React.startTransition(() => {
          setPaths(workingPaths);
          setCurrentPath(workingPath);
        });
      } else {
        setCurrentPath(workingPath);
      }
    }
  }, [
    isDrawing,
    currentPath, 
    occupiedCells, 
    getCellFromEvent, 
    paths, 
    puzzleDots, 
    currentComplexity,
    totalCells,
    fbActions,
    complexityLevel,
    timer,
    fbState.isInitialized,
    showNotification,
    getCenterOfCell,
    updateCursorLine,
    hideCursorLine,
    saveToHistory,
    showTip,
    solutionPath,
    moveCount,
    globalTimer,
    soundEnabled,
    interpolateCells,
    puzzleWalls
  ]);

  const handleInteractionEnd = useCallback(() => {
    if (!isDrawing) return;
    
    setIsDrawing(false);
    hideCursorLine();
  }, [isDrawing, hideCursorLine]);

  useEffect(() => {
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

  // Optimized path data generation with pre-calculated cell positions
  const getPathData = useCallback((cells: string[]) => {
    if (cells.length === 0) return "";
    
    const cellPositions = getCachedCellPositions();
    
    return cells.map((cell, i) => {
      const pos = cellPositions.get(cell);
      if (!pos) {
        const { x, y } = getCenterOfCell(cell);
        return (i === 0 ? 'M' : 'L') + `${x} ${y}`;
      }
      return (i === 0 ? 'M' : 'L') + `${pos.x} ${pos.y}`;
    }).join(' ');
  }, [getCachedCellPositions, getCenterOfCell]);
  
  // Memoized grid lines for better performance
  const gridLines = useMemo(() => {
    const { gridSize, cellSize } = currentComplexity;
    const totalSize = gridSize * cellSize;
    
    return Array.from({ length: gridSize + 1 }).map((_, i) => {
      const pos = i * cellSize;
      return (
        <g key={i} className="text-slate-700 pointer-events-none">
          <line x1={pos} y1="0" x2={pos} y2={totalSize} stroke="currentColor" strokeWidth="1" />
          <line x1="0" y1={pos} x2={totalSize} y2={pos} stroke="currentColor" strokeWidth="1" />
        </g>
      );
    });
  }, [currentComplexity.gridSize, currentComplexity.cellSize]);

  // Memoized wall rendering - thick borders between cells the path cannot cross
  const wallElements = useMemo(() => {
    if (puzzleWalls.size === 0) return null;
    const { cellSize } = currentComplexity;
    const wallThickness = 4;
    
    return Array.from(puzzleWalls).map((wallKey) => {
      const [cellA, cellB] = wallKey.split('|');
      const [r1, c1] = cellA.split(',').map(Number);
      const [r2, c2] = cellB.split(',').map(Number);
      
      let x1: number, y1: number, x2: number, y2: number;
      
      if (r1 === r2) {
        // Horizontal neighbors: wall is vertical line between them
        const col = Math.max(c1, c2);
        x1 = col * cellSize;
        y1 = r1 * cellSize;
        x2 = col * cellSize;
        y2 = (r1 + 1) * cellSize;
      } else {
        // Vertical neighbors: wall is horizontal line between them
        const row = Math.max(r1, r2);
        x1 = c1 * cellSize;
        y1 = row * cellSize;
        x2 = (c1 + 1) * cellSize;
        y2 = row * cellSize;
      }
      
      return (
        <line
          key={wallKey}
          x1={x1} y1={y1} x2={x2} y2={y2}
          stroke="#f97316"
          strokeWidth={wallThickness}
          strokeLinecap="round"
          className="pointer-events-none"
        />
      );
    });
  }, [puzzleWalls, currentComplexity]);

  const nextDot = puzzleDots[paths.length];
  
  // Rule 4: Fill entire grid with one path - combine all path segments
  const allPathsData = useMemo(() => {
    const allCells: string[] = [];
    
    paths.forEach((path, index) => {
      if (index === 0) {
        allCells.push(...path.cells);
      } else {
        allCells.push(...path.cells.slice(1));
      }
    });
    
    if (currentPath.length > 0) {
      if (paths.length > 0) {
        const lastCompletedPath = paths[paths.length - 1];
        const lastCell = lastCompletedPath.cells[lastCompletedPath.cells.length - 1];
        const firstCurrentCell = currentPath[0];
        
        if (lastCell === firstCurrentCell) {
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

  // Memoized dots rendering with reduced re-calculations
  const dotsElements = useMemo(() => {
    const cellSize = currentComplexity.cellSize;
    const halfCell = cellSize / 2;
    
    return puzzleDots.map(({ num, row, col }) => {
      const cellKey = `${row},${col}`;
      const isConnected = occupiedCells.has(cellKey) || currentPath.includes(cellKey);
      const isNext = num === nextDot?.num;
      const isStart = num === 1;
      const isEnd = num === puzzleDots.length;
      
      const x = col * cellSize + halfCell;
      const y = row * cellSize + halfCell;
      
      return (
        <g key={`${puzzleId}-${num}`} transform={`translate(${x}, ${y})`}>
          {/* Subtle ring indicators for start and end dots */}
          {isStart && (
            <circle r="18" fill="none" stroke="#10b981" strokeWidth="2.5" opacity="0.5" />
          )}
          {isEnd && (
            <circle r="18" fill="none" stroke="#ef4444" strokeWidth="2.5" opacity="0.5" strokeDasharray="5,5" className={reducedAnimations ? "" : "animate-pulse"} />
          )}
          
          <circle r="15" fill={isConnected ? '#0ea5e9' : '#1e293b'} className="transition-colors"/>
          
          {/* Pulsing indicator for next dot */}
          {isNext && gameState !== GAME_STATE.WON && (
            <circle r="18" fill="none" stroke="#22d3ee" strokeWidth="2" className={reducedAnimations ? "" : "animate-pulse"} />
          )}
          
          <text 
            textAnchor="middle" 
            dy=".3em" 
            fill={isStart ? '#10b981' : isEnd ? '#ef4444' : 'white'} 
            fontSize="16" 
            fontWeight="bold"
          >
            {num}
          </text>
        </g>
      );
    });
  }, [puzzleDots, occupiedCells, currentPath, nextDot, puzzleId, currentComplexity.cellSize, reducedAnimations, gameState]);

  // Check for win condition when paths or currentPath changes
  useEffect(() => {
    if (gameState !== GAME_STATE.PLAYING) return;
    
    const allCellsFromPaths = new Set(paths.flatMap(p => p.cells));
    const allDotsConnected = paths.length === puzzleDots.length - 1;
    const allCellsFilled = allCellsFromPaths.size === totalCells;
    
    if (allDotsConnected && allCellsFilled) {
      fbActions.logEvent('stage_completed', complexityLevel + 1, {
        stage: complexityLevel + 1,
        time: timer,
        paths: paths.length,
        complexity: currentComplexity.description
      });
      
      if (fbState.isInitialized) {
        const score = Math.max(1, 10000 - timer * 10);
        fbActions.submitScore('main_leaderboard', score, {
          stage: complexityLevel + 1,
          time: timer,
          complexity: currentComplexity.description
        });
      }
      
      showNotification('Puzzle solved!', 'success');
      setGameState(GAME_STATE.WON);
      setCurrentPath([]);
      setIsDrawing(false);
      hideCursorLine();
    }
  }, [paths, currentPath, gameState, puzzleDots.length, totalCells, complexityLevel, timer, currentComplexity, fbActions, fbState, showNotification, hideCursorLine]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState === GAME_STATE.WON) return;
      
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undoLastPath();
      }
      
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

  return (
    <div 
      className="w-full min-h-screen bg-gradient-main p-2 relative overflow-hidden game-area"
      onDragStart={(e) => e.preventDefault()}
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
      
      {/* Game Container */}
      <div className="game-container">
        {/* Game Title with Inline Logo */}
        <div className="game-title">
          <h1>
            H
            <picture>
              <source srcSet="/hart-logo.webp" type="image/webp" />
              <img 
                src="/hart-logo.png" 
                alt="a" 
                className="inline-logo"
              />
            </picture>
            rtTrace
          </h1>
        </div>
        
        {/* Header Section */}
        <div className="header-section">
          <div className="flex flex-col items-center gap-2">
            <div className="stage-info">
              <div className="stage-title">
                <span className="stage-number">Stage {complexityLevel + 1}</span>
                <span className="stage-difficulty">{currentComplexity.difficulty}</span>
              </div>
              <span className="stage-grid-info">{currentComplexity.gridSize}×{currentComplexity.gridSize} grid · {currentComplexity.numDots} dots</span>
              {fbState.isInitialized && fbState.playerName !== 'Player' && (
                <span className="player-name">{fbState.playerName}</span>
              )}
            </div>
            
            <div className="timer-container">
              <ClockIcon className="icon-base"/>
              <span className="timer-time">{new Date(timer * 1000).toISOString().substr(14, 5)}</span>
              <span className="move-counter">• Total: {new Date(globalTimer * 1000).toISOString().substr(14, 5)}</span>
            </div>
          </div>
          {/* Controls - 4 Main Buttons: Reset, Undo, New, Hint */}
          <div className="controls-grid">
            <button onClick={resetGame} className="control-button reset">
                <ReplayIcon className="icon-sm" />
                <span className="hidden-sm">Reset</span>
            </button>
            <button 
              onClick={undoLastPath}
              disabled={paths.length === 0 && currentPath.length === 0}
              className={`control-button ${paths.length === 0 && currentPath.length === 0 ? 'undo disabled' : 'undo'}`}
            >
                <span className="text-xs">↩</span>
                <span className="hidden-sm">Undo</span>
            </button>
            <button 
              onClick={startNewGame}
              className="control-button new-puzzle"
            >
                <span className="text-xs">✦</span>
                <span className="hidden-sm">New</span>
            </button>
            <button 
              onClick={showTipHandler}
              className="control-button level-map"
            >
                <span className="text-xs">💡</span>
                <span className="hidden-sm">Hint</span>
            </button>
          </div>
        </div>

        {/* Game Board with Victory Effects */}
        <PulseEffect trigger={showVictoryEffect}>
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

            {/* Walls - Thick borders between cells */}
            {wallElements}

            {/* Drawn Paths */}
            <g className="pointer-events-none">
              {/* Rule 4: Render all paths as one continuous line */}
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
              
              {/* Live cursor line - updated via refs for performance */}
              <path
                ref={cursorLineRef}
                stroke="url(#cursor-gradient)"
                strokeWidth="12"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                opacity="0.85"
                style={{ display: 'none' }}
              />
              <circle
                ref={cursorDotRef}
                r="6"
                fill="#22d3ee"
                opacity="0.9"
                style={{ display: 'none' }}
              />
              
              {/* Tip/Solution path */}
              {showTip && solutionPath.length > 0 && (
                <g>
                  <path 
                    d={getPathData(solutionPath)} 
                    stroke="#fbbf24" 
                    strokeWidth="16" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    fill="none" 
                    opacity="0.3"
                    strokeDasharray="20,15"
                    className={reducedAnimations ? "" : "animate-pulse"}
                  />
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
                  <path 
                    d={getPathData(solutionPath)} 
                    stroke="#ffffff" 
                    strokeWidth="6" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    fill="none" 
                    opacity="0.6"
                    strokeDasharray="8,12"
                    className={reducedAnimations ? "" : "tip-path-animated"}
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
              <linearGradient id="cursor-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#67e8f9" />
              </linearGradient>
              <linearGradient id="tip-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        </PulseEffect>
        
        {/* Instructions */}
        <div className="instructions">
          <div className="instructions-text">
            Connect <span className="instructions-start">{1}</span> to <span className="instructions-end">{puzzleDots[puzzleDots.length - 1].num}</span> in order. Fill every cell.
          </div>
        </div>
      </div>
      
      {/* Loading state for Facebook initialization */}
      {fbState.isSupported && fbState.isLoading && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="loading-spinner"></div>
            <p className="loading-text">Loading Facebook Instant Game...</p>
          </div>
        </div>
      )}

      {/* Victory Screen Overlay */}
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
                    Next Stage →
                  </button>
                ) : (
                  <div className="victory-complete">
                    All Stages Complete!
                  </div>
                )}
                
                <button 
                  onClick={startNewGame}
                  className="victory-button new"
                >
                  New Puzzle
                </button>
                
                <button 
                  onClick={resetGame}
                  className="victory-button retry"
                >
                  Try Again
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
                      Share Victory
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
