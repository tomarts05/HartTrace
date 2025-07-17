import React from 'react';

interface ShareButtonProps {
  level: number;
  time: number;
  className?: string;
  children?: React.ReactNode;
}

export const ShareButton: React.FC<ShareButtonProps> = ({ 
  level, 
  time, 
  className = '', 
  children 
}) => {
  const handleShare = () => {
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

    // Create dynamic share quote as specified in requirements
    const shareQuote = `I just beat Level ${level} on Hartash in ${formatTime(time)}! Try to beat me 👉 https://hartash.com`;
    
    // Facebook sharer.php URL (no SDK required)
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://hartash.com')}&quote=${encodeURIComponent(shareQuote)}`;
    
    // Open in new tab
    window.open(shareUrl, '_blank', 'width=600,height=400');
  };

  return (
    <button
      onClick={handleShare}
      className={`share-button ${className}`}
      type="button"
    >
      {children || '📲 Share on Facebook'}
    </button>
  );
};

export default ShareButton;