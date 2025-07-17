// Facebook Instant Games SDK integration utility
// Provides a clean interface for FBInstant functionality with fallbacks

interface FBInstantPlayer {
  getName(): string;
  getID(): string;
  getPhoto(): string;
}

interface FBInstantContext {
  getID(): string;
  getType(): string;
  isSizeBetween(minSize: number, maxSize: number): boolean;
}

interface FBInstantLeaderboard {
  getName(): string;
  setScoreAsync(score: number, extraData?: string): Promise<void>;
  getEntriesAsync(count?: number, offset?: number): Promise<any[]>;
}

declare global {
  interface Window {
    FBInstant?: {
      initializeAsync(): Promise<void>;
      startGameAsync(): Promise<void>;
      getPlayerName(): string;
      player: FBInstantPlayer;
      context: FBInstantContext;
      getLocale(): string;
      getPlatform(): string;
      getSDKVersion(): string;
      shareAsync(payload: {
        intent: 'REQUEST' | 'SHARE';
        image?: string;
        text?: string;
        data?: any;
      }): Promise<void>;
      getLeaderboardAsync(name: string): Promise<FBInstantLeaderboard>;
      quit(): void;
      logEvent(eventName: string, valueToSum?: number, parameters?: any): void;
      onPause(callback: () => void): void;
      setLoadingProgress(percentage: number): void;
    };
  }
}

export class FBInstantManager {
  private static instance: FBInstantManager;
  private isInitialized = false;
  private isSupported = false;
  private debugMode = true;

  private constructor() {
    this.checkSupport();
  }

  public static getInstance(): FBInstantManager {
    if (!FBInstantManager.instance) {
      FBInstantManager.instance = new FBInstantManager();
    }
    return FBInstantManager.instance;
  }

  private log(message: string, ...args: any[]) {
    if (this.debugMode) {
      console.log(`[FBInstant] ${message}`, ...args);
    }
  }

  private checkSupport(): void {
    this.isSupported = typeof window !== 'undefined' && !!window.FBInstant;
    this.log('FBInstant support detected:', this.isSupported);
  }

  public async initialize(): Promise<boolean> {
    if (!this.isSupported) {
      this.log('FBInstant not supported, running in web mode');
      return false;
    }

    try {
      this.log('Initializing FBInstant...');
      await window.FBInstant!.initializeAsync();
      this.log('FBInstant initialized successfully');
      
      this.log('Starting game...');
      await window.FBInstant!.startGameAsync();
      this.log('Game started successfully');
      
      this.isInitialized = true;
      
      // Log platform info
      this.log('Platform:', this.getPlatform());
      this.log('Locale:', this.getLocale());
      this.log('SDK Version:', this.getSDKVersion());
      this.log('Player Name:', this.getPlayerName());
      
      return true;
    } catch (error) {
      this.log('Failed to initialize FBInstant:', error);
      return false;
    }
  }

  public isReady(): boolean {
    return this.isSupported && this.isInitialized;
  }

  public isFacebookEnvironment(): boolean {
    return this.isSupported;
  }

  public getPlayerName(): string {
    if (this.isReady() && window.FBInstant?.player) {
      try {
        return window.FBInstant.player.getName() || 'Player';
      } catch (error) {
        this.log('Error getting player name:', error);
      }
    }
    return 'Player';
  }

  public getPlayerID(): string {
    if (this.isReady() && window.FBInstant?.player) {
      try {
        return window.FBInstant.player.getID() || 'guest';
      } catch (error) {
        this.log('Error getting player ID:', error);
      }
    }
    return 'guest';
  }

  public getPlayerPhoto(): string {
    if (this.isReady() && window.FBInstant?.player) {
      try {
        return window.FBInstant.player.getPhoto() || '';
      } catch (error) {
        this.log('Error getting player photo:', error);
      }
    }
    return '';
  }

  public getLocale(): string {
    if (this.isReady()) {
      try {
        return window.FBInstant!.getLocale() || 'en_US';
      } catch (error) {
        this.log('Error getting locale:', error);
      }
    }
    return 'en_US';
  }

  public getPlatform(): string {
    if (this.isReady()) {
      try {
        return window.FBInstant!.getPlatform() || 'WEB';
      } catch (error) {
        this.log('Error getting platform:', error);
      }
    }
    return 'WEB';
  }

  public getSDKVersion(): string {
    if (this.isReady()) {
      try {
        return window.FBInstant!.getSDKVersion() || '6.3';
      } catch (error) {
        this.log('Error getting SDK version:', error);
      }
    }
    return '6.3';
  }

  public async shareGame(data: {
    stage: number;
    score?: number;
    time?: number;
    message?: string;
  }): Promise<boolean> {
    try {
      // Create Facebook timeline post instead of conversation feed message
      const shareText = data.message || `I just completed Stage ${data.stage} in this amazing puzzle game! Can you beat my time?`;
      const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://hartash.com')}&quote=${encodeURIComponent(shareText)}`;
      
      this.log('📲 Opening Facebook post sharer (instead of FBInstant feed message):', { 
        stage: data.stage, 
        shareText,
        method: 'facebook_timeline_post'
      });
      
      // Open Facebook sharer in new window to create timeline post
      window.open(shareUrl, '_blank', 'width=600,height=400');
      
      this.log('✅ Facebook post sharer opened successfully');
      
      // Log the share event for analytics
      this.logEvent('game_shared_post', 1, {
        stage: data.stage,
        score: data.score,
        time: data.time,
        method: 'facebook_post'
      });
      
      return true;
    } catch (error) {
      this.log('❌ Error opening Facebook sharer:', error);
      return false;
    }
  }

  public async submitScore(leaderboardName: string, score: number, extraData?: any): Promise<boolean> {
    if (!this.isReady()) {
      this.log('Cannot submit score: FBInstant not ready');
      return false;
    }

    try {
      const leaderboard = await window.FBInstant!.getLeaderboardAsync(leaderboardName);
      await leaderboard.setScoreAsync(score, JSON.stringify(extraData || {}));
      this.log('Score submitted successfully:', { leaderboardName, score, extraData });
      return true;
    } catch (error) {
      this.log('Error submitting score:', error);
      return false;
    }
  }

  public async getLeaderboard(leaderboardName: string, count = 10): Promise<any[]> {
    if (!this.isReady()) {
      this.log('Cannot get leaderboard: FBInstant not ready');
      return [];
    }

    try {
      const leaderboard = await window.FBInstant!.getLeaderboardAsync(leaderboardName);
      const entries = await leaderboard.getEntriesAsync(count, 0);
      this.log('Leaderboard retrieved:', { leaderboardName, count: entries.length });
      return entries;
    } catch (error) {
      this.log('Error getting leaderboard:', error);
      return [];
    }
  }

  public logEvent(eventName: string, valueToSum?: number, parameters?: any): void {
    if (this.isReady()) {
      try {
        window.FBInstant!.logEvent(eventName, valueToSum, parameters);
        this.log('Event logged:', { eventName, valueToSum, parameters });
      } catch (error) {
        this.log('Error logging event:', error);
      }
    }
  }

  public setLoadingProgress(percentage: number): void {
    if (this.isReady()) {
      try {
        window.FBInstant!.setLoadingProgress(percentage);
      } catch (error) {
        this.log('Error setting loading progress:', error);
      }
    }
  }

  public quit(): void {
    if (this.isReady()) {
      try {
        window.FBInstant!.quit();
      } catch (error) {
        this.log('Error quitting game:', error);
      }
    }
  }

  // Note: generateShareImage method removed as we now use Facebook sharer.php for timeline posts
  // instead of FBInstant.shareAsync for conversation feeds

  public onPause(callback: () => void): void {
    if (this.isReady()) {
      try {
        window.FBInstant!.onPause(callback);
      } catch (error) {
        this.log('Error setting pause callback:', error);
      }
    }
  }
}

export const fbInstant = FBInstantManager.getInstance();
