/**
 * Service Worker Registration Utility
 * Handles registration, updates, and offline status
 */

export interface ServiceWorkerStatus {
  isSupported: boolean;
  isRegistered: boolean;
  isActive: boolean;
  isOffline: boolean;
  updateAvailable: boolean;
}

export class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private status: ServiceWorkerStatus = {
    isSupported: false,
    isRegistered: false,
    isActive: false,
    isOffline: false,
    updateAvailable: false
  };
  
  // Callbacks
  private onStatusChange: ((status: ServiceWorkerStatus) => void) | null = null;
  private onUpdateAvailable: (() => void) | null = null;
  private onOfflineChange: ((isOffline: boolean) => void) | null = null;

  constructor() {
    this.checkSupport();
    this.setupOfflineListener();
  }

  /**
   * Check if service workers are supported
   */
  private checkSupport(): void {
    this.status.isSupported = 'serviceWorker' in navigator;
    this.updateStatus();
  }

  /**
   * Register the service worker
   */
  async register(swPath: string = '/sw.js'): Promise<boolean> {
    if (!this.status.isSupported) {
      console.warn('⚠️ Service Workers not supported in this browser');
      return false;
    }

    try {
      console.log('🔧 Registering Service Worker...');
      
      this.registration = await navigator.serviceWorker.register(swPath, {
        scope: '/'
      });

      this.status.isRegistered = true;
      this.status.isActive = this.registration.active !== null;
      
      this.setupEventListeners();
      this.updateStatus();
      
      console.log('✅ Service Worker registered successfully');
      return true;
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
      return false;
    }
  }

  /**
   * Setup service worker event listeners
   */
  private setupEventListeners(): void {
    if (!this.registration) return;

    // Listen for updates
    this.registration.addEventListener('updatefound', () => {
      console.log('🔄 Service Worker update found');
      
      const newWorker = this.registration!.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          console.log('🆕 New Service Worker available');
          this.status.updateAvailable = true;
          this.updateStatus();
          
          if (this.onUpdateAvailable) {
            this.onUpdateAvailable();
          }
        }
      });
    });

    // Listen for controller changes
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('🔄 Service Worker controller changed');
      this.status.isActive = navigator.serviceWorker.controller !== null;
      this.updateStatus();
    });

    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      this.handleServiceWorkerMessage(event.data);
    });
  }

  /**
   * Handle messages from service worker
   */
  private handleServiceWorkerMessage(data: any): void {
    console.log('📨 Message from Service Worker:', data);
    
    switch (data.type) {
      case 'CACHE_UPDATED':
        console.log('💾 Cache updated by Service Worker');
        break;
        
      case 'OFFLINE_READY':
        console.log('📴 App ready for offline use');
        break;
        
      default:
        console.log('📨 Unknown message from Service Worker:', data);
    }
  }

  /**
   * Setup offline/online status listener
   */
  private setupOfflineListener(): void {
    const updateOfflineStatus = () => {
      const wasOffline = this.status.isOffline;
      this.status.isOffline = !navigator.onLine;
      
      if (wasOffline !== this.status.isOffline) {
        console.log(this.status.isOffline ? '📴 App went offline' : '📶 App came online');
        
        if (this.onOfflineChange) {
          this.onOfflineChange(this.status.isOffline);
        }
      }
      
      this.updateStatus();
    };

    window.addEventListener('online', updateOfflineStatus);
    window.addEventListener('offline', updateOfflineStatus);
    
    // Initial status
    updateOfflineStatus();
  }

  /**
   * Update service worker to latest version
   */
  async update(): Promise<boolean> {
    if (!this.registration) {
      console.warn('⚠️ No service worker registration found');
      return false;
    }

    try {
      console.log('🔄 Checking for Service Worker updates...');
      
      await this.registration.update();
      
      if (this.registration.waiting) {
        console.log('🆕 Service Worker update ready');
        this.activateWaitingServiceWorker();
        return true;
      }
      
      console.log('✅ Service Worker is up to date');
      return false;
    } catch (error) {
      console.error('❌ Service Worker update failed:', error);
      return false;
    }
  }

  /**
   * Activate waiting service worker
   */
  private activateWaitingServiceWorker(): void {
    if (!this.registration || !this.registration.waiting) return;

    this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    
    // Reload page after activation
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    }, { once: true });
  }

  /**
   * Send message to service worker
   */
  sendMessage(message: any): void {
    if (!navigator.serviceWorker.controller) {
      console.warn('⚠️ No active service worker to send message to');
      return;
    }

    navigator.serviceWorker.controller.postMessage(message);
  }

  /**
   * Preload critical resources
   */
  async preloadResources(urls: string[]): Promise<void> {
    this.sendMessage({
      type: 'PRELOAD_RESOURCES',
      urls
    });
  }

  /**
   * Clear all caches
   */
  async clearCaches(): Promise<boolean> {
    try {
      const cacheNames = await caches.keys();
      
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      
      console.log('🗑️ All caches cleared');
      return true;
    } catch (error) {
      console.error('❌ Failed to clear caches:', error);
      return false;
    }
  }

  /**
   * Get cache storage info
   */
  async getCacheInfo(): Promise<{ caches: string[]; totalSize: number }> {
    try {
      const cacheNames = await caches.keys();
      let totalSize = 0;
      
      // Estimate cache sizes (this is an approximation)
      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        totalSize += requests.length * 1024; // Rough estimate
      }
      
      return {
        caches: cacheNames,
        totalSize
      };
    } catch (error) {
      console.error('❌ Failed to get cache info:', error);
      return { caches: [], totalSize: 0 };
    }
  }

  /**
   * Check if app can work offline
   */
  async checkOfflineCapability(): Promise<boolean> {
    try {
      // Try to access a critical resource from cache
      const cache = await caches.open('harttrace-static-v1.0.0');
      const response = await cache.match('/');
      
      return response !== undefined;
    } catch (error) {
      console.error('❌ Offline capability check failed:', error);
      return false;
    }
  }

  /**
   * Get current status
   */
  getStatus(): ServiceWorkerStatus {
    return { ...this.status };
  }

  /**
   * Set status change callback
   */
  onStatusUpdate(callback: (status: ServiceWorkerStatus) => void): void {
    this.onStatusChange = callback;
  }

  /**
   * Set update available callback
   */
  onUpdateReady(callback: () => void): void {
    this.onUpdateAvailable = callback;
  }

  /**
   * Set offline change callback
   */
  onOfflineStatusChange(callback: (isOffline: boolean) => void): void {
    this.onOfflineChange = callback;
  }

  /**
   * Update status and notify listeners
   */
  private updateStatus(): void {
    if (this.onStatusChange) {
      this.onStatusChange(this.getStatus());
    }
  }

  /**
   * Unregister service worker (for debugging)
   */
  async unregister(): Promise<boolean> {
    if (!this.registration) {
      console.warn('⚠️ No service worker registration to unregister');
      return false;
    }

    try {
      const success = await this.registration.unregister();
      
      if (success) {
        console.log('🗑️ Service Worker unregistered successfully');
        this.registration = null;
        this.status.isRegistered = false;
        this.status.isActive = false;
        this.updateStatus();
      }
      
      return success;
    } catch (error) {
      console.error('❌ Service Worker unregistration failed:', error);
      return false;
    }
  }

  /**
   * Show update notification to user
   */
  showUpdateNotification(): void {
    // This could be enhanced to show a custom notification
    // For now, just log and could trigger app-level notification
    console.log('🔔 Showing update notification to user');
    
    // Could dispatch custom event for app to handle
    window.dispatchEvent(new CustomEvent('sw-update-available'));
  }

  /**
   * Enable background sync
   */
  async enableBackgroundSync(tag: string = 'background-sync'): Promise<boolean> {
    if (!this.registration || !this.registration.sync) {
      console.warn('⚠️ Background Sync not supported');
      return false;
    }

    try {
      await this.registration.sync.register(tag);
      console.log('🔄 Background sync enabled');
      return true;
    } catch (error) {
      console.error('❌ Background sync registration failed:', error);
      return false;
    }
  }
}

// Create singleton instance
const serviceWorkerManager = new ServiceWorkerManager();
export default serviceWorkerManager;