/**
 * Service Worker for HartTrace Puzzle Game
 * Provides offline support and asset caching
 */

const CACHE_NAME = 'harttrace-v1.0.0';
const STATIC_CACHE_NAME = 'harttrace-static-v1.0.0';
const DYNAMIC_CACHE_NAME = 'harttrace-dynamic-v1.0.0';

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/styles.css'
];

// Dynamic assets that can be cached on demand
const CACHE_STRATEGIES = {
  // Cache first, then network (for static assets)
  cacheFirst: [
    /\.(?:js|css|woff2?|png|jpg|jpeg|gif|svg|ico)$/,
    /\/static\//,
    /\/assets\//
  ],
  
  // Network first, then cache (for API calls and dynamic content)
  networkFirst: [
    /\/api\//,
    /\/data\//
  ],
  
  // Stale while revalidate (for frequently updated content)
  staleWhileRevalidate: [
    /\/$/,
    /\.html$/
  ]
};

/**
 * Install event - cache static assets
 */
self.addEventListener('install', event => {
  console.log('🔧 Service Worker: Installing...');
  
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE_NAME).then(cache => {
        console.log('📦 Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', event => {
  console.log('✅ Service Worker: Activating...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE_NAME &&
                cacheName.startsWith('harttrace-')) {
              console.log('🗑️ Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      
      // Take control of all clients
      self.clients.claim()
    ])
  );
});

/**
 * Fetch event - handle network requests with caching strategies
 */
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and moz-extension requests
  if (url.protocol === 'chrome-extension:' || url.protocol === 'moz-extension:') {
    return;
  }
  
  // Determine caching strategy
  const strategy = getCachingStrategy(url.pathname + url.search);
  
  event.respondWith(
    handleRequest(request, strategy)
  );
});

/**
 * Determine the appropriate caching strategy for a request
 */
function getCachingStrategy(path) {
  // Check cache first patterns
  for (const pattern of CACHE_STRATEGIES.cacheFirst) {
    if (pattern.test(path)) {
      return 'cacheFirst';
    }
  }
  
  // Check network first patterns
  for (const pattern of CACHE_STRATEGIES.networkFirst) {
    if (pattern.test(path)) {
      return 'networkFirst';
    }
  }
  
  // Check stale while revalidate patterns
  for (const pattern of CACHE_STRATEGIES.staleWhileRevalidate) {
    if (pattern.test(path)) {
      return 'staleWhileRevalidate';
    }
  }
  
  // Default to network first
  return 'networkFirst';
}

/**
 * Handle request based on caching strategy
 */
async function handleRequest(request, strategy) {
  const cacheName = isStaticAsset(request.url) ? STATIC_CACHE_NAME : DYNAMIC_CACHE_NAME;
  
  switch (strategy) {
    case 'cacheFirst':
      return cacheFirst(request, cacheName);
      
    case 'networkFirst':
      return networkFirst(request, cacheName);
      
    case 'staleWhileRevalidate':
      return staleWhileRevalidate(request, cacheName);
      
    default:
      return networkFirst(request, cacheName);
  }
}

/**
 * Cache first strategy - check cache, fallback to network
 */
async function cacheFirst(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('💾 Cache hit:', request.url);
      return cachedResponse;
    }
    
    console.log('🌐 Cache miss, fetching:', request.url);
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('❌ Cache first failed:', error);
    return new Response('Offline', { status: 503 });
  }
}

/**
 * Network first strategy - try network, fallback to cache
 */
async function networkFirst(request, cacheName) {
  try {
    console.log('🌐 Network first:', request.url);
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('💾 Network failed, trying cache:', request.url);
    
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline fallback
    return createOfflineFallback(request);
  }
}

/**
 * Stale while revalidate - return cache immediately, update in background
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  // Start network request in background
  const networkPromise = fetch(request).then(networkResponse => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(error => {
    console.log('🔄 Background update failed:', error);
  });
  
  // Return cached response immediately if available
  if (cachedResponse) {
    console.log('💾 Stale cache hit:', request.url);
    return cachedResponse;
  }
  
  // If no cache, wait for network
  console.log('🌐 No cache, waiting for network:', request.url);
  try {
    return await networkPromise;
  } catch (error) {
    return createOfflineFallback(request);
  }
}

/**
 * Check if URL is a static asset
 */
function isStaticAsset(url) {
  return STATIC_ASSETS.some(asset => url.endsWith(asset)) ||
         /\.(js|css|woff2?|png|jpg|jpeg|gif|svg|ico)$/.test(url);
}

/**
 * Create offline fallback response
 */
function createOfflineFallback(request) {
  const url = new URL(request.url);
  
  // For HTML requests, return offline page
  if (request.headers.get('accept').includes('text/html')) {
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>HartTrace - Offline</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              text-align: center;
              padding: 20px;
            }
            .offline-container {
              background: rgba(255, 255, 255, 0.1);
              backdrop-filter: blur(10px);
              border-radius: 20px;
              padding: 40px;
              border: 1px solid rgba(255, 255, 255, 0.2);
            }
            h1 { margin: 0 0 20px; font-size: 2em; }
            p { margin: 10px 0; opacity: 0.9; }
            .retry-btn {
              background: rgba(255, 255, 255, 0.2);
              border: 1px solid rgba(255, 255, 255, 0.3);
              color: white;
              padding: 12px 24px;
              border-radius: 12px;
              cursor: pointer;
              margin-top: 20px;
              font-size: 16px;
            }
            .retry-btn:hover {
              background: rgba(255, 255, 255, 0.3);
            }
          </style>
        </head>
        <body>
          <div class="offline-container">
            <h1>🎮 HartTrace</h1>
            <p>You're currently offline</p>
            <p>Please check your connection and try again</p>
            <button class="retry-btn" onclick="location.reload()">Retry</button>
          </div>
        </body>
      </html>
    `, {
      status: 503,
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache'
      }
    });
  }
  
  // For other requests, return generic offline response
  return new Response('Offline', {
    status: 503,
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'no-cache'
    }
  });
}

/**
 * Handle background sync for offline actions
 */
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    console.log('🔄 Service Worker: Background sync triggered');
    event.waitUntil(handleBackgroundSync());
  }
});

/**
 * Handle background sync logic
 */
async function handleBackgroundSync() {
  try {
    // Sync any pending game data, scores, etc.
    console.log('🔄 Service Worker: Performing background sync');
    
    // This could sync user progress, scores, achievements, etc.
    // For now, just log that sync is working
    
    return Promise.resolve();
  } catch (error) {
    console.error('❌ Background sync failed:', error);
    throw error;
  }
}

/**
 * Handle push notifications (for future features)
 */
self.addEventListener('push', event => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'harttrace-notification',
    data: data.url
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

/**
 * Handle notification clicks
 */
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.notification.data) {
    event.waitUntil(
      clients.openWindow(event.notification.data)
    );
  }
});

console.log('🎮 HartTrace Service Worker loaded successfully');