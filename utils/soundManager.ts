import { Howl } from 'howler';

interface SoundConfig {
  volume?: number;
  loop?: boolean;
  preload?: boolean;
}

class SoundManager {
  private sounds: Map<string, Howl> = new Map();
  private isMuted: boolean = false;
  private globalVolume: number = 0.7;

  constructor() {
    // Check for user preference for sound
    const soundPreference = localStorage.getItem('harttrace-sound-enabled');
    this.isMuted = soundPreference === 'false';
  }

  // Create sound effects using Web Audio API fallback for simple sounds
  private createSimpleSound(frequency: number, duration: number, type: 'sine' | 'square' | 'triangle' = 'sine'): Promise<void> {
    return new Promise((resolve) => {
      if (this.isMuted) {
        resolve();
        return;
      }

      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        oscillator.type = type;

        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(this.globalVolume * 0.3, audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);

        setTimeout(() => resolve(), duration * 1000);
      } catch (error) {
        console.warn('Web Audio API not supported, skipping sound effect');
        resolve();
      }
    });
  }

  loadSound(name: string, src: string | string[], config: SoundConfig = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      const sound = new Howl({
        src: Array.isArray(src) ? src : [src],
        volume: (config.volume || 1) * this.globalVolume,
        loop: config.loop || false,
        preload: config.preload !== false,
        onload: () => {
          this.sounds.set(name, sound);
          resolve();
        },
        onerror: (id, error) => {
          console.warn(`Failed to load sound ${name}:`, error);
          reject(error);
        }
      });
    });
  }

  async playClick(): Promise<void> {
    // Simple click sound using Web Audio API
    return this.createSimpleSound(800, 0.1, 'sine');
  }

  async playComplete(): Promise<void> {
    // Victory sound sequence
    if (this.isMuted) return;
    
    await this.createSimpleSound(523.25, 0.2, 'sine'); // C5
    await new Promise(resolve => setTimeout(resolve, 100));
    await this.createSimpleSound(659.25, 0.2, 'sine'); // E5
    await new Promise(resolve => setTimeout(resolve, 100));
    await this.createSimpleSound(783.99, 0.3, 'sine'); // G5
  }

  async playError(): Promise<void> {
    // Error sound
    return this.createSimpleSound(200, 0.3, 'square');
  }

  async playDraw(): Promise<void> {
    // Subtle drawing sound
    return this.createSimpleSound(400 + Math.random() * 200, 0.05, 'triangle');
  }

  playSound(name: string): void {
    if (this.isMuted) return;

    const sound = this.sounds.get(name);
    if (sound) {
      sound.play();
    }
  }

  stopSound(name: string): void {
    const sound = this.sounds.get(name);
    if (sound) {
      sound.stop();
    }
  }

  setGlobalVolume(volume: number): void {
    this.globalVolume = Math.max(0, Math.min(1, volume));
    this.sounds.forEach(sound => {
      sound.volume(this.globalVolume);
    });
  }

  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    localStorage.setItem('harttrace-sound-enabled', String(!this.isMuted));
    return this.isMuted;
  }

  isSoundMuted(): boolean {
    return this.isMuted;
  }

  // Preload simple sound effects for better performance
  async preloadSounds(): Promise<void> {
    // Since we're using Web Audio API for simple sounds, no preloading needed
    console.log('🔊 Sound system initialized with Web Audio API');
  }
}

// Export singleton instance
export const soundManager = new SoundManager();
export default soundManager;