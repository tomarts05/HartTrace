import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { progressionManager, LevelProgress } from '../utils/progressionManager';
import { COMPLEXITY_LEVELS } from '../data/puzzle';

interface LevelMapProps {
  onLevelSelect: (levelId: number) => void;
  currentLevel: number;
  onClose?: () => void;
}

const LevelMap: React.FC<LevelMapProps> = ({ onLevelSelect, currentLevel, onClose }) => {
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const unlockedLevels = progressionManager.getUnlockedLevels();

  const getLevelData = (levelId: number) => {
    const progress = progressionManager.getLevelProgress(levelId);
    const complexity = COMPLEXITY_LEVELS[levelId];
    const isUnlocked = unlockedLevels.includes(levelId);
    const isCurrent = levelId === currentLevel;

    return {
      progress,
      complexity,
      isUnlocked,
      isCurrent,
      levelId
    };
  };

  const handleLevelClick = (levelId: number) => {
    const { isUnlocked } = getLevelData(levelId);
    if (isUnlocked) {
      setSelectedLevel(levelId);
      setTimeout(() => {
        onLevelSelect(levelId);
        onClose?.();
      }, 200);
    }
  };

  const renderStars = (stars: number) => {
    return Array.from({ length: 3 }, (_, i) => (
      <span
        key={i}
        className={`text-sm ${i < stars ? 'text-yellow-400' : 'text-gray-400'}`}
      >
        ⭐
      </span>
    ));
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'bg-green-100 border-green-300 text-green-800';
      case 'Medium': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'Hard': return 'bg-red-100 border-red-300 text-red-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  return (
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
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Level Map</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
            >
              ×
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {COMPLEXITY_LEVELS.map((complexity, index) => {
            const {
              progress,
              isUnlocked,
              isCurrent
            } = getLevelData(index);

            return (
              <motion.div
                key={index}
                className={`
                  relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200
                  ${isUnlocked 
                    ? 'hover:shadow-lg hover:scale-105' 
                    : 'opacity-50 cursor-not-allowed'
                  }
                  ${isCurrent 
                    ? 'ring-4 ring-blue-300 border-blue-400 bg-blue-50' 
                    : 'border-gray-200 bg-white'
                  }
                  ${selectedLevel === index ? 'scale-95' : ''}
                `}
                onClick={() => handleLevelClick(index)}
                whileHover={isUnlocked ? { scale: 1.05 } : {}}
                whileTap={isUnlocked ? { scale: 0.95 } : {}}
              >
                {/* Level number badge */}
                <div className={`
                  absolute -top-2 -left-2 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm
                  ${isUnlocked ? 'bg-blue-500' : 'bg-gray-400'}
                `}>
                  {index + 1}
                </div>

                {/* Current level indicator */}
                {isCurrent && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">▶</span>
                  </div>
                )}

                {/* Lock icon for locked levels */}
                {!isUnlocked && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-4xl text-gray-400">🔒</span>
                  </div>
                )}

                {isUnlocked && (
                  <>
                    {/* Level info */}
                    <div className="text-center mb-2">
                      <h3 className="font-semibold text-gray-800 mb-1">
                        {complexity.name}
                      </h3>
                      <div className={`
                        inline-block px-2 py-1 rounded-full text-xs font-medium border
                        ${getDifficultyColor(complexity.difficulty)}
                      `}>
                        {complexity.difficulty}
                      </div>
                    </div>

                    {/* Grid preview */}
                    <div className="flex justify-center mb-2">
                      <div 
                        className="grid gap-0.5 bg-gray-200 p-1 rounded"
                        style={{
                          gridTemplateColumns: `repeat(${Math.min(complexity.gridSize, 6)}, 1fr)`,
                          aspectRatio: '1'
                        }}
                      >
                        {Array.from({ length: Math.min(complexity.gridSize * complexity.gridSize, 36) }, (_, i) => (
                          <div
                            key={i}
                            className="w-1.5 h-1.5 bg-gray-400 rounded-sm"
                          />
                        ))}
                      </div>
                    </div>

                    {/* Completion info */}
                    {progress?.completed ? (
                      <div className="text-center">
                        <div className="flex justify-center mb-1">
                          {renderStars(progress.stars)}
                        </div>
                        <div className="text-xs text-gray-600">
                          Best: {Math.floor(progress.bestTime! / 60)}:
                          {String(Math.floor(progress.bestTime! % 60)).padStart(2, '0')}
                        </div>
                        <div className="text-xs text-green-600 font-medium">
                          ✓ Completed
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="text-xs text-gray-500 mb-1">
                          {complexity.gridSize}×{complexity.gridSize} grid
                        </div>
                        <div className="text-xs text-gray-500">
                          {complexity.numDots} dots
                        </div>
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Progress summary */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-800 mb-2">Progress Summary</h3>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Levels Completed:</span>
            <span className="font-medium">
              {progressionManager.getPlayerStats().levelsCompleted} / {COMPLEXITY_LEVELS.length}
            </span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Total Stars:</span>
            <span className="font-medium">
              {Array.from({ length: COMPLEXITY_LEVELS.length }, (_, i) => i)
                .reduce((total, levelId) => {
                  const progress = progressionManager.getLevelProgress(levelId);
                  return total + (progress?.stars || 0);
                }, 0)
              } / {COMPLEXITY_LEVELS.length * 3}
            </span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default LevelMap;