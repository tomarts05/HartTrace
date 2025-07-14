# Facebook Instant Puzzle Game

A mobile-optimized puzzle game designed for Facebook Instant Games and Instagram.

## Features

- Touch-optimized grid-based puzzle game
- Facebook Instant Games integration
- Instagram deep-link support
- Mobile-first responsive design
- CSP-compliant (no external resources)

## How to Play

The game follows these core rules that must be maintained in all updates:

1. **Start at cell with number 1** - Always begin drawing from the first numbered cell
2. **Connect adjacent cells (no diagonals)** - Only horizontal and vertical movements allowed
3. **Visit numbered cells in ascending order** - Connect dots 1→2→3→etc. in sequence
4. **Fill entire grid with one path** - Every cell on the grid must be visited
5. **Path cannot cross itself** - The line cannot intersect its own path
6. **Complete when all cells are filled** - Victory happens when all cells are connected with a valid path

These rules define the core gameplay mechanics and should be maintained in all code changes.

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`
3. Build for production:
   `npm run build`

## Facebook Deployment

Build the project and upload the `dist` folder contents to Facebook Developer Console for Instant Games.
