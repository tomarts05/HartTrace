/**
 * FeedbackRenderer - Enhanced visual feedback and scoring display
 * Handles score visualization, animations, and user feedback
 */

import { FeedbackGrade, GameStats } from './gameEngine';

export interface FeedbackAnimation {
  type: 'fade' | 'slide' | 'pulse' | 'bounce' | 'shake';
  duration: number; // milliseconds
  easing: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';
  delay?: number;
}

export interface VisualFeedback {
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
  animation: FeedbackAnimation;
  autoHide?: boolean;
  hideDelay?: number;
}

export interface ScoreDisplay {
  grade: FeedbackGrade;
  stats: GameStats;
  showBreakdown: boolean;
  animations: {
    scoreReveal: FeedbackAnimation;
    gradeReveal: FeedbackAnimation;
    bonusReveal: FeedbackAnimation;
  };
}

export class FeedbackRenderer {
  private container: HTMLElement | null = null;
  private activeAnimations: Map<string, number> = new Map(); // Animation IDs
  private feedbackQueue: VisualFeedback[] = [];
  private isProcessingQueue = false;

  constructor(containerId?: string) {
    if (containerId) {
      this.container = document.getElementById(containerId);
    }
    
    if (!this.container) {
      // Create default feedback container
      this.createDefaultContainer();
    }
  }

  /**
   * Create default feedback container
   */
  private createDefaultContainer(): void {
    this.container = document.createElement('div');
    this.container.id = 'feedback-renderer';
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      z-index: 1000;
      overflow: hidden;
    `;
    document.body.appendChild(this.container);
  }

  /**
   * Show immediate feedback for user actions
   */
  showFeedback(feedback: VisualFeedback): void {
    this.feedbackQueue.push(feedback);
    
    if (!this.isProcessingQueue) {
      this.processQueuedFeedback();
    }
  }

  /**
   * Process queued feedback messages
   */
  private async processQueuedFeedback(): Promise<void> {
    this.isProcessingQueue = true;
    
    while (this.feedbackQueue.length > 0) {
      const feedback = this.feedbackQueue.shift()!;
      await this.renderFeedback(feedback);
    }
    
    this.isProcessingQueue = false;
  }

  /**
   * Render individual feedback message
   */
  private async renderFeedback(feedback: VisualFeedback): Promise<void> {
    if (!this.container) return;

    const feedbackElement = this.createFeedbackElement(feedback);
    this.container.appendChild(feedbackElement);

    // Apply entrance animation
    await this.animateElement(feedbackElement, feedback.animation);

    // Auto-hide if configured
    if (feedback.autoHide && feedback.hideDelay) {
      setTimeout(() => {
        this.hideFeedback(feedbackElement);
      }, feedback.hideDelay);
    }
  }

  /**
   * Create feedback DOM element
   */
  private createFeedbackElement(feedback: VisualFeedback): HTMLElement {
    const element = document.createElement('div');
    element.className = `feedback-message feedback-${feedback.type}`;
    element.textContent = feedback.message;
    
    // Base styles
    element.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      padding: 12px 24px;
      border-radius: 12px;
      font-weight: 600;
      font-size: 16px;
      text-align: center;
      pointer-events: none;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      opacity: 0;
      z-index: 1001;
    `;

    // Type-specific styles
    const typeStyles = {
      success: 'background: rgba(34, 197, 94, 0.9); color: white;',
      warning: 'background: rgba(245, 158, 11, 0.9); color: white;',
      error: 'background: rgba(239, 68, 68, 0.9); color: white;',
      info: 'background: rgba(59, 130, 246, 0.9); color: white;'
    };

    element.style.cssText += typeStyles[feedback.type];
    
    return element;
  }

  /**
   * Show detailed score display after level completion
   */
  showScoreDisplay(scoreDisplay: ScoreDisplay): Promise<void> {
    return new Promise((resolve) => {
      if (!this.container) {
        resolve();
        return;
      }

      const scoreElement = this.createScoreElement(scoreDisplay);
      this.container.appendChild(scoreElement);

      // Sequence of animations
      this.animateScoreSequence(scoreElement, scoreDisplay, resolve);
    });
  }

  /**
   * Create score display element
   */
  private createScoreElement(scoreDisplay: ScoreDisplay): HTMLElement {
    const { grade, stats } = scoreDisplay;
    
    const element = document.createElement('div');
    element.className = 'score-display';
    
    element.innerHTML = `
      <div class="score-container">
        <div class="grade-section">
          <div class="grade-label">${grade.grade}</div>
          <div class="grade-score">${grade.score}/100</div>
        </div>
        
        <div class="stats-section">
          <div class="stat-row">
            <span class="stat-label">Time:</span>
            <span class="stat-value">${this.formatTime(stats.timeElapsed)}/${this.formatTime(stats.timeLimit)}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Moves:</span>
            <span class="stat-value">${stats.moveCount}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Efficiency:</span>
            <span class="stat-value">${stats.efficiency.toFixed(1)}%</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Accuracy:</span>
            <span class="stat-value">${stats.accuracy.toFixed(1)}%</span>
          </div>
        </div>
        
        ${scoreDisplay.showBreakdown ? this.createBonusBreakdown(grade) : ''}
        
        <div class="message-section">
          <p class="grade-message">${grade.message}</p>
        </div>
        
        <button class="continue-button">Continue</button>
      </div>
    `;

    // Styles
    element.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(5px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1002;
      opacity: 0;
    `;

    // Score container styles
    const container = element.querySelector('.score-container') as HTMLElement;
    if (container) {
      container.style.cssText = `
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(20px);
        border-radius: 20px;
        padding: 32px;
        text-align: center;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.3);
        min-width: 300px;
        transform: scale(0.8);
      `;
    }

    return element;
  }

  /**
   * Create bonus breakdown section
   */
  private createBonusBreakdown(grade: FeedbackGrade): string {
    if (grade.timeBonus === 0 && grade.efficiencyBonus === 0) {
      return '';
    }

    return `
      <div class="bonus-section">
        <div class="bonus-title">Bonuses:</div>
        ${grade.timeBonus > 0 ? `<div class="bonus-item">Time: +${grade.timeBonus}</div>` : ''}
        ${grade.efficiencyBonus > 0 ? `<div class="bonus-item">Efficiency: +${grade.efficiencyBonus}</div>` : ''}
      </div>
    `;
  }

  /**
   * Animate score display sequence
   */
  private async animateScoreSequence(
    element: HTMLElement, 
    scoreDisplay: ScoreDisplay, 
    onComplete: () => void
  ): Promise<void> {
    const container = element.querySelector('.score-container') as HTMLElement;
    
    // 1. Fade in overlay
    await this.animateElement(element, {
      type: 'fade',
      duration: 300,
      easing: 'ease-out'
    });

    // 2. Scale in container
    if (container) {
      await this.animateElement(container, {
        type: 'bounce',
        duration: 500,
        easing: 'ease-out'
      });
    }

    // 3. Reveal elements sequentially
    const grade = element.querySelector('.grade-section');
    const stats = element.querySelector('.stats-section');
    const bonus = element.querySelector('.bonus-section');
    const message = element.querySelector('.message-section');
    const button = element.querySelector('.continue-button');

    const delay = 200;
    
    if (grade) await this.animateElement(grade as HTMLElement, scoreDisplay.animations.gradeReveal);
    
    setTimeout(async () => {
      if (stats) await this.animateElement(stats as HTMLElement, scoreDisplay.animations.scoreReveal);
    }, delay);

    setTimeout(async () => {
      if (bonus) await this.animateElement(bonus as HTMLElement, scoreDisplay.animations.bonusReveal);
    }, delay * 2);

    setTimeout(async () => {
      if (message) await this.animateElement(message as HTMLElement, { type: 'fade', duration: 400, easing: 'ease-out' });
    }, delay * 3);

    setTimeout(async () => {
      if (button) {
        await this.animateElement(button as HTMLElement, { type: 'pulse', duration: 300, easing: 'ease-out' });
        
        // Add click handler
        button.addEventListener('click', () => {
          this.hideFeedback(element);
          onComplete();
        });
      }
    }, delay * 4);
  }

  /**
   * Animate element with specified animation
   */
  private animateElement(element: HTMLElement, animation: FeedbackAnimation): Promise<void> {
    return new Promise((resolve) => {
      const animationId = Date.now().toString();
      
      // Apply animation delay if specified
      if (animation.delay) {
        setTimeout(() => this.applyAnimation(element, animation, animationId, resolve), animation.delay);
      } else {
        this.applyAnimation(element, animation, animationId, resolve);
      }
    });
  }

  /**
   * Apply animation to element
   */
  private applyAnimation(
    element: HTMLElement, 
    animation: FeedbackAnimation, 
    animationId: string, 
    resolve: () => void
  ): void {
    // Store animation reference
    this.activeAnimations.set(animationId, Date.now());

    // Set animation properties
    element.style.transition = `all ${animation.duration}ms ${animation.easing}`;

    // Apply animation based on type
    switch (animation.type) {
      case 'fade':
        element.style.opacity = '1';
        break;
        
      case 'slide':
        element.style.transform = 'translate(-50%, -50%) translateY(0)';
        element.style.opacity = '1';
        break;
        
      case 'pulse':
        element.style.transform = 'translate(-50%, -50%) scale(1.05)';
        element.style.opacity = '1';
        setTimeout(() => {
          element.style.transform = 'translate(-50%, -50%) scale(1)';
        }, animation.duration / 2);
        break;
        
      case 'bounce':
        element.style.transform = 'translate(-50%, -50%) scale(1)';
        element.style.opacity = '1';
        break;
        
      case 'shake':
        let shakeCount = 0;
        const shakeInterval = setInterval(() => {
          const offset = shakeCount % 2 === 0 ? '2px' : '-2px';
          element.style.transform = `translate(-50%, -50%) translateX(${offset})`;
          shakeCount++;
          
          if (shakeCount >= 6) {
            clearInterval(shakeInterval);
            element.style.transform = 'translate(-50%, -50%)';
          }
        }, animation.duration / 6);
        break;
    }

    // Complete animation
    setTimeout(() => {
      this.activeAnimations.delete(animationId);
      resolve();
    }, animation.duration);
  }

  /**
   * Hide feedback element
   */
  private hideFeedback(element: HTMLElement): void {
    element.style.transition = 'opacity 300ms ease-out';
    element.style.opacity = '0';
    
    setTimeout(() => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    }, 300);
  }

  /**
   * Format time in MM:SS format
   */
  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Show quick feedback for immediate actions
   */
  showQuickFeedback(message: string, type: 'success' | 'warning' | 'error' = 'info'): void {
    this.showFeedback({
      message,
      type,
      animation: {
        type: 'fade',
        duration: 300,
        easing: 'ease-out'
      },
      autoHide: true,
      hideDelay: 2000
    });
  }

  /**
   * Show move validation feedback
   */
  showMoveValidation(isValid: boolean, accuracy: number): void {
    if (isValid && accuracy >= 90) {
      // No feedback for perfect moves to avoid spam
      return;
    }
    
    if (!isValid) {
      this.showQuickFeedback('Invalid move!', 'error');
    } else if (accuracy < 70) {
      this.showQuickFeedback('Close enough!', 'warning');
    }
  }

  /**
   * Show time warning
   */
  showTimeWarning(timeRemaining: number, isCritical: boolean = false): void {
    const type = isCritical === true ? 'error' : 'warning';
    const message = isCritical === true ? 
      `⏰ ${timeRemaining}s left!` : 
      `⚠️ ${timeRemaining}s remaining`;
      
    this.showQuickFeedback(message, type);
  }

  /**
   * Clear all active feedback
   */
  clearAllFeedback(): void {
    if (!this.container) return;
    
    // Clear active animations
    this.activeAnimations.clear();
    
    // Remove all feedback elements
    const feedbackElements = this.container.querySelectorAll('.feedback-message, .score-display');
    feedbackElements.forEach(element => {
      this.hideFeedback(element as HTMLElement);
    });
    
    // Clear queue
    this.feedbackQueue = [];
    this.isProcessingQueue = false;
  }

  /**
   * Destroy feedback renderer and clean up
   */
  destroy(): void {
    this.clearAllFeedback();
    
    if (this.container && this.container.id === 'feedback-renderer') {
      document.body.removeChild(this.container);
    }
    
    this.container = null;
  }
}

export default FeedbackRenderer;