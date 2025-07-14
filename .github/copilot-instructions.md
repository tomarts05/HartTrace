# HartTrace Puzzle Game - AI Agent Instructions

## Project Overview
HartTrace is a mobile-first Facebook Instant Game built with React + TypeScript. Players connect numbered dots in sequence while filling every grid cell, following 6 strict gameplay rules. Features a sophisticated 12-stage progression system with unique pattern algorithms and premium glassmorphism UI design.

## Architecture & Key Components

### Core Game Logic (`components/PuzzleGame.tsx`)
- **Monolithic component** (~1600+ lines) containing all game state, interaction logic, and rendering
- **React hooks state management**: No external state library - uses useState/useEffect extensively
- **6 immutable game rules**: Defined in README.md, absolutely critical to preserve
- **Path system**: `Path[] = {from: number, to: number, cells: string[]}` for dot connections
- **Grid coordinates**: Always `"row,col"` string format (e.g., `"2,3"`) - never objects
- **Performance-optimized drawing**: `penPathRef.current` for high-frequency cursor tracking
- **Dual timer system**: Stage timer (resets per level) + globalTimer (total progress)

### Pattern Generation System (`data/puzzle.ts`)
- **12 unique algorithms**: Each stage uses distinct pattern - snake, spiral, zigzag, L-shape, diamond, cross, wave, U-turn, complex, fractal, labyrinth, maze
- **Critical constraint**: Last numbered dot MUST be at `patternPath[patternPath.length - 1]`
- **Pattern functions**: Dedicated generators like `createSpiralPath()`, `createMazePath()` with comprehensive logging
- **Stage mapping**: `COMPLEXITY_LEVELS[0-11]` array ensures pattern variety across 12 stages
- **Guaranteed solvability**: Pattern-based generation eliminates need for complex validation

### Facebook Platform Integration (`hooks/useFBInstant.ts` + `utils/fbInstant.ts`)
- **Hook pattern**: `useFBInstant()` returns `[state, actions]` tuple
- **Graceful fallback**: Full functionality without FB SDK for web deployment
- **CSP compliance**: Vite config enforces strict Content Security Policy for FB platform
- **Social features**: Score sharing, leaderboards, player info, analytics logging

## Critical Development Patterns

### Coordinate System & Performance
```typescript
// Grid coordinates: ALWAYS "row,col" string format
const cell = `${row},${col}`;
const [row, col] = cell.split(',').map(Number);

// High-frequency drawing: Use refs to avoid state thrashing
const penPathRef = useRef<{ x: number, y: number }[]>([]);
penPathRef.current.push({ x: svgX, y: svgY });

// Batch state updates for smooth performance
requestAnimationFrame(() => {
  setComplexityLevel(newLevel);
  setPaths([]);
});
```

### Game State Management
```typescript
// Simple constants for game states
const GAME_STATE = { IDLE: 'idle', PLAYING: 'playing', WON: 'won' };

// Dual timer system for progress tracking
const [timer, setTimer] = useState(0);           // Stage timer (resets)
const [globalTimer, setGlobalTimer] = useState(0); // Total progress

// Stage progression: Starts at index 1 (Medium), not 0
const [complexityLevel, setComplexityLevel] = useState(1);
```

### Pattern Generation Architecture
```typescript
// Each stage gets unique pattern from COMPLEXITY_LEVELS array
function createPatternByType(gridSize: number, startRow: number, startCol: number, patternType: string): string[] {
  switch (patternType) {
    case 'spiral': return createSpiralPath(gridSize, startRow, startCol);
    case 'maze': return createMazePath(gridSize, startRow, startCol);
    // 12 unique patterns total
  }
}

// Critical: Last dot placement constraint
pathIndex = solutionPath.length - 1; // Always final position
```

## Build & Development

### Commands & Deployment
- `npm run dev` - Vite development server with hot reload
- `npm run build` - Production build optimized for Facebook Instant Games
- `npm run preview` - Preview production build locally

### Facebook Instant Games Deployment
- Vite config enforces CSP compliance with `inlineDynamicImports: true`
- Build outputs to `dist/` - upload contents directly to Facebook Developer Console
- NO external CDN dependencies - all assets must be inlined
- CSP headers configured in `vite.config.ts` for platform compliance

## Code Conventions & Patterns

### File Structure
- **Flat component structure**: `/components` directory with no deep nesting
- **Data separation**: All game logic algorithms in `/data/puzzle.ts`
- **Utility splitting**: FB integration split between `/hooks` and `/utils`
- **Backup preservation**: `.backup.tsx` files preserve working versions

### Critical Patterns
```typescript
// Coordinates: NEVER use objects, always strings
const cell = `${row},${col}`;  // ✅ Correct
const cell = { row, col };     // ❌ Wrong

// Pattern functions: Consistent naming
create[PatternName]Path(gridSize, startRow, startCol): string[]

// State updates: Always immutable
setPaths([...paths, newPath]);  // ✅ Correct
paths.push(newPath);           // ❌ Wrong
```

### Performance Guidelines
- **High-frequency operations**: Use `useRef` (pen tracking, cursor position)
- **State batching**: Group updates in `requestAnimationFrame` calls
- **Memory management**: Clear refs with `penPathRef.current = []`

## Debugging & Issue Resolution

### Console Logging Strategy
```typescript
// Pattern generation: Emoji-based identification
console.log('🎯 Creating spiral pattern for 6x6 grid');
console.log('✅ PATTERN COMPLETE: 36 cells - CLOCKWISE INWARD SPIRAL');

// Victory debugging: Stage progression validation
console.log('🏆 VICTORY DEBUG:', { 
  complexityLevel, 
  shouldShowNext: complexityLevel < COMPLEXITY_LEVELS.length - 1 
});

// Order validation: User interaction blocking
console.log('❌ BLOCKED APPROACH: Cannot approach dot X, must reach dot Y first');
```

### Common Critical Issues
- **END dot placement**: Verify last dot at `patternPath[patternPath.length - 1]` (never middle)
- **Stage progression**: Victory condition `complexityLevel < COMPLEXITY_LEVELS.length - 1`
- **Coordinate conversion**: SVG screen-to-grid mapping needs debugging logs
- **FB SDK timing**: Check `fbState.isInitialized` before using Facebook features
- **Adjacency validation**: Use `validatePathAdjacency()` for diagonal move prevention

## Development Rules

### Non-Negotiable Constraints
1. **6 game rules**: Defined in README.md - absolutely immutable
2. **Pattern integrity**: Each stage MUST use designated `COMPLEXITY_LEVELS` pattern type
3. **END dot constraint**: Last numbered dot placement at final pattern position only
4. **Coordinate format**: String `"row,col"` format throughout entire codebase
5. **Mobile-first**: All interactions must work on touch devices

### Testing Requirements
- **Dual platform**: Verify functionality with/without Facebook SDK
- **Performance**: Use `requestAnimationFrame` for state transitions, refs for high-frequency ops
- **Stage validation**: Test all 12 stages for victory condition handling
- **Timer systems**: Maintain distinction between stage timer and global progress timer

### When Making Changes
- Preserve emoji-based console logging for debugging identification
- Test touch interactions on actual mobile devices
- Validate pattern generation produces solvable puzzles
- Ensure state remains consistent after any user interaction
- Batch related state updates for smooth performance

## Key Dependencies & Tech Stack

### Core Technologies
- **React 19.1.0**: Modern hooks-based architecture with concurrent features
- **TypeScript ~5.7.2**: Strict typing throughout with interface-driven design
- **Vite 6.2.0**: Build tool with HMR and optimized production bundling
- **Framer Motion 12.23.0**: SVG animations and smooth state transitions

### Game-Specific Libraries
- **lodash 4.17.21**: Utility functions for array/object manipulation
- **Custom glassmorphism CSS**: Premium UI with backdrop-filter effects in `public/styles.css`
- **No game frameworks**: Pure React implementation for maximum control

### Facebook Integration Stack
- **FBInstant SDK**: Via global window object, no npm package
- **Singleton pattern**: `FBInstantManager` class for state management
- **Graceful fallback**: Full web functionality without FB SDK present
