import React from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';

interface ConfettiConfig {
  particleCount?: number;
  spread?: number;
  origin?: { x: number; y: number };
  colors?: string[];
  shapes?: ('square' | 'circle')[];
}

// Victory confetti effect
export const triggerVictoryConfetti = (config: ConfettiConfig = {}) => {
  const defaults = {
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#60A5FA', '#34D399', '#FBBF24', '#F87171', '#A78BFA'],
    shapes: ['circle' as const, 'square' as const]
  };

  const finalConfig = { ...defaults, ...config };

  confetti({
    ...finalConfig,
    disableForReducedMotion: true
  });

  // Second burst for extra effect
  setTimeout(() => {
    confetti({
      ...finalConfig,
      particleCount: 50,
      spread: 120,
      disableForReducedMotion: true
    });
  }, 250);
};

// Pulse animation component for level complete
export const PulseEffect: React.FC<{ children: React.ReactNode; trigger: boolean }> = ({ 
  children, 
  trigger 
}) => (
  <motion.div
    animate={trigger ? {
      scale: [1, 1.05, 1],
      filter: ['hue-rotate(0deg)', 'hue-rotate(20deg)', 'hue-rotate(0deg)']
    } : {}}
    transition={{
      duration: 0.6,
      ease: "easeInOut"
    }}
  >
    {children}
  </motion.div>
);

// Path drawing animation
export const PathLine: React.FC<{
  d: string;
  animate?: boolean;
  delay?: number;
}> = ({ d, animate = true, delay = 0 }) => (
  <motion.path
    d={d}
    stroke="url(#pathGradient)"
    strokeWidth="8"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    initial={animate ? { pathLength: 0, opacity: 0 } : {}}
    animate={animate ? { pathLength: 1, opacity: 1 } : {}}
    transition={{
      pathLength: { duration: 0.5, delay, ease: "easeInOut" },
      opacity: { duration: 0.2, delay }
    }}
  />
);

// Floating number animation
export const FloatingNumber: React.FC<{
  number: number;
  x: number;
  y: number;
  isCompleted?: boolean;
}> = ({ number, x, y, isCompleted = false }) => (
  <motion.g
    initial={{ scale: 0, opacity: 0 }}
    animate={{ 
      scale: isCompleted ? [1, 1.2, 1] : 1, 
      opacity: 1,
      filter: isCompleted ? ['hue-rotate(0deg)', 'hue-rotate(60deg)', 'hue-rotate(0deg)'] : 'hue-rotate(0deg)'
    }}
    transition={{ 
      duration: isCompleted ? 0.6 : 0.3, 
      ease: "backOut",
      scale: { repeat: isCompleted ? 1 : 0 }
    }}
  >
    <circle
      cx={x}
      cy={y}
      r="20"
      fill={isCompleted ? "#10B981" : "#3B82F6"}
      stroke="#FFFFFF"
      strokeWidth="3"
      filter="drop-shadow(2px 2px 4px rgba(0,0,0,0.3))"
    />
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="central"
      fill="white"
      fontSize="16"
      fontWeight="bold"
    >
      {number}
    </text>
  </motion.g>
);

// Sparkle effect for completed cells
export const SparkleEffect: React.FC<{
  x: number;
  y: number;
  show: boolean;
}> = ({ x, y, show }) => (
  <motion.g
    initial={{ scale: 0, opacity: 0 }}
    animate={show ? { 
      scale: [0, 1.5, 0], 
      opacity: [0, 1, 0],
      rotate: [0, 180, 360]
    } : {}}
    transition={{ duration: 1, ease: "easeOut" }}
  >
    <polygon
      points={`${x},${y-8} ${x+4},${y-4} ${x+8},${y} ${x+4},${y+4} ${x},${y+8} ${x-4},${y+4} ${x-8},${y} ${x-4},${y-4}`}
      fill="#FBBF24"
      opacity="0.8"
    />
  </motion.g>
);

// Grid cell animation
export const AnimatedCell: React.FC<{
  x: number;
  y: number;
  width: number;
  height: number;
  isOccupied: boolean;
  isHighlighted?: boolean;
  delay?: number;
}> = ({ x, y, width, height, isOccupied, isHighlighted = false, delay = 0 }) => (
  <motion.rect
    x={x}
    y={y}
    width={width}
    height={height}
    fill={isOccupied ? "rgba(59, 130, 246, 0.1)" : "transparent"}
    stroke={isHighlighted ? "#10B981" : "rgba(156, 163, 175, 0.3)"}
    strokeWidth={isHighlighted ? "2" : "1"}
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ 
      opacity: 1, 
      scale: isHighlighted ? [1, 1.05, 1] : 1,
      fill: isOccupied ? "rgba(59, 130, 246, 0.1)" : "transparent"
    }}
    transition={{ 
      duration: 0.3, 
      delay,
      scale: { duration: 0.5, repeat: isHighlighted ? Infinity : 0 }
    }}
  />
);

// Loading spinner
export const LoadingSpinner: React.FC = () => (
  <motion.div
    className="flex items-center justify-center"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
  >
    <motion.div
      className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full"
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    />
  </motion.div>
);