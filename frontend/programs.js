// programs.js — Guided Programs page logic

function getEl(id) { return document.getElementById(id); }

// ========== PROGRAM DATA ==========
const PROGRAMS = [
  {
    id: 'gratitude-7',
    title: '7 Days of Gratitude',
    emoji: '💛',
    theme: 'gratitude',
    description: 'Cultivate a thankful heart through daily gratitude reflections, Bible passages, and intentional awareness of God\'s blessings.',
    days: 7,
    tasks: [
      { title: 'Count Your Blessings', desc: 'List 5 things you\'re grateful for today, no matter how small. Read Psalm 107:1 — "Give thanks to the Lord, for he is good." Reflect on why each blessing matters to you.' },
      { title: 'Thank Someone', desc: 'Send a message or tell someone in person how they\'ve blessed your life. Read 1 Thessalonians 5:18 — "Give thanks in all circumstances." Write about how expressing gratitude made you feel.' },
      { title: 'Grateful for Challenges', desc: 'Think of a recent difficulty and find something to be grateful for within it. Read Romans 5:3-4 — "Suffering produces perseverance." Reflect on how struggles have shaped you.' },
      { title: 'Nature Walk Gratitude', desc: 'Step outside and notice 3 things in nature that fill you with wonder. Read Psalm 19:1 — "The heavens declare the glory of God." Write about what you observed.' },
      { title: 'Gratitude for Your Body', desc: 'Appreciate your body — your hands, your eyes, your ability to breathe. Read Psalm 139:14 — "I am fearfully and wonderfully made." Reflect on the gift of your physical self.' },
      { title: 'Gratitude Letter', desc: 'Write a letter of thanks to God for His presence in your life. Read Colossians 3:15 — "Let the peace of Christ rule in your hearts, and be thankful." Pour out your heart.' },
      { title: 'Gratitude as a Lifestyle', desc: 'Commit to one daily gratitude habit going forward. Read Philippians 4:6 — "With thanksgiving, present your requests to God." Describe your commitment and how this week changed you.' },
    ],
  },
  {
    id: 'peace-7',
    title: '7 Days of Overcoming Anxiety',
    emoji: '🕊️',
    theme: 'anxiety',
    description: 'Learn to release worry and find peace through Scripture, breathing exercises, and surrendering your anxieties to God.',
    days: 7,
    tasks: [
      { title: 'Name Your Worries', desc: 'Write down everything that\'s causing you anxiety right now. Don\'t filter — just release it onto the page. Read Philippians 4:6-7. After writing, pray over each item.' },
      { title: 'Breath Prayer', desc: 'Practice the breath prayer: Inhale "Lord," exhale "give me peace." Do this for 5 minutes. Read Psalm 46:10 — "Be still, and know that I am God." Write about how it felt.' },
      { title: 'Cast Your Cares', desc: 'Visualize placing each worry into God\'s hands. Read 1 Peter 5:7 — "Cast all your anxiety on him because he cares for you." Which worry is hardest to release? Why?' },
      { title: 'Replace Anxious Thoughts', desc: 'For every anxious thought today, replace it with a truth from Scripture. Read 2 Timothy 1:7 — "God has not given us a spirit of fear." Track how many times you caught yourself worrying.' },
      { title: 'Digital Sabbath', desc: 'Take 2 hours away from all screens and news today. Read Matthew 6:34 — "Do not worry about tomorrow." Reflect on how disconnecting affected your peace.' },
      { title: 'Gratitude Over Worry', desc: 'For every worry, write 2 things you\'re grateful for. Read Psalm 94:19 — "When anxiety was great within me, your consolation brought me joy." Notice the shift.' },
      { title: 'Peace Declaration', desc: 'Write a personal peace declaration — a statement of trust you can return to whenever anxiety rises. Read Isaiah 26:3 — "You will keep in perfect peace those whose minds are steadfast." Make this your anchor.' },
    ],
  },
  {
    id: 'prayer-7',
    title: '7 Days of Deeper Prayer',
    emoji: '🙏',
    theme: 'prayer',
    description: 'Deepen your prayer life with different prayer styles each day — from silent contemplation to intercessory prayer for others.',
    days: 7,
    tasks: [
      { title: 'The ACTS Prayer', desc: 'Pray using the ACTS framework: Adoration (praise God), Confession (admit shortcomings), Thanksgiving (express gratitude), Supplication (ask for needs). Read Matthew 6:9-13. Write your ACTS prayer.' },
      { title: 'Listening Prayer', desc: 'Spend 10 minutes in complete silence, listening for God\'s voice. Don\'t speak — just listen. Read 1 Samuel 3:10 — "Speak, Lord, for your servant is listening." Write what came to mind.' },
      { title: 'Prayer Walk', desc: 'Walk for 15 minutes and pray as you go — for your neighborhood, the people you pass, the world. Read 1 Timothy 2:1 — "Pray for everyone." What did you notice differently?' },
      { title: 'Praying Scripture', desc: 'Choose a Psalm and pray it back to God line by line, making it personal. Try Psalm 23 or Psalm 91. Write about how praying Scripture feels different from regular prayer.' },
      { title: 'Intercessory Prayer', desc: 'Pray specifically for 5 people by name today. Read James 5:16 — "The prayer of a righteous person is powerful and effective." Write each name and what you prayed for them.' },
      { title: 'Confession & Forgiveness', desc: 'Honestly confess anything weighing on your heart. Then receive forgiveness. Read 1 John 1:9 — "If we confess our sins, he is faithful and just to forgive us." Write about the freedom you feel.' },
      { title: 'Surrendered Prayer', desc: 'Pray "Your will be done" over every area of your life — relationships, work, health, future. Read Luke 22:42 — "Not my will, but yours be done." Describe what you\'re surrendering.' },
    ],
  },
];

let activeProgram = null; // { programId, startDate, completedDays: [0,1,...], reflections: {} }

// ========== AUTH ==========
window.onAuthStateChanged?.(window.auth, async (user) => {
  if (user) {
    window.currentUserId = user.uid;
    window.currentUserName = user.displayName || 'Anonymous';
    const userInitial = getEl('userInitial');
    const dropdownUserEmail = getEl('dropdownUserEmail');
    if (userInitial) userInitial.textContent = (user.displayName || user.email || 'B').charAt(0).toUpperCase();
    if (dropdownUserEmail) dropdownUserEmail.textContent = user.email || 'Guest';

    await loadActiveProgram();
    renderCatalog();
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
window.addEventListener('click', () => { if (profileDropdown) profileDropdown.style.display = 'none'; });

// Logout
document.addEventListener('click', async (e) => {
  if (e.target.id === 'logoutBtn') {
    e.preventDefault();
    try { await window.signOut(window.auth); window.location.href = 'index.html'; } catch (err) { console.error(err); }
  }
});

// ========== LOAD ACTIVE PROGRAM ==========
async function loadActiveProgram() {
  if (!window.db || !window.currentUserId) return;

  try {
    const docRef = window.doc(window.db, 'users', window.currentUserId, 'programs', 'active');
    const docSnap = await window.getDoc(docRef);

    if (docSnap.exists()) {
      activeProgram = docSnap.data();
      renderActiveProgram();
    }
  } catch (error) {
    console.error('Error loading active program:', error);
  }
}

// ========== RENDER ACTIVE PROGRAM ==========
function renderActiveProgram() {
  if (!activeProgram) {
    getEl('activeProgramSection').style.display = 'none';
    return;
  }

  const program = PROGRAMS.find(p => p.id === activeProgram.programId);
  if (!program) return;

  getEl('activeProgramSection').style.display = 'block';
  getEl('activeProgramTitle').textContent = `${program.emoji} ${program.title}`;

  const completed = activeProgram.completedDays || [];
  const percent = Math.round((completed.length / program.days) * 100);
  getEl('activeProgressFill').style.width = `${percent}%`;
  getEl('activeProgressText').textContent = `${completed.length} of ${program.days} days completed (${percent}%)`;

  // Determine today's day number
  const startDate = activeProgram.startDate?.toDate ? activeProgram.startDate.toDate() : new Date(activeProgram.startDate);
  const daysSinceStart = Math.floor((new Date() - startDate) / (1000 * 60 * 60 * 24));
  const currentDay = Math.min(daysSinceStart, program.days - 1);

  const todayTask = getEl('todayTask');
  const todayCompleted = getEl('todayCompleted');

  if (completed.includes(currentDay)) {
    // Already completed today
    todayTask.style.display = 'none';
    todayCompleted.style.display = 'flex';
    getEl('nextDayNum').textContent = currentDay + 2;

    // If all days completed, show completion message
    if (completed.length >= program.days) {
      todayCompleted.innerHTML = '<span class="completed-check">🎉</span><span>Congratulations! You\'ve completed this program!</span>';
    }
  } else {
    // Show today's task
    todayTask.style.display = 'block';
    todayCompleted.style.display = 'none';

    const task = program.tasks[currentDay] || program.tasks[program.tasks.length - 1];
    getEl('todayDayNum').textContent = currentDay + 1;
    getEl('todayTaskTitle').textContent = task.title;
    getEl('todayTaskDesc').textContent = task.desc;
  }
}

// ========== RENDER CATALOG ==========
function renderCatalog() {
  const grid = getEl('programGrid');
  if (!grid) return;
  grid.innerHTML = '';

  PROGRAMS.forEach(program => {
    const isActive = activeProgram && activeProgram.programId === program.id;
    const card = document.createElement('div');
    card.className = 'program-card';
    card.setAttribute('data-theme', program.theme);

    card.innerHTML = `
      <div class="program-card-emoji">${program.emoji}</div>
      <h3 class="program-card-title">${program.title}</h3>
      <p class="program-card-desc">${program.description}</p>
      <div class="program-card-meta">
        <span class="program-duration">${program.days} days</span>
        ${isActive
          ? '<span class="program-completed-badge">✅ Active</span>'
          : `<button class="program-start-btn" data-program-id="${program.id}">Start Journey</button>`
        }
      </div>
    `;

    grid.appendChild(card);
  });
}

// ========== START PROGRAM ==========
document.addEventListener('click', async (e) => {
  const startBtn = e.target.closest('.program-start-btn');
  if (!startBtn) return;

  const programId = startBtn.getAttribute('data-program-id');
  if (!programId || !window.currentUserId) return;

  if (activeProgram) {
    if (!confirm('You already have an active program. Starting a new one will replace it. Continue?')) return;
  }

  startBtn.disabled = true;
  startBtn.textContent = 'Starting...';

  try {
    const newProgram = {
      programId: programId,
      startDate: window.serverTimestamp(),
      completedDays: [],
      reflections: {},
      enrolledAt: window.serverTimestamp(),
    };

    const docRef = window.doc(window.db, 'users', window.currentUserId, 'programs', 'active');
    await window.setDoc(docRef, newProgram);

    activeProgram = { ...newProgram, startDate: new Date() };
    window.bbAnalytics?.('program_started', { program_id: programId });

    renderActiveProgram();
    renderCatalog();
    window.scrollTo({ top: 0, behavior: 'smooth' });

  } catch (error) {
    console.error('Error starting program:', error);
    alert('Could not start program. Please try again.');
    startBtn.disabled = false;
    startBtn.textContent = 'Start Journey';
  }
});

// ========== COMPLETE TODAY'S TASK ==========
const reflectionInput = getEl('todayReflection');
const completeBtn = getEl('completeTaskBtn');

if (reflectionInput) {
  reflectionInput.addEventListener('input', () => {
    if (completeBtn) completeBtn.disabled = reflectionInput.value.trim().length === 0;
  });
}

if (completeBtn) {
  completeBtn.addEventListener('click', async () => {
    if (!activeProgram || !window.currentUserId) return;

    const reflection = reflectionInput?.value.trim();
    if (!reflection) return;

    completeBtn.disabled = true;
    completeBtn.textContent = 'Saving...';

    try {
      const program = PROGRAMS.find(p => p.id === activeProgram.programId);
      if (!program) return;

      const startDate = activeProgram.startDate?.toDate ? activeProgram.startDate.toDate() : new Date(activeProgram.startDate);
      const daysSinceStart = Math.floor((new Date() - startDate) / (1000 * 60 * 60 * 24));
      const currentDay = Math.min(daysSinceStart, program.days - 1);

      const completedDays = [...(activeProgram.completedDays || [])];
      if (!completedDays.includes(currentDay)) {
        completedDays.push(currentDay);
      }

      const reflections = { ...(activeProgram.reflections || {}) };
      reflections[`day_${currentDay}`] = reflection;

      const docRef = window.doc(window.db, 'users', window.currentUserId, 'programs', 'active');
      await window.updateDoc(docRef, {
        completedDays: completedDays,
        reflections: reflections,
      });

      activeProgram.completedDays = completedDays;
      activeProgram.reflections = reflections;

      window.bbAnalytics?.('program_day_completed', {
        program_id: activeProgram.programId,
        day: currentDay + 1,
        total_days: program.days,
      });

      renderActiveProgram();
      reflectionInput.value = '';

    } catch (error) {
      console.error('Error completing task:', error);
      alert('Could not save. Please try again.');
      completeBtn.disabled = false;
      completeBtn.textContent = 'Complete Today\'s Task';
    }
  });
}

// ========== LEAVE PROGRAM ==========
const leaveBtn = getEl('leaveProgramBtn');
if (leaveBtn) {
  leaveBtn.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to leave this program? Your progress will be lost.')) return;

    try {
      const docRef = window.doc(window.db, 'users', window.currentUserId, 'programs', 'active');
      await window.setDoc(docRef, {});

      window.bbAnalytics?.('program_left', { program_id: activeProgram?.programId });
      activeProgram = null;

      renderActiveProgram();
      renderCatalog();
    } catch (error) {
      console.error('Error leaving program:', error);
    }
  });
}
