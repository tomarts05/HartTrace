import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { progressionManager, Achievement } from '../utils/progressionManager';

interface AchievementsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AchievementsModal: React.FC<AchievementsModalProps> = ({ isOpen, onClose }) => {
  const achievements = progressionManager.getAchievements();
  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const playerStats = progressionManager.getPlayerStats();

  const formatDate = (date?: Date) => {
    if (!date) return '';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const getProgressPercentage = (achievement: Achievement): number => {
    if (achievement.unlocked) return 100;

    // Calculate progress based on achievement type
    switch (achievement.id) {
      case 'first-victory':
        return Math.min((playerStats.levelsCompleted / 1) * 100, 100);
      case 'speed-demon':
        if (playerStats.fastestCompletion === Infinity) return 0;
        return Math.min((30 / playerStats.fastestCompletion) * 100, 100);
      case 'perfectionist':
        return Math.min((playerStats.perfectRuns / 5) * 100, 100);
      case 'streak-master':
        return Math.min((playerStats.bestStreak / 10) * 100, 100);
      case 'puzzle-master':
        return Math.min((playerStats.levelsCompleted / 12) * 100, 100);
      case 'dedicated-player':
        return Math.min((playerStats.totalPlayTime / 3600) * 100, 100);
      default:
        return 0;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Achievements</h2>
                <p className="text-gray-600">
                  {unlockedCount} of {achievements.length} unlocked
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            {/* Progress Overview */}
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                <span className="text-sm text-gray-600">
                  {Math.round((unlockedCount / achievements.length) * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <motion.div
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(unlockedCount / achievements.length) * 100}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
            </div>

            {/* Achievements List */}
            <div className="space-y-4">
              {achievements.map((achievement, index) => {
                const progress = getProgressPercentage(achievement);
                
                return (
                  <motion.div
                    key={achievement.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`
                      p-4 rounded-lg border-2 transition-all duration-200
                      ${achievement.unlocked 
                        ? 'border-green-200 bg-green-50 shadow-sm' 
                        : 'border-gray-200 bg-gray-50'
                      }
                    `}
                  >
                    <div className="flex items-start space-x-4">
                      {/* Icon */}
                      <div className={`
                        text-3xl p-2 rounded-full
                        ${achievement.unlocked 
                          ? 'bg-green-100' 
                          : 'bg-gray-200 grayscale'
                        }
                      `}>
                        {achievement.icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className={`
                              font-semibold
                              ${achievement.unlocked ? 'text-green-800' : 'text-gray-700'}
                            `}>
                              {achievement.name}
                            </h3>
                            <p className={`
                              text-sm
                              ${achievement.unlocked ? 'text-green-600' : 'text-gray-600'}
                            `}>
                              {achievement.description}
                            </p>
                          </div>

                          {achievement.unlocked && (
                            <div className="text-right">
                              <div className="text-green-600 font-bold text-sm">✓ UNLOCKED</div>
                              {achievement.unlockedAt && (
                                <div className="text-xs text-green-500">
                                  {formatDate(achievement.unlockedAt)}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Progress bar for locked achievements */}
                        {!achievement.unlocked && progress > 0 && (
                          <div className="mt-2">
                            <div className="flex justify-between text-xs text-gray-600 mb-1">
                              <span>Progress</span>
                              <span>{Math.round(progress)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <motion.div
                                className="bg-blue-500 h-1.5 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Stats Summary */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-3">Your Stats</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Levels Completed:</span>
                  <span className="font-medium">{playerStats.levelsCompleted}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Perfect Runs:</span>
                  <span className="font-medium">{playerStats.perfectRuns}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Best Streak:</span>
                  <span className="font-medium">{playerStats.bestStreak}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Play Time:</span>
                  <span className="font-medium">{formatTime(playerStats.totalPlayTime)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Fastest Completion:</span>
                  <span className="font-medium">
                    {playerStats.fastestCompletion === Infinity 
                      ? 'N/A' 
                      : formatTime(playerStats.fastestCompletion)
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Moves:</span>
                  <span className="font-medium">{playerStats.totalMoves.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Call to action for incomplete achievements */}
            {unlockedCount < achievements.length && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  🎯 <strong>Keep playing to unlock more achievements!</strong> 
                  Complete puzzles quickly and efficiently to earn all rewards.
                </p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AchievementsModal;