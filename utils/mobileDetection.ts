// Mobile detection utility for performance optimizations
export const isMobileDevice = (): boolean => {
  // Check for touch support and small screen size
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth <= 768;
  const isMobileUserAgent = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  return hasTouch && (isSmallScreen || isMobileUserAgent);
};

export const getScreenSizeCategory = (): 'small' | 'medium' | 'large' | 'xlarge' => {
  const width = window.innerWidth;
  if (width < 480) return 'small';
  if (width < 768) return 'medium';
  if (width < 1024) return 'large';
  return 'xlarge';
};

export const getPerformanceMode = (): 'high' | 'medium' | 'low' => {
  if (!isMobileDevice()) return 'high';
  
  // Check device performance indicators
  const deviceMemory = (navigator as any).deviceMemory;
  const hardwareConcurrency = navigator.hardwareConcurrency;
  
  if (deviceMemory && deviceMemory >= 4 && hardwareConcurrency >= 4) {
    return 'medium';
  }
  
  return 'low';
};

export const shouldReduceAnimations = (): boolean => {
  // Check for user preference for reduced motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const performanceMode = getPerformanceMode();
  
  return prefersReducedMotion || performanceMode === 'low';
};