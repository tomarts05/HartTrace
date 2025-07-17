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
    // Format time to display as seconds for better readability in social posts
    const formatTime = (seconds: number): string => {
      // For social sharing, show as simple seconds format as in the example
      return `${seconds} seconds`;
    };

    // Create dynamic share quote matching exact requirement format
    const shareQuote = `🔥 I just beat Level ${level} in ${formatTime(time)} on Hartash! Can you beat me? 👉 https://hartash.com`;
    
    // Facebook sharer.php URL (no SDK required)
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://hartash.com')}&quote=${encodeURIComponent(shareQuote)}`;
    
    // Open in new tab
    window.open(shareUrl, '_blank', 'width=600,height=400');
  };

  // Inline CSS styles as specified in requirements
  const buttonStyles: React.CSSProperties = {
    backgroundColor: '#1877f2', // Facebook blue
    color: 'white',             // White text
    border: 'none',
    borderRadius: '8px',        // Rounded corners
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',          // Pointer cursor on hover
    transition: 'background-color 0.2s ease',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    minWidth: '160px',
    textDecoration: 'none',
    userSelect: 'none',
  };

  return (
    <button
      onClick={handleShare}
      className={className}
      type="button"
      style={buttonStyles}
      onMouseEnter={(e) => {
        (e.target as HTMLButtonElement).style.backgroundColor = '#166fe5'; // Darker blue on hover
      }}
      onMouseLeave={(e) => {
        (e.target as HTMLButtonElement).style.backgroundColor = '#1877f2'; // Back to Facebook blue
      }}
    >
      {children || '📲 Share on Facebook'}
    </button>
  );
};

export default ShareButton;