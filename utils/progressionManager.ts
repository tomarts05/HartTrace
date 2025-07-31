// Progression and achievements system
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: (stats: PlayerStats) => boolean;
  unlocked: boolean;
  unlockedAt?: Date;
}

export interface PlayerStats {
  levelsCompleted: number;
  totalPlayTime: number; // in seconds
  fastestCompletion: number; // in seconds
  totalMoves: number;
  perfectRuns: number; // levels completed without mistakes
  currentStreak: number;
  bestStreak: number;
  achievementsUnlocked: number;
  gamesPlayed: number;
  lastPlayedDate?: Date;
}

export interface LevelProgress {
  levelId: number;
  completed: boolean;
  bestTime?: number;
  stars: number; // 1-3 stars based on performance
  completedAt?: Date;
  attempts: number;
}

export interface GameProgress {
  currentLevel: number;
  unlockedLevels: Set<number>;
  levelProgress: Map<number, LevelProgress>;
  playerStats: PlayerStats;
  achievements: Map<string, Achievement>;
  settings: {
    soundEnabled: boolean;
    animationsEnabled: boolean;
    difficultyCurve: 'normal' | 'easy' | 'hard';
  };
}

class ProgressionManager {
  private static instance: ProgressionManager;
  private progress: GameProgress;
  private readonly STORAGE_KEY = 'harttrace-progress';
  private readonly ACHIEVEMENTS_KEY = 'harttrace-achievements';

  private constructor() {
    this.progress = this.loadProgress();
    this.initializeAchievements();
  }

  static getInstance(): ProgressionManager {
    if (!ProgressionManager.instance) {
      ProgressionManager.instance = new ProgressionManager();
    }
    return ProgressionManager.instance;
  }

  private loadProgress(): GameProgress {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          unlockedLevels: new Set(parsed.unlockedLevels || [0, 1]),
          levelProgress: new Map(parsed.levelProgress || []),
          playerStats: {
            ...this.getDefaultStats(),
            ...parsed.playerStats
          },
          achievements: new Map(parsed.achievements || [])
        };
      }
    } catch (error) {
      console.warn('Failed to load progress:', error);
    }

    return this.getDefaultProgress();
  }

  private getDefaultProgress(): GameProgress {
    return {
      currentLevel: 0,
      unlockedLevels: new Set([0, 1]), // Start with first two levels unlocked
      levelProgress: new Map(),
      playerStats: this.getDefaultStats(),
      achievements: new Map(),
      settings: {
        soundEnabled: true,
        animationsEnabled: true,
        difficultyCurve: 'normal'
      }
    };
  }

  private getDefaultStats(): PlayerStats {
    return {
      levelsCompleted: 0,
      totalPlayTime: 0,
      fastestCompletion: Infinity,
      totalMoves: 0,
      perfectRuns: 0,
      currentStreak: 0,
      bestStreak: 0,
      achievementsUnlocked: 0,
      gamesPlayed: 0
    };
  }

  private saveProgress(): void {
    try {
      const toSave = {
        ...this.progress,
        unlockedLevels: Array.from(this.progress.unlockedLevels),
        levelProgress: Array.from(this.progress.levelProgress.entries()),
        achievements: Array.from(this.progress.achievements.entries())
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(toSave));
    } catch (error) {
      console.warn('Failed to save progress:', error);
    }
  }

  completeLevel(levelId: number, completionTime: number, moves: number, perfect: boolean = false): boolean {
    const existingProgress = this.progress.levelProgress.get(levelId);
    const isFirstCompletion = !existingProgress?.completed;
    
    // Calculate stars based on performance (simple algorithm)
    let stars = 1;
    if (completionTime < 120) stars = 2; // Under 2 minutes
    if (completionTime < 60 && moves < 50) stars = 3; // Under 1 minute and efficient

    const levelProgress: LevelProgress = {
      levelId,
      completed: true,
      bestTime: existingProgress?.bestTime ? Math.min(existingProgress.bestTime, completionTime) : completionTime,
      stars: Math.max(existingProgress?.stars || 0, stars),
      completedAt: new Date(),
      attempts: (existingProgress?.attempts || 0) + 1
    };

    this.progress.levelProgress.set(levelId, levelProgress);

    // Update player stats
    if (isFirstCompletion) {
      this.progress.playerStats.levelsCompleted++;
      this.progress.playerStats.currentStreak++;
      this.progress.playerStats.bestStreak = Math.max(
        this.progress.playerStats.bestStreak,
        this.progress.playerStats.currentStreak
      );
    }

    this.progress.playerStats.totalPlayTime += completionTime;
    this.progress.playerStats.totalMoves += moves;
    this.progress.playerStats.fastestCompletion = Math.min(
      this.progress.playerStats.fastestCompletion,
      completionTime
    );

    if (perfect) {
      this.progress.playerStats.perfectRuns++;
    }

    // Unlock next level
    const nextLevel = levelId + 1;
    if (nextLevel < 12) { // Assuming 12 levels total
      this.progress.unlockedLevels.add(nextLevel);
    }

    this.progress.playerStats.lastPlayedDate = new Date();
    this.checkAndUnlockAchievements();
    this.saveProgress();

    return isFirstCompletion;
  }

  failLevel(levelId: number): void {
    this.progress.playerStats.currentStreak = 0;
    this.progress.playerStats.gamesPlayed++;
    
    const existingProgress = this.progress.levelProgress.get(levelId);
    if (existingProgress) {
      existingProgress.attempts++;
      this.progress.levelProgress.set(levelId, existingProgress);
    } else {
      this.progress.levelProgress.set(levelId, {
        levelId,
        completed: false,
        stars: 0,
        attempts: 1
      });
    }

    this.saveProgress();
  }

  isLevelUnlocked(levelId: number): boolean {
    return this.progress.unlockedLevels.has(levelId);
  }

  getLevelProgress(levelId: number): LevelProgress | undefined {
    return this.progress.levelProgress.get(levelId);
  }

  getPlayerStats(): PlayerStats {
    return { ...this.progress.playerStats };
  }

  getCurrentLevel(): number {
    return this.progress.currentLevel;
  }

  setCurrentLevel(levelId: number): void {
    this.progress.currentLevel = levelId;
    this.saveProgress();
  }

  getUnlockedLevels(): number[] {
    return Array.from(this.progress.unlockedLevels).sort((a, b) => a - b);
  }

  private initializeAchievements(): void {
    const achievements: Achievement[] = [
      {
        id: 'first-victory',
        name: 'First Steps',
        description: 'Complete your first puzzle',
        icon: '🎯',
        condition: (stats) => stats.levelsCompleted >= 1,
        unlocked: false
      },
      {
        id: 'speed-demon',
        name: 'Speed Demon',
        description: 'Complete a puzzle in under 30 seconds',
        icon: '⚡',
        condition: (stats) => stats.fastestCompletion < 30,
        unlocked: false
      },
      {
        id: 'perfectionist',
        name: 'Perfectionist',
        description: 'Complete 5 puzzles without making mistakes',
        icon: '✨',
        condition: (stats) => stats.perfectRuns >= 5,
        unlocked: false
      },
      {
        id: 'streak-master',
        name: 'Streak Master',
        description: 'Complete 10 puzzles in a row',
        icon: '🔥',
        condition: (stats) => stats.bestStreak >= 10,
        unlocked: false
      },
      {
        id: 'puzzle-master',
        name: 'Puzzle Master',
        description: 'Complete all 12 levels',
        icon: '👑',
        condition: (stats) => stats.levelsCompleted >= 12,
        unlocked: false
      },
      {
        id: 'dedicated-player',
        name: 'Dedicated Player',
        description: 'Play for over 1 hour total',
        icon: '⏰',
        condition: (stats) => stats.totalPlayTime >= 3600,
        unlocked: false
      }
    ];

    // Load existing achievement progress
    const saved = localStorage.getItem(this.ACHIEVEMENTS_KEY);
    const existingAchievements = saved ? new Map(JSON.parse(saved)) : new Map();

    achievements.forEach(achievement => {
      const existing = existingAchievements.get(achievement.id);
      if (existing) {
        achievement.unlocked = existing.unlocked;
        achievement.unlockedAt = existing.unlockedAt ? new Date(existing.unlockedAt) : undefined;
      }
      this.progress.achievements.set(achievement.id, achievement);
    });
  }

  private checkAndUnlockAchievements(): string[] {
    const newlyUnlocked: string[] = [];
    const stats = this.progress.playerStats;

    this.progress.achievements.forEach((achievement, id) => {
      if (!achievement.unlocked && achievement.condition(stats)) {
        achievement.unlocked = true;
        achievement.unlockedAt = new Date();
        this.progress.playerStats.achievementsUnlocked++;
        newlyUnlocked.push(id);
        console.log(`🏆 Achievement unlocked: ${achievement.name}`);
      }
    });

    if (newlyUnlocked.length > 0) {
      localStorage.setItem(
        this.ACHIEVEMENTS_KEY, 
        JSON.stringify(Array.from(this.progress.achievements.entries()))
      );
    }

    return newlyUnlocked;
  }

  getAchievements(): Achievement[] {
    return Array.from(this.progress.achievements.values());
  }

  getUnlockedAchievements(): Achievement[] {
    return this.getAchievements().filter(a => a.unlocked);
  }

  updateSettings(settings: Partial<typeof this.progress.settings>): void {
    this.progress.settings = { ...this.progress.settings, ...settings };
    this.saveProgress();
  }

  getSettings() {
    return { ...this.progress.settings };
  }

  resetProgress(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.ACHIEVEMENTS_KEY);
    this.progress = this.getDefaultProgress();
    this.initializeAchievements();
  }

  exportProgress(): string {
    return JSON.stringify({
      ...this.progress,
      unlockedLevels: Array.from(this.progress.unlockedLevels),
      levelProgress: Array.from(this.progress.levelProgress.entries()),
      achievements: Array.from(this.progress.achievements.entries())
    });
  }

  importProgress(data: string): boolean {
    try {
      const parsed = JSON.parse(data);
      this.progress = {
        ...parsed,
        unlockedLevels: new Set(parsed.unlockedLevels),
        levelProgress: new Map(parsed.levelProgress),
        achievements: new Map(parsed.achievements)
      };
      this.saveProgress();
      return true;
    } catch (error) {
      console.error('Failed to import progress:', error);
      return false;
    }
  }
}

export const progressionManager = ProgressionManager.getInstance();
export default progressionManager;