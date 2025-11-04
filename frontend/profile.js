

function getEl(id) { return document.getElementById(id); }

// Current user data
let currentUser = null;
let userProfile = null;

// Firebase Auth State Management
window.onAuthStateChanged?.(window.auth, async (user) => {
  if (user) {
    console.log('User authenticated:', user.uid);
    currentUser = user;
    
    // Update UI with user info
    const userInitial = getEl('userInitial');
    const dropdownUserEmail = getEl('dropdownUserEmail');
    const profileInitialLarge = getEl('profileInitialLarge');
    
    if (userInitial) {
      userInitial.textContent = (user.displayName || user.email || 'B').charAt(0).toUpperCase();
    }
    if (dropdownUserEmail) {
      dropdownUserEmail.textContent = user.email || 'Guest';
    }
    if (profileInitialLarge) {
      profileInitialLarge.textContent = (user.displayName || user.email || 'B').charAt(0).toUpperCase();
    }
    
    // Load user profile from Firestore
    await loadUserProfile(user.uid);
    
  } else {
    console.log('User not authenticated, redirecting to login');
    window.location.href = 'index.html';
  }
});

// Load user profile data
async function loadUserProfile(userId) {
  try {
    const userDocRef = window.doc(window.db, 'users', userId);
    const userDoc = await window.getDoc(userDocRef);
    
    if (userDoc.exists()) {
      userProfile = userDoc.data();
      populateProfileForm(userProfile);
      populatePreferences(userProfile);
      populateSecurityInfo(userProfile);
    } else {
      console.log('No profile found, creating default profile');
      userProfile = {
        displayName: currentUser.displayName || '',
        email: currentUser.email || '',
        bio: '',
        favoriteVerse: '',
        avatarColor: '#8B5CF6',
        preferences: {
          dailyReminder: false,
          verseOfDay: false,
          prayerReminders: false,
          topics: []
        },
        createdAt: window.serverTimestamp()
      };
      
      // Save the new profile to Firestore
      await window.setDoc(userDocRef, userProfile);
      console.log('New profile created and saved to Firestore');
      
      // Populate the UI with the new profile
      populateProfileForm(userProfile);
      populatePreferences(userProfile);
      populateSecurityInfo(userProfile);
    }
  } catch (error) {
    console.error('Error loading profile:', error);
    alert('Failed to load profile data');
  }
}

// Populate profile form with user data
function populateProfileForm(profile) {
  const displayName = getEl('displayName');
  const email = getEl('email');
  const bio = getEl('bio');
  const favoriteVerse = getEl('favoriteVerse');
  const profileAvatarLarge = getEl('profileAvatarLarge');
  
  if (displayName) displayName.value = profile.displayName || '';
  if (email) email.value = profile.email || '';
  if (bio) bio.value = profile.bio || '';
  if (favoriteVerse) favoriteVerse.value = profile.favoriteVerse || '';
  
  // Set avatar color
  if (profileAvatarLarge && profile.avatarColor) {
    profileAvatarLarge.style.backgroundColor = profile.avatarColor;
  }
  
  // Also update the header avatar color
  const profileAvatar = getEl('profileAvatar');
  if (profileAvatar && profile.avatarColor) {
    profileAvatar.style.backgroundColor = profile.avatarColor;
  }
}

// Populate preferences
function populatePreferences(profile) {
  const prefs = profile.preferences || {};
  
  const dailyReminder = getEl('dailyReminder');
  const verseOfDay = getEl('verseOfDay');
  const prayerReminders = getEl('prayerReminders');
  
  if (dailyReminder) dailyReminder.checked = prefs.dailyReminder || false;
  if (verseOfDay) verseOfDay.checked = prefs.verseOfDay || false;
  if (prayerReminders) prayerReminders.checked = prefs.prayerReminders || false;
  
  // Set active topics
  const topicTags = document.querySelectorAll('.topic-tag');
  const activeTopics = prefs.topics || [];
  
  topicTags.forEach(tag => {
    const topic = tag.getAttribute('data-topic');
    if (activeTopics.includes(topic)) {
      tag.classList.add('active');
    }
  });
}

// Populate security info
function populateSecurityInfo(profile) {
  const accountStatus = getEl('accountStatus');
  const memberSince = getEl('memberSince');
  const lastLogin = getEl('lastLogin');
  
  if (accountStatus) {
    accountStatus.textContent = currentUser.isAnonymous ? 'Guest Account' : 'Regular Account';
  }
  
  if (memberSince && profile.createdAt) {
    // Handle Firestore Timestamp
    let date;
    if (profile.createdAt.toDate) {
      // Firestore Timestamp
      date = profile.createdAt.toDate();
    } else if (profile.createdAt.seconds) {
      // Firestore Timestamp as object
      date = new Date(profile.createdAt.seconds * 1000);
    } else if (typeof profile.createdAt === 'string') {
      // ISO string
      date = new Date(profile.createdAt);
    } else {
      // Fallback to current date
      date = new Date();
    }
    
    memberSince.textContent = date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  } else if (memberSince) {
    // Fallback if no createdAt found
    memberSince.textContent = 'Not available';
  }
  
  if (lastLogin) {
    lastLogin.textContent = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}

// Tab Navigation
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach(button => {
  button.addEventListener('click', () => {
    const targetTab = button.getAttribute('data-tab');
    
    // Remove active class from all tabs
    tabButtons.forEach(btn => btn.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));
    
    // Add active class to clicked tab
    button.classList.add('active');
    const targetContent = document.getElementById(`${targetTab}Tab`);
    if (targetContent) {
      targetContent.classList.add('active');
    }
  });
});

// Profile Form Submission
const profileForm = getEl('profileForm');
if (profileForm) {
  profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const displayName = getEl('displayName').value.trim();
    const email = getEl('email').value.trim();
    const bio = getEl('bio').value.trim();
    const favoriteVerse = getEl('favoriteVerse').value.trim();
    
    try {
      // Update Firebase Auth profile
      if (displayName !== currentUser.displayName) {
        await window.updateProfile(currentUser, { displayName });
      }
      
      // Update email if changed (requires re-authentication)
      if (email !== currentUser.email) {
        // This would require re-authentication in production
        console.log('Email change requested:', email);
        alert('Email change requires re-authentication. This feature will be available soon.');
      }
      
      // Update Firestore profile
      const userDocRef = window.doc(window.db, 'users', currentUser.uid);
      await window.updateDoc(userDocRef, {
        displayName,
        bio,
        favoriteVerse,
        updatedAt: window.serverTimestamp()
      });
      
      alert('Profile updated successfully!');
      
      // Update UI
      userProfile = { ...userProfile, displayName, bio, favoriteVerse };
      const userInitial = getEl('userInitial');
      const profileInitialLarge = getEl('profileInitialLarge');
      if (userInitial) userInitial.textContent = displayName.charAt(0).toUpperCase();
      if (profileInitialLarge) profileInitialLarge.textContent = displayName.charAt(0).toUpperCase();
      
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    }
  });
}

// Cancel Profile Edit
const cancelProfileBtn = getEl('cancelProfileBtn');
if (cancelProfileBtn) {
  cancelProfileBtn.addEventListener('click', () => {
    if (userProfile) {
      populateProfileForm(userProfile);
    }
  });
}

// Save Preferences
const savePreferencesBtn = getEl('savePreferencesBtn');
if (savePreferencesBtn) {
  savePreferencesBtn.addEventListener('click', async () => {
    const dailyReminder = getEl('dailyReminder').checked;
    const verseOfDay = getEl('verseOfDay').checked;
    const prayerReminders = getEl('prayerReminders').checked;
    
    const activeTopics = [];
    document.querySelectorAll('.topic-tag.active').forEach(tag => {
      activeTopics.push(tag.getAttribute('data-topic'));
    });
    
    try {
      const userDocRef = window.doc(window.db, 'users', currentUser.uid);
      await window.updateDoc(userDocRef, {
        preferences: {
          dailyReminder,
          verseOfDay,
          prayerReminders,
          topics: activeTopics
        },
        updatedAt: window.serverTimestamp()
      });
      
      alert('Preferences saved successfully!');
    } catch (error) {
      console.error('Error saving preferences:', error);
      alert('Failed to save preferences. Please try again.');
    }
  });
}

// Topic Tag Selection
const topicTags = document.querySelectorAll('.topic-tag');
topicTags.forEach(tag => {
  tag.addEventListener('click', () => {
    tag.classList.toggle('active');
  });
});

// Avatar Color Selection
const changeAvatarBtn = getEl('changeAvatarBtn');
const avatarModal = getEl('avatarModal');
const avatarColorBtns = document.querySelectorAll('.avatar-color-btn');

if (changeAvatarBtn) {
  changeAvatarBtn.addEventListener('click', () => {
    if (avatarModal) {
      avatarModal.setAttribute('aria-hidden', 'false');
    }
  });
}

avatarColorBtns.forEach(btn => {
  btn.addEventListener('click', async () => {
    const color = btn.getAttribute('data-color');
    
    // Update UI
    const profileAvatarLarge = getEl('profileAvatarLarge');
    const profileAvatar = getEl('profileAvatar');
    if (profileAvatarLarge) {
      profileAvatarLarge.style.backgroundColor = color;
    }
    if (profileAvatar) {
      profileAvatar.style.backgroundColor = color;
    }
    
    // Save to Firestore
    try {
      const userDocRef = window.doc(window.db, 'users', currentUser.uid);
      await window.updateDoc(userDocRef, {
        avatarColor: color,
        updatedAt: window.serverTimestamp()
      });
      
      if (avatarModal) {
        avatarModal.setAttribute('aria-hidden', 'true');
      }
    } catch (error) {
      console.error('Error updating avatar:', error);
      alert('Failed to update avatar. Please try again.');
    }
  });
});

// Change Password
const changePasswordBtn = getEl('changePasswordBtn');
const passwordModal = getEl('passwordModal');
const passwordForm = getEl('passwordForm');

if (changePasswordBtn) {
  changePasswordBtn.addEventListener('click', () => {
    if (passwordModal) {
      passwordModal.setAttribute('aria-hidden', 'false');
    }
  });
}

if (passwordForm) {
  passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const currentPassword = getEl('currentPassword').value;
    const newPassword = getEl('newPassword').value;
    const confirmNewPassword = getEl('confirmNewPassword').value;
    
    if (newPassword !== confirmNewPassword) {
      alert('New passwords do not match!');
      return;
    }
    
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters long!');
      return;
    }
    
    try {
      // Re-authenticate user
      const credential = window.EmailAuthProvider.credential(
        currentUser.email,
        currentPassword
      );
      await window.reauthenticateWithCredential(currentUser, credential);
      
      // Update password
      await window.updatePassword(currentUser, newPassword);
      
      alert('Password updated successfully!');
      
      if (passwordModal) {
        passwordModal.setAttribute('aria-hidden', 'true');
      }
      
      // Clear form
      passwordForm.reset();
      
    } catch (error) {
      console.error('Error changing password:', error);
      
      if (error.code === 'auth/wrong-password') {
        alert('Current password is incorrect!');
      } else if (error.code === 'auth/weak-password') {
        alert('New password is too weak!');
      } else {
        alert('Failed to change password. Please try again.');
      }
    }
  });
}

// Download Data
const downloadDataBtn = getEl('downloadDataBtn');
if (downloadDataBtn) {
  downloadDataBtn.addEventListener('click', () => {
    const dataToExport = {
      profile: userProfile,
      exportDate: new Date().toISOString(),
      userId: currentUser.uid
    };
    
    const dataStr = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bloombuddy-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    alert('Your data has been downloaded!');
  });
}

// Clear History
const clearHistoryBtn = getEl('clearHistoryBtn');
if (clearHistoryBtn) {
  clearHistoryBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all chat history? This cannot be undone.')) {
      // Clear local storage
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('chatHistory_')) {
          localStorage.removeItem(key);
        }
      });
      
      alert('Chat history cleared successfully!');
    }
  });
}

// Delete Account
const deleteAccountBtn = getEl('deleteAccountBtn');
if (deleteAccountBtn) {
  deleteAccountBtn.addEventListener('click', async () => {
    const confirmed = confirm(
      'Are you ABSOLUTELY sure you want to delete your account? ' +
      'This will permanently delete all your data and cannot be undone. ' +
      'Type "DELETE" in the next prompt to confirm.'
    );
    
    if (confirmed) {
      const confirmation = prompt('Type "DELETE" to confirm account deletion:');
      
      if (confirmation === 'DELETE') {
        try {
          // Delete Firestore data
          const userDocRef = window.doc(window.db, 'users', currentUser.uid);
          await window.deleteDoc(userDocRef);
          
          // Delete user account
          await currentUser.delete();
          
          alert('Your account has been deleted. We\'re sorry to see you go.');
          window.location.href = 'index.html';
          
        } catch (error) {
          console.error('Error deleting account:', error);
          
          if (error.code === 'auth/requires-recent-login') {
            alert('For security, you need to log in again before deleting your account.');
          } else {
            alert('Failed to delete account. Please try again or contact support.');
          }
        }
      }
    }
  });
}

// Modal Management
document.addEventListener('click', (e) => {
  if (e.target.matches('[data-close]') || e.target.classList.contains('modal')) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
      modal.setAttribute('aria-hidden', 'true');
    });
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
      modal.setAttribute('aria-hidden', 'true');
    });
  }
});

// Logout
const logoutBtn = getEl('logoutBtn');
document.addEventListener('click', async (e) => {
  if (e.target.id === 'logoutBtn') {
    e.preventDefault();
    try {
      await window.signOut(window.auth);
      console.log('User signed out successfully');
      window.location.href = 'index.html';
    } catch (error) {
      console.error('Logout error:', error);
      alert('Error signing out. Please try again.');
    }
  }
});

// About Modal
const aboutModal = getEl('aboutModal');
document.addEventListener('click', (e) => {
  if (e.target.id === 'aboutLink' || e.target.textContent === 'About') {
    e.preventDefault();
    if (aboutModal) {
      aboutModal.setAttribute('aria-hidden', 'false');
    }
  }
});

// Profile Dropdown
const profileAvatar = getEl('profileAvatar');
const profileDropdown = getEl('profileDropdown');

if (profileAvatar) {
  profileAvatar.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = profileDropdown.style.display === 'none' || !profileDropdown.style.display;
    profileDropdown.style.display = isHidden ? 'flex' : 'none';
  });
}

window.addEventListener('click', () => {
  if (profileDropdown) {
    profileDropdown.style.display = 'none';
  }
});

console.log('Profile page initialized');