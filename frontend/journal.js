// journal.js — Journal page logic

const API_BASE_URL = (() => {
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3001';
  }
  return 'https://bloombuddy-backend.onrender.com';
})();

function getEl(id) {
  return document.getElementById(id);
}

const MOOD_ICONS = {
  great: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>`,
  good:  `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 15c2 1 6 1 8 0"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>`,
  okay:  `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="8" y1="15" x2="16" y2="15"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>`,
  low:   `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 15c2-1 6-1 8 0"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>`,
  rough: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>`,
};

let selectedMood = null;

// ========== AUTH ==========
window.onAuthStateChanged?.(window.auth, async (user) => {
  if (user) {
    window.currentUserId = user.uid;

    const userInitial = getEl('userInitial');
    const dropdownUserEmail = getEl('dropdownUserEmail');
    if (userInitial) userInitial.textContent = (user.displayName || user.email || 'B').charAt(0).toUpperCase();
    if (dropdownUserEmail) dropdownUserEmail.textContent = user.email || 'Guest';

    // Load past entries
    loadJournalEntries();
  } else {
    window.location.href = 'index.html';
  }
});

// ========== PROFILE DROPDOWN ==========
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
  if (profileDropdown) profileDropdown.style.display = 'none';
});

// ========== LOGOUT ==========
document.addEventListener('click', async (e) => {
  if (e.target.id === 'logoutBtn') {
    e.preventDefault();
    try {
      await window.signOut(window.auth);
      window.location.href = 'index.html';
    } catch (error) {
      console.error('Logout error:', error);
    }
  }
});

// ========== MOOD SELECTION ==========
function initMoodSelection() {
  const moodBtns = document.querySelectorAll('.journal-mood-btn');
  moodBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove selected from all
      moodBtns.forEach(b => b.classList.remove('selected'));
      // Add to clicked
      btn.classList.add('selected');
      selectedMood = btn.getAttribute('data-mood');
      updateSubmitState();
    });
  });
}

// ========== TEXTAREA ==========
function initTextarea() {
  const textarea = getEl('journalText');
  if (textarea) {
    textarea.addEventListener('input', updateSubmitState);
  }
}

function updateSubmitState() {
  const textarea = getEl('journalText');
  const submitBtn = getEl('journalSubmitBtn');
  if (!textarea || !submitBtn) return;

  const hasText = textarea.value.trim().length > 0;
  const hasMood = selectedMood !== null;
  submitBtn.disabled = !(hasText && hasMood);
}

// ========== SUBMIT ENTRY ==========
async function submitJournalEntry() {
  const textarea = getEl('journalText');
  const submitBtn = getEl('journalSubmitBtn');
  const submitText = getEl('journalSubmitText');
  if (!textarea || !submitBtn || !selectedMood) return;

  const text = textarea.value.trim();
  if (!text) return;

  // Disable and show loading
  submitBtn.disabled = true;
  if (submitText) submitText.textContent = 'Saving...';

  const todayKey = new Date().toISOString().split('T')[0];

  try {
    // Save to Firestore
    const entryRef = window.doc(window.db, 'users', window.currentUserId, 'journal', todayKey);
    await window.setDoc(entryRef, {
      mood: selectedMood,
      text: text,
      timestamp: window.serverTimestamp(),
    });

    console.log('Journal entry saved');
    window.bbAnalytics?.('journal_entry_created', { mood: selectedMood });

    // Show reflection section
    const reflectionSection = getEl('journalReflection');
    const reflectionLoading = getEl('reflectionLoading');
    const reflectionText = getEl('reflectionText');

    if (reflectionSection) reflectionSection.style.display = 'block';
    if (reflectionLoading) reflectionLoading.style.display = 'flex';
    if (reflectionText) reflectionText.style.display = 'none';

    // Get AI reflection
    const reflection = await getAIReflection(text, selectedMood);

    if (reflectionLoading) reflectionLoading.style.display = 'none';
    if (reflectionText) {
      reflectionText.textContent = reflection;
      reflectionText.style.display = 'block';
    }

    // Save reflection to Firestore
    await window.setDoc(entryRef, { reflection: reflection }, { merge: true });

    // Reset form
    textarea.value = '';
    selectedMood = null;
    document.querySelectorAll('.journal-mood-btn').forEach(b => b.classList.remove('selected'));
    if (submitText) submitText.textContent = 'Save & Get Reflection';

    // Reload entries
    loadJournalEntries();

  } catch (error) {
    console.error('Error saving journal entry:', error);
    alert('Could not save your entry. Please try again.');
    if (submitText) submitText.textContent = 'Save & Get Reflection';
    submitBtn.disabled = false;
  }
}

// ========== AI REFLECTION ==========
async function getAIReflection(journalText, mood) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: `[Journal Entry — Mood: ${mood}]\n\n${journalText}` }
        ],
        topic: 'journal',
        userId: window.currentUserId || 'anonymous',
      }),
    });

    if (!response.ok) throw new Error('API error');

    const data = await response.json();
    return data.message || 'Thank you for sharing. Keep writing — it heals the soul.';
  } catch (error) {
    console.error('Reflection error:', error);
    return 'Thank you for sharing your heart today. "The Lord is close to the brokenhearted and saves those who are crushed in spirit." — Psalm 34:18';
  }
}

// ========== LOAD PAST ENTRIES ==========
async function loadJournalEntries() {
  if (!window.currentUserId || !window.db) return;

  const timelineList = getEl('timelineList');
  const timelineLoading = getEl('timelineLoading');
  const timelineEmpty = getEl('timelineEmpty');
  if (!timelineList) return;

  if (timelineLoading) timelineLoading.style.display = 'block';
  if (timelineEmpty) timelineEmpty.style.display = 'none';

  try {
    // Fetch last 30 days of entries
    const entries = [];
    const today = new Date();

    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];

      const entryRef = window.doc(window.db, 'users', window.currentUserId, 'journal', key);
      const entryDoc = await window.getDoc(entryRef);

      if (entryDoc.exists()) {
        entries.push({ date: key, ...entryDoc.data() });
      }
    }

    if (timelineLoading) timelineLoading.style.display = 'none';

    if (entries.length === 0) {
      if (timelineEmpty) timelineEmpty.style.display = 'block';
      return;
    }

    // Render entries (remove loading/empty first)
    timelineList.innerHTML = '';

    entries.forEach(entry => {
      const card = document.createElement('div');
      card.className = 'timeline-entry';

      const dateFormatted = new Date(entry.date + 'T12:00:00').toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });

      const reflectionHTML = entry.reflection ? `
          <div class="timeline-entry-reflection">
            <div class="timeline-reflection-label">BloomBuddy's Reflection</div>
            <p class="timeline-reflection-text">${escapeHTML(entry.reflection)}</p>
          </div>
        ` : '';

      const moodIcon = MOOD_ICONS[entry.mood] || MOOD_ICONS.okay;

      card.innerHTML = `
        <div class="timeline-entry-header">
          <span class="timeline-entry-date">${dateFormatted}</span>
          <span class="timeline-entry-mood-icon" title="${entry.mood || 'okay'}">${moodIcon}</span>
        </div>
        <p class="timeline-entry-text">${escapeHTML(entry.text)}</p>
        ${reflectionHTML}
      `;

      timelineList.appendChild(card);
    });

  } catch (error) {
    console.error('Error loading journal entries:', error);
    if (timelineLoading) timelineLoading.textContent = 'Could not load entries. Please refresh.';
  }
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ========== INIT ==========
function initJournal() {
  initMoodSelection();
  initTextarea();

  const submitBtn = getEl('journalSubmitBtn');
  if (submitBtn) {
    submitBtn.addEventListener('click', submitJournalEntry);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initJournal);
} else {
  initJournal();
}
