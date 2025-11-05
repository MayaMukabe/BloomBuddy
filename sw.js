const CACHE_NAME = 'bloombuddy-v1';
const NOTIFICATION_ICON = '/Images/favicon.png';

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/Images/favicon.png',
        '/dashboard.html'
      ]);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.action);
  
  event.notification.close();
  
  const data = event.notification.data || {};
  
  if (event.action === 'open' || !event.action) {
    // Open or focus the app
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url.includes(data.url || '/dashboard.html') && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open new window if none exists
        if (clients.openWindow) {
          return clients.openWindow(data.url || '/dashboard.html?topic=mood');
        }
      })
    );
  } else if (event.action === 'snooze') {
    // Schedule a reminder for 15 minutes later
    scheduleSnoozeNotification(event.notification);
  }
});

// Schedule a snoozed notification
function scheduleSnoozeNotification(originalNotification) {
  const snoozeTime = 15 * 60 * 1000; // 15 minutes
  
  setTimeout(() => {
    self.registration.showNotification(originalNotification.title, {
      body: originalNotification.body,
      icon: originalNotification.icon,
      badge: originalNotification.badge,
      tag: originalNotification.tag,
      data: originalNotification.data,
      requireInteraction: false,
      vibrate: [200, 100, 200]
    });
  }, snoozeTime);
}

// Handle push notifications (for future web push implementation)
self.addEventListener('push', (event) => {
  console.log('Push notification received');
  
  let notificationData = {
    title: 'BloomBuddy Check-in',
    body: 'Time for your daily check-in!',
    icon: NOTIFICATION_ICON,
    badge: NOTIFICATION_ICON,
    tag: 'bloombuddy-checkin'
  };
  
  if (event.data) {
    try {
      notificationData = event.data.json();
    } catch (e) {
      console.error('Failed to parse push data:', e);
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon || NOTIFICATION_ICON,
      badge: notificationData.badge || NOTIFICATION_ICON,
      tag: notificationData.tag || 'bloombuddy-notification',
      requireInteraction: false,
      vibrate: [200, 100, 200],
      data: {
        url: '/dashboard.html',
        ...notificationData.data
      },
      actions: [
        { action: 'open', title: 'Check In Now' },
        { action: 'snooze', title: 'Remind Me Later' }
      ]
    })
  );
});

// Handle notification close event
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event.notification.tag);
  
  // Track notification dismissal (optional analytics)
  const data = event.notification.data || {};
  
  if (data.type === 'checkin') {
    // Log that user dismissed the notification
    console.log('Check-in reminder dismissed');
  }
});

// Fetch event - implement basic caching strategy
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached response if available
      if (response) {
        return response;
      }
      
      // Otherwise fetch from network
      return fetch(event.request).then((response) => {
        // Check if valid response
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        
        // Clone the response
        const responseToCache = response.clone();
        
        // Cache static assets
        if (event.request.url.match(/\.(png|jpg|jpeg|gif|svg|css|js)$/)) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        
        return response;
      });
    })
  );
});

// Handle messages from clients
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaitting();
  }
  
  if (event.data && event.data.type === 'SCHEDULE_NOTIFICATION') {
    const { title, body, time } = event.data;
    
    // Calculate delay until notification time
    const now = new Date();
    const notificationTime = new Date(time);
    const delay = notificationTime - now;
    
    if (delay > 0) {
      setTimeout(() => {
        self.registration.showNotification(title, {
          body: body,
          icon: NOTIFICATION_ICON,
          badge: NOTIFICATION_ICON,
          tag: 'bloombuddy-scheduled',
          requireInteraction: false,
          vibrate: [200, 100, 200],
          data: {
            url: '/dashboard.html',
            type: 'scheduled'
          },
          actions: [
            { action: 'open', title: 'Check In Now' },
            { action: 'snooze', title: 'Remind Me Later' }
          ]
        });
      }, delay);
    }
  }
});

console.log('Service Worker loaded successfully');