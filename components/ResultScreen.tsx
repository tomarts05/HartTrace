import React from 'react';
import { motion } from 'framer-motion';
import { ShareButton } from './ShareButton';

interface ResultScreenProps {
  finalLevel: number;
  totalTime: number;
  onPlayAgain: () => void;
  onClose?: () => void;
  isVisible: boolean;
  stageCompletionTimes?: number[];
  totalGameCompletions?: number;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({
  finalLevel,
  totalTime,
  onPlayAgain,
  onClose,
  isVisible,
  stageCompletionTimes = [],
  totalGameCompletions = 0
}) => {
  if (!isVisible) return null;

  // Format time to display as MM:SS or HH:MM:SS
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Determine motivational message based on performance
  const getMotivationalMessage = (): string => {
    if (finalLevel >= 12) {
      return "🏆 MASTER COMPLETE! You've conquered all stages!";
    } else if (finalLevel >= 8) {
      return "🔥 Great job! You're getting really good at this!";
    } else if (finalLevel >= 5) {
      return "⭐ Nice work! Keep pushing forward!";
    } else if (finalLevel >= 3) {
      return "👍 Good start! You're getting the hang of it!";
    } else {
      return "🎯 Great first steps! Practice makes perfect!";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="result-screen-overlay"
    >
      <motion.div
        initial={{ scale: 0.8, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.8, y: 20 }}
        transition={{ duration: 0.25 }}
        className="result-screen-content"
      >
        {/* Close button */}
        {onClose && (
          <button 
            onClick={onClose}
            className="result-screen-close"
            aria-label="Close result screen"
          >
            ×
          </button>
        )}

        {/* Result header */}
        <div className="result-screen-header">
          <div className="result-emoji">
            {finalLevel >= 12 ? '🏆' : finalLevel >= 8 ? '🔥' : finalLevel >= 5 ? '⭐' : '🎯'}
          </div>
          <h2 className="result-title">Game Complete!</h2>
        </div>

        {/* Main results */}
        <div className="result-details">
          <p className="result-level">Final Level Reached: <strong>{finalLevel}</strong></p>
          <p className="result-time">Total Time: <strong>{formatTime(totalTime)}</strong></p>
          
          {/* Motivational message */}
          <p className="result-message">{getMotivationalMessage()}</p>
        </div>

        {/* Additional stats for completed games */}
        {finalLevel >= 12 && (
          <div className="result-completion-stats">
            <h3 className="stats-title">🎊 FULL COMPLETION! 🎊</h3>
            <p className="stats-highlight">Total Completions: {totalGameCompletions + 1}</p>
            
            {/* Stage breakdown if available */}
            {stageCompletionTimes.length > 0 && (
              <div className="stage-breakdown">
                <h4 className="breakdown-title">📊 Stage Times:</h4>
                <div className="stage-times-grid">
                  {stageCompletionTimes.slice(0, 6).map((time, index) => (
                    <div key={index} className="stage-time-item">
                      <span className="stage-number">S{index + 1}:</span>
                      <span className="stage-time">{formatTime(time)}</span>
                    </div>
                  ))}
                </div>
                {stageCompletionTimes.length > 6 && (
                  <div className="stage-times-grid">
                    {stageCompletionTimes.slice(6, 12).map((time, index) => (
                      <div key={index + 6} className="stage-time-item">
                        <span className="stage-number">S{index + 7}:</span>
                        <span className="stage-time">{formatTime(time)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="result-buttons">
          {/* Play Again button as specified */}
          <button 
            onClick={onPlayAgain}
            className="result-button play-again"
          >
            🔄 Play Again
          </button>

          {/* Facebook Share Button - using the new ShareButton component */}
          <ShareButton 
            level={finalLevel}
            time={totalTime}
            className="result-share-button"
          >
            📲 Share Result
          </ShareButton>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ResultScreen;