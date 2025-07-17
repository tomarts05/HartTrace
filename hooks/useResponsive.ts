import { useState, useEffect } from 'react';
import { getViewportDimensions } from '../utils/mobileDetection';

export interface ResponsiveState {
  width: number;
  height: number;
  aspectRatio: number;
  orientation: 'portrait' | 'landscape';
  category: 'small' | 'medium' | 'large' | 'xlarge';
  isMobile: boolean;
  isLandscapeMobile: boolean;
}

export const useResponsive = (): ResponsiveState => {
  const [responsiveState, setResponsiveState] = useState<ResponsiveState>(() => 
    getViewportDimensions()
  );

  useEffect(() => {
    const updateDimensions = () => {
      setResponsiveState(getViewportDimensions());
    };

    // Listen for both resize and orientation change events
    window.addEventListener('resize', updateDimensions);
    window.addEventListener('orientationchange', updateDimensions);
    
    // Also listen for visual viewport changes (mobile keyboards, etc.)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateDimensions);
    }

    // Call once on mount to set initial state
    updateDimensions();

    return () => {
      window.removeEventListener('resize', updateDimensions);
      window.removeEventListener('orientationchange', updateDimensions);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateDimensions);
      }
    };
  }, []);

  return responsiveState;
};