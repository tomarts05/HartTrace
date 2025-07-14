import { useState, useEffect, useCallback } from 'react';
import { fbInstant } from '../utils/fbInstant';

interface FBInstantState {
  isSupported: boolean;
  isInitialized: boolean;
  isLoading: boolean;
  playerName: string;
  playerID: string;
  playerPhoto: string;
  locale: string;
  platform: string;
  error: string | null;
}

interface FBInstantActions {
  shareGame: (data: { stage: number; score?: number; time?: number; message?: string }) => Promise<boolean>;
  submitScore: (leaderboardName: string, score: number, extraData?: any) => Promise<boolean>;
  getLeaderboard: (leaderboardName: string, count?: number) => Promise<any[]>;
  logEvent: (eventName: string, valueToSum?: number, parameters?: any) => void;
  quit: () => void;
}

export function useFBInstant(): [FBInstantState, FBInstantActions] {
  const [state, setState] = useState<FBInstantState>({
    isSupported: false,
    isInitialized: false,
    isLoading: true,
    playerName: 'Player',
    playerID: 'guest',
    playerPhoto: '',
    locale: 'en_US',
    platform: 'WEB',
    error: null
  });

  const updatePlayerInfo = useCallback(() => {
    if (fbInstant.isReady()) {
      setState(prev => ({
        ...prev,
        playerName: fbInstant.getPlayerName(),
        playerID: fbInstant.getPlayerID(),
        playerPhoto: fbInstant.getPlayerPhoto(),
        locale: fbInstant.getLocale(),
        platform: fbInstant.getPlatform()
      }));
    }
  }, []);

  useEffect(() => {
    const initializeFBInstant = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        
        const isSupported = fbInstant.isFacebookEnvironment();
        setState(prev => ({ ...prev, isSupported }));

        if (isSupported) {
          console.log('[useFBInstant] Initializing Facebook Instant Games...');
          const success = await fbInstant.initialize();
          
          setState(prev => ({
            ...prev,
            isInitialized: success,
            isLoading: false,
            error: success ? null : 'Failed to initialize Facebook Instant Games'
          }));

          if (success) {
            updatePlayerInfo();
            
            // Set up pause handler
            fbInstant.onPause(() => {
              console.log('[useFBInstant] Game paused by Facebook');
            });
            
            // Log initialization event
            fbInstant.logEvent('game_initialized', 1, {
              platform: fbInstant.getPlatform(),
              locale: fbInstant.getLocale()
            });
          }
        } else {
          console.log('[useFBInstant] Running in standard web mode');
          setState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error('[useFBInstant] Initialization error:', error);
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }));
      }
    };

    initializeFBInstant();
  }, [updatePlayerInfo]);

  const actions: FBInstantActions = {
    shareGame: useCallback(async (data) => {
      try {
        const success = await fbInstant.shareGame(data);
        if (success) {
          fbInstant.logEvent('game_shared', 1, {
            stage: data.stage,
            score: data.score,
            time: data.time
          });
        }
        return success;
      } catch (error) {
        console.error('[useFBInstant] Share error:', error);
        return false;
      }
    }, []),

    submitScore: useCallback(async (leaderboardName, score, extraData) => {
      try {
        const success = await fbInstant.submitScore(leaderboardName, score, extraData);
        if (success) {
          fbInstant.logEvent('score_submitted', score, {
            leaderboard: leaderboardName,
            ...extraData
          });
        }
        return success;
      } catch (error) {
        console.error('[useFBInstant] Submit score error:', error);
        return false;
      }
    }, []),

    getLeaderboard: useCallback(async (leaderboardName, count = 10) => {
      try {
        const entries = await fbInstant.getLeaderboard(leaderboardName, count);
        fbInstant.logEvent('leaderboard_viewed', 1, {
          leaderboard: leaderboardName,
          count: entries.length
        });
        return entries;
      } catch (error) {
        console.error('[useFBInstant] Get leaderboard error:', error);
        return [];
      }
    }, []),

    logEvent: useCallback((eventName, valueToSum, parameters) => {
      fbInstant.logEvent(eventName, valueToSum, parameters);
    }, []),

    quit: useCallback(() => {
      fbInstant.logEvent('game_quit', 1);
      fbInstant.quit();
    }, [])
  };

  return [state, actions];
}
