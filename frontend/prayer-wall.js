// prayer-wall.js — Prayer Wall page logic

function getEl(id) {
  return document.getElementById(id);
}

const CATEGORY_LABELS = {
  healing: '🩹 Healing',
  guidance: '🧭 Guidance',
  gratitude: '💛 Gratitude',
  strength: '💪 Strength',
  family: '👨‍👩‍👧‍👦 Family',
  other: '✨ Other',
};

let selectedCategory = null;
let activeFilter = 'all';

// ========== AUTH ==========
window.onAuthStateChanged?.(window.auth, async (user) => {
  if (user) {
    window.currentUserId = user.uid;
    window.currentUserName = user.displayName || 'Anonymous';

    const userInitial = getEl('userInitial');
    const dropdownUserEmail = getEl('dropdownUserEmail');
    if (userInitial) userInitial.textContent = (user.displayName || user.email || 'B').charAt(0).toUpperCase();
    if (dropdownUserEmail) dropdownUserEmail.textContent = user.email || 'Guest';

    // Load prayers
    loadPrayers();
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

// ========== FORM TOGGLE ==========
function initFormToggle() {
  const toggle = getEl('prayerFormToggle');
  const body = getEl('prayerFormBody');
  const arrow = getEl('toggleArrow');

  if (toggle && body) {
    toggle.addEventListener('click', () => {
      const isOpen = body.style.display !== 'none';
      body.style.display = isOpen ? 'none' : 'block';
      if (arrow) arrow.classList.toggle('open', !isOpen);
    });
  }
}

// ========== CATEGORY SELECTION ==========
function initCategorySelection() {
  const catBtns = document.querySelectorAll('.cat-btn');
  catBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      catBtns.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedCategory = btn.getAttribute('data-category');
      updateSubmitState();
    });
  });
}

// ========== FILTERS ==========
function initFilters() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.getAttribute('data-category');
      loadPrayers();
    });
  });
}

// ========== TEXT INPUT ==========
function initTextInput() {
  const textarea = getEl('prayerText');
  if (textarea) {
    textarea.addEventListener('input', updateSubmitState);
  }
}

function updateSubmitState() {
  const textarea = getEl('prayerText');
  const submitBtn = getEl('prayerSubmitBtn');
  if (!textarea || !submitBtn) return;

  const hasText = textarea.value.trim().length > 0;
  const hasCat = selectedCategory !== null;
  submitBtn.disabled = !(hasText && hasCat);
}

// ========== SUBMIT PRAYER ==========
async function submitPrayer() {
  const textarea = getEl('prayerText');
  const submitBtn = getEl('prayerSubmitBtn');
  const anonymousCheck = getEl('prayerAnonymous');
  if (!textarea || !submitBtn || !selectedCategory) return;

  const text = textarea.value.trim();
  if (!text) return;

  const isAnonymous = anonymousCheck ? anonymousCheck.checked : true;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Sharing...';

  try {
    await window.addDoc(window.collection(window.db, 'prayers'), {
      text: text,
      category: selectedCategory,
      userId: window.currentUserId,
      authorName: isAnonymous ? 'Anonymous' : window.currentUserName,
      isAnonymous: isAnonymous,
      prayCount: 0,
      prayedBy: [],
      timestamp: window.serverTimestamp(),
    });

    console.log('Prayer submitted');
    window.bbAnalytics?.('prayer_submitted', { category: selectedCategory, anonymous: isAnonymous });

    // Reset form
    textarea.value = '';
    selectedCategory = null;
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('selected'));
    submitBtn.textContent = 'Share Prayer';
    updateSubmitState();

    // Collapse form
    const body = getEl('prayerFormBody');
    const arrow = getEl('toggleArrow');
    if (body) body.style.display = 'none';
    if (arrow) arrow.classList.remove('open');

    // Reload prayers
    loadPrayers();

  } catch (error) {
    console.error('Error submitting prayer:', error);
    alert('Could not share your prayer. Please try again.');
    submitBtn.textContent = 'Share Prayer';
    submitBtn.disabled = false;
  }
}

// ========== LOAD PRAYERS ==========
async function loadPrayers() {
  if (!window.db) return;

  const feed = getEl('prayerFeed');
  const loading = getEl('prayerLoading');
  const empty = getEl('prayerEmpty');
  if (!feed) return;

  if (loading) loading.style.display = 'block';
  if (empty) empty.style.display = 'none';

  try {
    let q;
    if (activeFilter === 'all') {
      q = window.query(
        window.collection(window.db, 'prayers'),
        window.orderBy('timestamp', 'desc'),
        window.limit(50)
      );
    } else {
      q = window.query(
        window.collection(window.db, 'prayers'),
        window.where('category', '==', activeFilter),
        window.orderBy('timestamp', 'desc'),
        window.limit(50)
      );
    }

    const snapshot = await window.getDocs(q);

    if (loading) loading.style.display = 'none';

    if (snapshot.empty) {
      if (empty) empty.style.display = 'block';
      // Clear existing cards but keep loading/empty
      const existingCards = feed.querySelectorAll('.prayer-card');
      existingCards.forEach(c => c.remove());
      return;
    }

    // Clear feed and render cards
    feed.innerHTML = '';

    snapshot.forEach(doc => {
      const data = doc.data();
      const card = createPrayerCard(doc.id, data);
      feed.appendChild(card);
    });

  } catch (error) {
    console.error('Error loading prayers:', error);
    if (loading) loading.textContent = 'Could not load prayers. Please refresh.';
  }
}

// ========== PRAYER CARD ==========
function createPrayerCard(prayerId, data) {
  const card = document.createElement('div');
  card.className = 'prayer-card';
  card.id = `prayer-${prayerId}`;

  const authorInitial = (data.authorName || 'A').charAt(0).toUpperCase();
  const categoryLabel = CATEGORY_LABELS[data.category] || data.category;
  const prayCount = data.prayCount || 0;
  const hasPrayed = data.prayedBy && data.prayedBy.includes(window.currentUserId);

  // Format date
  let dateStr = 'Just now';
  if (data.timestamp) {
    const ts = data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
    dateStr = formatTimeAgo(ts);
  }

  card.innerHTML = `
    <div class="prayer-card-header">
      <div class="prayer-card-author">
        <div class="prayer-author-avatar">${authorInitial}</div>
        <span class="prayer-author-name">${escapeHTML(data.authorName || 'Anonymous')}</span>
      </div>
      <span class="prayer-card-category">${categoryLabel}</span>
    </div>
    <p class="prayer-card-text">${escapeHTML(data.text)}</p>
    <div class="prayer-card-footer">
      <span class="prayer-card-date">${dateStr}</span>
      <button class="pray-btn ${hasPrayed ? 'prayed' : ''}" data-prayer-id="${prayerId}">
        <span class="pray-icon">🙏</span>
        <span>Praying</span>
        <span class="pray-count">${prayCount}</span>
      </button>
    </div>
  `;

  // Pray button handler
  const prayBtn = card.querySelector('.pray-btn');
  prayBtn.addEventListener('click', () => handlePray(prayerId, prayBtn, hasPrayed));

  return card;
}

// ========== PRAY INTERACTION ==========
async function handlePray(prayerId, btn, alreadyPrayed) {
  if (!window.currentUserId || !window.db) return;

  try {
    const prayerRef = window.doc(window.db, 'prayers', prayerId);
    const prayerDoc = await window.getDoc(prayerRef);

    if (!prayerDoc.exists()) return;

    const data = prayerDoc.data();
    let prayedBy = data.prayedBy || [];
    let prayCount = data.prayCount || 0;

    if (prayedBy.includes(window.currentUserId)) {
      // Remove prayer
      prayedBy = prayedBy.filter(id => id !== window.currentUserId);
      prayCount = Math.max(0, prayCount - 1);
      btn.classList.remove('prayed');
    } else {
      // Add prayer
      prayedBy.push(window.currentUserId);
      prayCount += 1;
      btn.classList.add('prayed');
      window.bbAnalytics?.('prayer_prayed', { prayer_id: prayerId });
    }

    // Update UI immediately
    const countEl = btn.querySelector('.pray-count');
    if (countEl) countEl.textContent = prayCount;

    // Save to Firestore
    await window.updateDoc(prayerRef, {
      prayedBy: prayedBy,
      prayCount: prayCount,
    });

  } catch (error) {
    console.error('Error updating prayer:', error);
  }
}

// ========== HELPERS ==========
function formatTimeAgo(date) {
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ========== INIT ==========
function initPrayerWall() {
  initFormToggle();
  initCategorySelection();
  initFilters();
  initTextInput();

  const submitBtn = getEl('prayerSubmitBtn');
  if (submitBtn) {
    submitBtn.addEventListener('click', submitPrayer);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPrayerWall);
} else {
  initPrayerWall();
}
