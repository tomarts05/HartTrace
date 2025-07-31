/**
 * GameEngine - Core game logic and difficulty progression
 * Handles game state, timing, and complexity scaling
 */

export interface GameConfiguration {
  baseTimeLimit: number; // Base time limit in seconds
  timePressureScaling: number; // How much to reduce time per level
  toleranceScaling: number; // How much to tighten input tolerance per level
  moveEfficiencyWeight: number; // Weight for move efficiency in scoring
}

export interface GameStats {
  level: number;
  moveCount: number;
  timeElapsed: number;
  timeLimit: number;
  efficiency: number; // Percentage of optimal moves used
  accuracy: number; // Path accuracy percentage
}

export interface FeedbackGrade {
  grade: 'Perfect' | 'Excellent' | 'Good' | 'Fair' | 'Poor';
  score: number; // 0-100
  timeBonus: number;
  efficiencyBonus: number;
  message: string;
}

export class GameEngine {
  private config: GameConfiguration;
  private stats: GameStats;
  private startTime: number = 0;
  private gameTimer: number | null = null;
  private onTimeUpdate: ((timeRemaining: number) => void) | null = null;
  private onTimeExpired: (() => void) | null = null;

  constructor(config: Partial<GameConfiguration> = {}) {
    this.config = {
      baseTimeLimit: 300, // 5 minutes for level 1
      timePressureScaling: 0.85, // Reduce time by 15% each level
      toleranceScaling: 0.95, // Reduce tolerance by 5% each level
      moveEfficiencyWeight: 0.3,
      ...config
    };

    this.stats = {
      level: 1,
      moveCount: 0,
      timeElapsed: 0,
      timeLimit: this.config.baseTimeLimit,
      efficiency: 100,
      accuracy: 100
    };
  }

  /**
   * Start a new game level
   */
  startLevel(level: number, optimalMoveCount: number): void {
    this.stats.level = level;
    this.stats.moveCount = 0;
    this.stats.timeElapsed = 0;
    this.stats.timeLimit = this.calculateTimeLimit(level);
    this.stats.efficiency = 100;
    this.stats.accuracy = 100;
    
    this.startTime = Date.now();
    this.startTimer();

    console.log(`🎮 GameEngine: Starting level ${level} with ${this.stats.timeLimit}s time limit`);
  }

  /**
   * Stop the current game
   */
  stopGame(): void {
    if (this.gameTimer) {
      clearInterval(this.gameTimer);
      this.gameTimer = null;
    }
  }

  /**
   * Calculate time limit for a given level with progressive difficulty
   */
  private calculateTimeLimit(level: number): number {
    const baseTime = this.config.baseTimeLimit;
    const scaleFactor = Math.pow(this.config.timePressureScaling, level - 1);
    const minTime = 30; // Minimum 30 seconds even at highest levels
    
    return Math.max(minTime, Math.floor(baseTime * scaleFactor));
  }

  /**
   * Calculate input tolerance for current level
   */
  getInputTolerance(): number {
    const baseTolerancePixels = 20; // Base tolerance in pixels
    const scaleFactor = Math.pow(this.config.toleranceScaling, this.stats.level - 1);
    const minTolerance = 5; // Minimum 5 pixels tolerance
    
    return Math.max(minTolerance, Math.floor(baseTolerancePixels * scaleFactor));
  }

  /**
   * Start the game timer with requestAnimationFrame for smooth updates
   */
  private startTimer(): void {
    const updateTimer = () => {
      const now = Date.now();
      this.stats.timeElapsed = Math.floor((now - this.startTime) / 1000);
      const timeRemaining = Math.max(0, this.stats.timeLimit - this.stats.timeElapsed);
      
      if (this.onTimeUpdate) {
        this.onTimeUpdate(timeRemaining);
      }
      
      if (timeRemaining <= 0) {
        this.stopGame();
        if (this.onTimeExpired) {
          this.onTimeExpired();
        }
        return;
      }
      
      // Use requestAnimationFrame for smooth timer updates
      this.gameTimer = requestAnimationFrame(updateTimer) as any;
    };
    
    updateTimer();
  }

  /**
   * Record a move made by the player
   */
  recordMove(): void {
    this.stats.moveCount++;
  }

  /**
   * Calculate final grade based on performance
   */
  calculateGrade(optimalMoveCount: number, pathAccuracy: number): FeedbackGrade {
    const timeRatio = 1 - (this.stats.timeElapsed / this.stats.timeLimit);
    const moveEfficiency = Math.min(100, (optimalMoveCount / this.stats.moveCount) * 100);
    
    // Calculate composite score
    const timeScore = Math.max(0, timeRatio * 40); // 40 points for time
    const efficiencyScore = (moveEfficiency / 100) * 30; // 30 points for efficiency
    const accuracyScore = (pathAccuracy / 100) * 30; // 30 points for accuracy
    
    const totalScore = Math.round(timeScore + efficiencyScore + accuracyScore);
    
    // Time bonus for completing quickly
    const timeBonus = timeRatio > 0.5 ? Math.round((timeRatio - 0.5) * 20) : 0;
    
    // Efficiency bonus for optimal moves
    const efficiencyBonus = moveEfficiency >= 95 ? 10 : moveEfficiency >= 90 ? 5 : 0;
    
    const finalScore = Math.min(100, totalScore + timeBonus + efficiencyBonus);
    
    // Determine grade
    let grade: FeedbackGrade['grade'];
    let message: string;
    
    if (finalScore >= 95) {
      grade = 'Perfect';
      message = '🌟 Flawless execution! You are a true master!';
    } else if (finalScore >= 85) {
      grade = 'Excellent';
      message = '🎯 Outstanding performance! Almost perfect!';
    } else if (finalScore >= 70) {
      grade = 'Good';
      message = '👍 Well done! You solved it efficiently!';
    } else if (finalScore >= 50) {
      grade = 'Fair';
      message = '⭐ Nice work! Room for improvement!';
    } else {
      grade = 'Poor';
      message = '💪 Keep practicing! You can do better!';
    }

    this.stats.efficiency = moveEfficiency;
    this.stats.accuracy = pathAccuracy;

    return {
      grade,
      score: finalScore,
      timeBonus,
      efficiencyBonus,
      message
    };
  }

  /**
   * Get current game statistics
   */
  getStats(): GameStats {
    return { ...this.stats };
  }

  /**
   * Set timer callback handlers
   */
  setTimerCallbacks(
    onUpdate: (timeRemaining: number) => void,
    onExpired: () => void
  ): void {
    this.onTimeUpdate = onUpdate;
    this.onTimeExpired = onExpired;
  }

  /**
   * Check if time pressure should be applied for current level
   */
  shouldApplyTimePressure(): boolean {
    return this.stats.level >= 3; // Start time pressure from level 3
  }

  /**
   * Get warning thresholds for time remaining
   */
  getTimeWarningThresholds(): { warning: number; critical: number } {
    const total = this.stats.timeLimit;
    return {
      warning: Math.floor(total * 0.3), // 30% remaining
      critical: Math.floor(total * 0.1)  // 10% remaining
    };
  }
}

export default GameEngine;