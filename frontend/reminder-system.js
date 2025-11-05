// ...existing code...
class ReminderSystem {
  constructor() {
    this.db = window.db;
    this.userId = null;
    this.notificationPermission = 'default';
    this.defaultTimes = [
      { time: '09:00', label: 'Morning Check-in' },
      { time: '13:00', label: 'Afternoon Check-in' },
      { time: '20:00', label: 'Evening Reflection' }
    ];
  }

  //Initialize the reminder system
   
  async init(userId) {
    this.userId = userId;
    await this.checkNotificationPermission();
    await this.loadUserReminders();
    await this.scheduleReminders();
  }

  //Check and request notification permissions
  async checkNotificationPermission() {
    if (!('Notification' in window)) {
      console.log('Browser does not support notifications');
      return false;
    }

    this.notificationPermission = Notification.permission;

    if (this.notificationPermission === 'default') {
      //Don't auto-request, let user enable from settings
      return false;
    }

    return this.notificationPermission === 'granted';
  }

  //Request notification permission from user
  async requestNotificationPermission() {
    if (!('Notification' in window)) {
      throw new Error('Browser does not support notifications');
    }

    const permission = await Notification.requestPermission();
    this.notificationPermission = permission;

    if (permission === 'granted') {
      await this.registerServiceWorker();
      return true;
    }

    return false;
  }

  //Register service worker for push notifications
  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', registration);
        return registration;
      } catch (error) {
        console.error('Service Worker registration failed:', error);
        throw error;
      }
    }
  }

  //Load user's reminder preferences from Firestore
  async loadUserReminders() {
    try {
      const userDocRef = window.doc(this.db, 'users', this.userId);
      const userDoc = await window.getDoc(userDocRef);

      if (userDoc.exists() && userDoc.data().reminders) {
        return userDoc.data().reminders;
      }

      //Return default reminders if none exist
      return {
        enabled: false,
        times: this.defaultTimes,
        notificationsEnabled: false,
        quietHours: {
          enabled: false,
          start: '22:00',
          end: '07:00'
        }
      };
    } catch (error) {
      console.error('Error loading reminders:', error);
      return null;
    }
  }

  //Save reminder preferences to Firestore
  async saveReminderSettings(settings) {
    try {
      const userDocRef = window.doc(this.db, 'users', this.userId);
      await window.updateDoc(userDocRef, {
        reminders: settings,
        updatedAt: window.serverTimestamp()
      });

      //Reschedule reminders with new settings
      await this.scheduleReminders();

      return true;
    } catch (error) {
      console.error('Error saving reminders:', error);
      throw error;
    }
  }

  //Schedule all active reminders
  async scheduleReminders() {
    const settings = await this.loadUserReminders();

    if (!settings || !settings.enabled) {
      this.clearAllReminders();
      return;
    }

    //Clear existing reminders
    this.clearAllReminders();

    //Schedule each reminder time
    settings.times.forEach(reminder => {
      this.scheduleReminder(reminder, settings.quietHours);
    });
  }

  //Schedule a single reminder
  scheduleReminder(reminder, quietHours) {
    const [hours, minutes] = reminder.time.split(':').map(Number);
    
    //Calculate milliseconds until next occurrence
    const now = new Date();
    let scheduledTime = new Date();
    scheduledTime.setHours(hours, minutes, 0, 0);

    //If time has passed today, schedule for tomorrow
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    //Check if within quiet hours
    if (quietHours && quietHours.enabled) {
      if (this.isInQuietHours(scheduledTime, quietHours)) {
        console.log(`Reminder skipped due to quiet hours: ${reminder.label}`);
        return;
      }
    }

    const timeUntilReminder = scheduledTime - now;

    //Schedule the reminder
    const timerId = setTimeout(() => {
      this.triggerReminder(reminder);
      //Reschedule for next day
      this.scheduleReminder(reminder, quietHours);
    }, timeUntilReminder);

    //Store timer ID for later cancellation
    this.storeTimerId(reminder.time, timerId);

    console.log(`Reminder scheduled: ${reminder.label} at ${reminder.time}`);
  }

  //Check if time is within quiet hours
  isInQuietHours(time, quietHours) {
    const timeHours = time.getHours();
    const timeMinutes = time.getMinutes();
    const currentTime = timeHours * 60 + timeMinutes;

    const [startHours, startMinutes] = quietHours.start.split(':').map(Number);
    const [endHours, endMinutes] = quietHours.end.split(':').map(Number);
    const startTime = startHours * 60 + startMinutes;
    const endTime = endHours * 60 + endMinutes;

    //Handle overnight quiet hours (e.g., 22:00 to 07:00)
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime;
    }

    return currentTime >= startTime && currentTime <= endTime;
  }

  //Trigger a reminder notification
  async triggerReminder(reminder) {
    console.log(`Triggering reminder: ${reminder.label}`);

    //Show browser notification if permitted
    if (this.notificationPermission === 'granted') {
      this.showNotification(reminder);
    }

    //Show in-app notification
    this.showInAppNotification(reminder);

    //Log reminder activity
    await this.logReminderActivity(reminder);
  }

  //Show browser push notification
  async showNotification(reminder) {
    try {
      const options = {
        body: 'Take a moment to check in with yourself and reflect on your day.',
        icon: '/Images/favicon.png',
        badge: '/Images/favicon.png',
        tag: 'bloombuddy-checkin',
        requireInteraction: false,
        vibrate: [200, 100, 200],
        data: {
          type: 'checkin',
          time: reminder.time,
          url: '/dashboard.html'
        },
        actions: [
          { action: 'open', title: 'Check In Now' },
          { action: 'snooze', title: 'Remind Me Later' }
        ]
      };

      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        //Use service worker for better notification handling
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(reminder.label, options);
      } else {
        //Fallback to regular notification
        new Notification(reminder.label, options);
      }
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }

  //Show in-app notification banner
  showInAppNotification(reminder) {
    //Create notification element
    const notification = document.createElement('div');
    notification.className = 'reminder-notification';
    notification.innerHTML = `
      <div class="reminder-content">
        <div class="reminder-icon">🌸</div>
        <div class="reminder-text">
          <h4>${reminder.label}</h4>
          <p>Take a moment to check in with yourself</p>
        </div>
        <div class="reminder-actions">
          <button class="reminder-btn primary" data-action="checkin">Check In</button>
          <button class="reminder-btn secondary" data-action="dismiss">Dismiss</button>
        </div>
      </div>
    `;

    //Add to page
    document.body.appendChild(notification);

    //Animate in
    setTimeout(() => notification.classList.add('show'), 10);

    //Handle actions
    notification.querySelector('[data-action="checkin"]').addEventListener('click', () => {
      this.handleCheckIn();
      this.dismissNotification(notification);
    });

    notification.querySelector('[data-action="dismiss"]').addEventListener('click', () => {
      this.dismissNotification(notification);
    });

    //Auto-dismiss after 10 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        this.dismissNotification(notification);
      }
    }, 10000);
  }

  //Dismiss in-app notification
  dismissNotification(notification) {
    notification.classList.remove('show');
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }

  //Handle check-in action
  handleCheckIn() {
    //Redirect to dashboard with mood check topic
    if (window.location.pathname !== '/dashboard.html') {
      window.location.href = '/dashboard.html?topic=mood';
    } else {
      //Already on dashboard, trigger mood check modal
      const moodBtn = document.querySelector('[data-topic="mood"]');
      if (moodBtn) {
        moodBtn.click();
      }
    }
  }

  //Log reminder activity to Firestore
  async logReminderActivity(reminder) {
    try {
      const activityRef = window.collection(this.db, 'users', this.userId, 'reminderActivity');
      await window.addDoc(activityRef, {
        type: 'reminder_triggered',
        label: reminder.label,
        time: reminder.time,
        timestamp: window.serverTimestamp()
      });
    } catch (error) {
      console.error('Error logging reminder activity:', error);
    }
  }

  //Store timer ID for later cancellation
  storeTimerId(time, timerId) {
    if (!this.activeTimers) {
      this.activeTimers = new Map();
    }
    this.activeTimers.set(time, timerId);
  }

  //Clear all scheduled reminders
  clearAllReminders() {
    if (this.activeTimers) {
      this.activeTimers.forEach(timerId => clearTimeout(timerId));
      this.activeTimers.clear();
    }
  }

  //Add a new reminder time
  async addReminder(time, label) {
    const settings = await this.loadUserReminders();
    
    settings.times.push({ time, label });
    
    await this.saveReminderSettings(settings);
    return true;
  }

  //Remove a reminder time
  async removeReminder(time) {
    const settings = await this.loadUserReminders();
    
    settings.times = settings.times.filter(r => r.time !== time);
    
    await this.saveReminderSettings(settings);
    return true;
  }

  //Toggle reminders on/off
  async toggleReminders(enabled) {
    const settings = await this.loadUserReminders();
    settings.enabled = enabled;
    
    await this.saveReminderSettings(settings);
    return true;
  }

  //Update quiet hours settings
  async updateQuietHours(quietHours) {
    const settings = await this.loadUserReminders();
    settings.quietHours = quietHours;
    
    await this.saveReminderSettings(settings);
    return true;
  }

  //Get reminder statistics
  async getReminderStats() {
    try {
      const activityRef = window.collection(this.db, 'users', this.userId, 'reminderActivity');
      const snapshot = await window.getDocs(activityRef);
      
      return {
        total: snapshot.size,
        thisWeek: snapshot.docs.filter(doc => {
          const date = doc.data().timestamp?.toDate();
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return date && date >= weekAgo;
        }).length
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      return { total: 0, thisWeek: 0 };
    }
  }
}

//Export the reminder system
window.ReminderSystem = ReminderSystem;

//CSS for in-app notifications
const style = document.createElement('style');
style.textContent = `
  .reminder-notification {
    position: fixed;
    top: -200px;
    left: 50%;
    transform: translateX(-50%);
    max-width: 500px;
    width: 90%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 15px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
    padding: 20px;
    z-index: 9999;
    transition: top 0.3s ease;
  }

  .reminder-notification.show {
    top: 20px;
  }

  .reminder-content {
    display: flex;
    align-items: center;
    gap: 15px;
    color: white;
  }

  .reminder-icon {
    font-size: 40px;
    flex-shrink: 0;
  }

  .reminder-text {
    flex: 1;
  }

  .reminder-text h4 {
    margin: 0 0 5px 0;
    font-size: 18px;
    font-weight: bold;
  }

  .reminder-text p {
    margin: 0;
    font-size: 14px;
    opacity: 0.9;
  }

  .reminder-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .reminder-btn {
    padding: 8px 16px;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
    font-size: 14px;
  }

  .reminder-btn.primary {
    background: white;
    color: #667eea;
  }

  .reminder-btn.primary:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(255, 255, 255, 0.3);
  }

  .reminder-btn.secondary {
    background: rgba(255, 255, 255, 0.2);
    color: white;
  }

  .reminder-btn.secondary:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  @media (max-width: 768px) {
    .reminder-notification {
      width: 95%;
      padding: 15px;
    }

    .reminder-content {
      flex-wrap: wrap;
    }

    .reminder-icon {
      font-size: 32px;
    }

    .reminder-text h4 {
      font-size: 16px;
    }

    .reminder-text p {
      font-size: 13px;
    }

    .reminder-actions {
      width: 100%;
      flex-direction: row;
      margin-top: 10px;
    }

    .reminder-btn {
      flex: 1;
      font-size: 13px;
    }
  }
`;
document.head.appendChild(style);

console.log('Reminder System loaded successfully');