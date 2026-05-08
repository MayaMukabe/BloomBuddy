// Content Pages JavaScript - Shared between Resources and Podcasts

function getEl(id) { return document.getElementById(id); }

// Firebase Auth State Management
window.onAuthStateChanged?.(window.auth, (user) => {
  if (user) {
    console.log('User is signed in:', user);
    const userEmailEl = getEl('userEmail');
    if (userEmailEl) userEmailEl.textContent = user.email || 'User';
    
    // Update profile dropdown info
    const userInitial = getEl('userInitial');
    const dropdownUserEmail = getEl('dropdownUserEmail');
    if (userInitial) {
      userInitial.textContent = (user.displayName || user.email || 'B').charAt(0).toUpperCase();
    }
    if (dropdownUserEmail) {
      dropdownUserEmail.textContent = user.email || 'Guest';
    }
  } else {
    console.log('User is signed out');
    // Redirect to login if not authenticated
    window.location.href = 'index.html';
  }
});

// PROFILE DROPDOWN MANAGEMENT
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

// LOGOUT FUNCTIONALITY
// Handle user logout

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
// About Modal Management (reused from dashboard)
const aboutModal = getEl('aboutModal');

// Open About modal when About link is clicked
document.addEventListener('click', (e) => {
  if (e.target.id === 'aboutLink' || e.target.textContent === 'About') {
    e.preventDefault();
    openAboutModal();
  }
});

function openAboutModal() {
  console.log('Opening About modal');
  aboutModal.setAttribute('aria-hidden', 'false');
}

// Close About modal
document.addEventListener('click', (e) => {
  if (e.target.matches('[data-close]') || e.target.classList.contains('about-modal')) {
    aboutModal.setAttribute('aria-hidden', 'true');
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    aboutModal.setAttribute('aria-hidden', 'true');
  }
});

// Smooth scrolling for anchor links
document.addEventListener('click', (e) => {
  if (e.target.matches('a[href^="#"]')) {
    e.preventDefault();
    const targetId = e.target.getAttribute('href').substring(1);
    const targetElement = document.getElementById(targetId);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth' });
    }
  }
});

// Add loading states for external links
document.addEventListener('click', (e) => {
  if (e.target.matches('a[target="_blank"]')) {
    // Add a small delay to show the link is being processed
    e.target.style.opacity = '0.7';
    setTimeout(() => {
      e.target.style.opacity = '1';
    }, 200);
  }
});

// Resource and Podcast Data
const resourceData = {
  'purpose-driven': {
    title: 'The Purpose Driven Life',
    author: 'by Rick Warren',
    description: 'A 40-day spiritual journey to discover your purpose and meaning in life. This bestselling book helps you understand God\'s plan for your life and how to live with purpose.',
    details: 'This transformative book takes you on a 40-day spiritual journey to discover the answer to life\'s most important question: "What on earth am I here for?" Rick Warren guides you through five biblical purposes that will give your life meaning and direction.',
    link: 'https://www.amazon.com/Purpose-Driven-Life-What-Earth/dp/031033750X',
    linkText: 'Find on Amazon'
  },
  'jesus-calling': {
    title: 'Jesus Calling',
    author: 'by Sarah Young',
    description: 'Daily devotions written as if Jesus is speaking directly to you. A comforting and inspiring devotional that brings peace and encouragement to your daily life.',
    details: 'Experience a deeper relationship with Jesus as you savor the presence of the One who understands you perfectly and loves you forever. With Scripture and personal reflections, this devotional helps you hear God\'s voice in your daily life.',
    link: 'https://www.amazon.com/Jesus-Calling-Enjoying-Peace-Presence/dp/1591451884',
    linkText: 'Find on Amazon'
  },
  'boundaries': {
    title: 'Boundaries',
    author: 'by Dr. Henry Cloud & Dr. John Townsend',
    description: 'Learn to set healthy boundaries in relationships and life. This book provides practical guidance for establishing limits that protect your emotional and spiritual well-being.',
    details: 'When to say yes, when to say no to take control of your life. This book shows you how to set boundaries with family, friends, and colleagues while maintaining loving relationships.',
    link: 'https://www.amazon.com/Boundaries-Updated-Expanded-When-Control/dp/0310351804',
    linkText: 'Find on Amazon'
  },
  'youversion': {
    title: 'YouVersion Bible App',
    author: 'Free Bible Study App',
    description: 'The world\'s most popular Bible app with over 2,000 Bible versions in 1,600+ languages. Includes reading plans, audio Bibles, and a vibrant community.',
    details: 'Access the Bible anytime, anywhere. Features include daily verse widgets, reading plans designed by pastors and authors, bookmarks, highlights, and the ability to share verses with friends.',
    link: 'https://www.youversion.com/',
    linkText: 'Visit YouVersion'
  },
  'headspace': {
    title: 'Headspace',
    author: 'Meditation & Mindfulness',
    description: 'A guided meditation and mindfulness app that helps reduce stress, improve focus, and sleep better through hundreds of meditation sessions.',
    details: 'Whether you\'re new to meditation or an experienced practitioner, Headspace offers courses and single sessions on everything from stress and anxiety to sleep and focus.',
    link: 'https://www.headspace.com/',
    linkText: 'Visit Headspace'
  },
  'pray': {
    title: 'Pray.com',
    author: 'Prayer & Faith Community',
    description: 'The #1 app for daily prayer, Bible stories, and sleep content. Join millions in building a daily prayer habit with guided prayers and devotionals.',
    details: 'Features daily prayers, bedtime Bible stories, worship music, and a faith-based community. Perfect for starting and ending your day with intention and peace.',
    link: 'https://pray.com/',
    linkText: 'Visit Pray.com'
  },
  'bible-gateway': {
    title: 'Bible Gateway',
    author: 'Online Bible Study',
    description: 'A searchable online Bible in over 200 versions and 70 languages. Read, hear, study, and explore the Bible with powerful tools and resources.',
    details: 'Features include keyword search, passage lookup, reading plans, devotionals, newsletters, and extensive commentaries from trusted Bible scholars.',
    link: 'https://www.biblegateway.com/',
    linkText: 'Visit Bible Gateway'
  },
  'focus-family': {
    title: 'Focus on the Family',
    author: 'Family & Marriage Resources',
    description: 'Providing trusted advice on marriage, parenting, and faith since 1977. Offers articles, broadcasts, counseling referrals, and practical resources.',
    details: 'Focus on the Family helps families thrive through broadcasts, podcasts, articles, and licensed counseling referrals covering marriage, parenting, faith, and social issues.',
    link: 'https://www.focusonthefamily.com/',
    linkText: 'Visit Focus on the Family'
  },
  'psychology-today': {
    title: 'Psychology Today',
    author: 'Mental Health Resources',
    description: 'The world\'s largest mental health resource. Find therapists, psychiatrists, support groups, and trusted information about mental health conditions.',
    details: 'Features a comprehensive therapist directory, articles on mental health topics, and evidence-based insights on relationships, anxiety, depression, and personal growth.',
    link: 'https://www.psychologytoday.com/',
    linkText: 'Visit Psychology Today'
  }
};

const podcastData = {
  'bible-project': {
    title: 'The Bible Project',
    host: 'Tim Mackie & Jon Collins',
    category: 'Biblical Studies',
    description: 'Explore the Bible\'s unified story through animated videos and deep-dive conversations. Tim and Jon walk through biblical themes, word studies, and book overviews.',
    details: 'Each episode makes complex biblical concepts accessible and engaging. Perfect for anyone wanting to understand the Bible\'s big picture and how each book fits together.',
    link: 'https://open.spotify.com/show/65KFEK2OaBglkGE0wUPH8x',
    linkText: 'Listen on Spotify'
  },
  'elevation': {
    title: 'Elevation with Steven Furtick',
    host: 'Steven Furtick',
    category: 'Inspiration',
    description: 'Powerful sermons and teachings from Elevation Church pastor Steven Furtick. Uplifting messages about faith, purpose, and overcoming obstacles.',
    details: 'Pastor Steven Furtick delivers dynamic, practical messages that challenge you to live boldly and trust God in every season of life.',
    link: 'https://open.spotify.com/show/1bMlpjb5hOGwVZJWYPPLPE',
    linkText: 'Listen on Spotify'
  },
  'on-purpose': {
    title: 'On Purpose with Jay Shetty',
    host: 'Jay Shetty',
    category: 'Mindfulness',
    description: 'Former monk Jay Shetty interviews thought leaders, authors, and celebrities about purpose, mindfulness, and living intentionally.',
    details: 'Jay brings ancient wisdom to modern life through conversations about relationships, mental health, career, and personal growth with world-class guests.',
    link: 'https://open.spotify.com/show/5EqqB52m2bsr4k1Ii7sStc',
    linkText: 'Listen on Spotify'
  },
  'anxiety-coaches': {
    title: 'The Anxiety Coaches Podcast',
    host: 'Gina Ryan',
    category: 'Mental Health',
    description: 'Practical strategies for managing anxiety and panic. Gina Ryan shares actionable tools, mindset shifts, and encouragement for anyone struggling with anxiety.',
    details: 'Episodes cover topics like breaking the anxiety cycle, managing panic attacks, building confidence, and developing a calmer mindset through evidence-based approaches.',
    link: 'https://open.spotify.com/show/0xDgYXN5WsBFm3EYNsMGbA',
    linkText: 'Listen on Spotify'
  },
  'happiness-lab': {
    title: 'The Happiness Lab',
    host: 'Dr. Laurie Santos',
    category: 'Psychology',
    description: 'Yale professor Dr. Laurie Santos explores the science of happiness. Based on her record-breaking course, she reveals what really makes us happy.',
    details: 'Using cutting-edge research, Dr. Santos shows how our minds lie to us about what brings happiness, and shares evidence-based strategies for genuine well-being.',
    link: 'https://open.spotify.com/show/3i5TCKhc6GY42pOWkpWveG',
    linkText: 'Listen on Spotify'
  },
  'ten-percent': {
    title: 'Ten Percent Happier',
    host: 'Dan Harris',
    category: 'Meditation',
    description: 'ABC News anchor Dan Harris talks with meditation teachers, neuroscientists, and wise people about how to be happier without being annoying about it.',
    details: 'A practical, skeptic-friendly approach to meditation and mindfulness. Dan makes the case that meditation can make you 10% happier — and that\'s a meaningful improvement.',
    link: 'https://open.spotify.com/show/1CfW319UkBMVhQRe0yJ7Xl',
    linkText: 'Listen on Spotify'
  },
  'passion-city': {
    title: 'Passion City Church',
    host: 'Louie Giglio',
    category: 'Worship',
    description: 'Sermons from Passion City Church with pastor Louie Giglio. Messages about worship, purpose, and the greatness of God.',
    details: 'Louie Giglio is known for his powerful teaching that connects the wonder of the universe with the God who created it. Each message inspires worship and awe.',
    link: 'https://open.spotify.com/show/5x9P7FLBkTj0gPkICRJbaQ',
    linkText: 'Listen on Spotify'
  },
  'rzim': {
    title: 'RZIM: Let My People Think',
    host: 'RZIM Team',
    category: 'Apologetics',
    description: 'Thoughtful exploration of life\'s deepest questions through the lens of Christian apologetics. Engaging discussions on faith, culture, and meaning.',
    details: 'This podcast tackles tough questions about God, suffering, truth, and meaning with intellectual rigor and pastoral sensitivity.',
    link: 'https://open.spotify.com/show/3MfYJGlEYP4brR5pdkiRQa',
    linkText: 'Listen on Spotify'
  },
  'hillsong': {
    title: 'Hillsong Church',
    host: 'Hillsong Team',
    category: 'Worship',
    description: 'Messages and worship from Hillsong Church. Inspiring teachings about faith, community, and living a Christ-centered life.',
    details: 'Hillsong Church brings contemporary worship and biblical teaching that has inspired millions worldwide. Each episode offers practical faith for everyday life.',
    link: 'https://open.spotify.com/show/2uB1KXDP9PdjGAqCTzP7Og',
    linkText: 'Listen on Spotify'
  }
};

// Modal Management
const resourceModal = getEl('resourceModal');
const podcastModal = getEl('podcastModal');

// Resource Button Handlers
document.addEventListener('click', (e) => {
  if (e.target.closest('.resource-btn')) {
    const btn = e.target.closest('.resource-btn');
    const resourceId = btn.getAttribute('data-resource');
    openResourceModal(resourceId);
  }
});

function openResourceModal(resourceId) {
  const resource = resourceData[resourceId];
  if (!resource) return;
  
  getEl('resourceModalTitle').textContent = resource.title;
  getEl('resourceModalContent').innerHTML = `
    <div class="modal-content-item">
      <h4>About</h4>
      <p>${resource.description}</p>
    </div>
    <div class="modal-content-item">
      <h4>Details</h4>
      <p>${resource.details}</p>
    </div>
    <div class="modal-content-item">
      <h4>Author</h4>
      <p>${resource.author}</p>
    </div>
    <a href="${resource.link}" class="modal-link" target="_blank">${resource.linkText}</a>
  `;
  
  resourceModal.setAttribute('aria-hidden', 'false');
  window.bbAnalytics?.('resource_viewed', { resource_id: resourceId, title: resource.title });
}

// Podcast Button Handlers
document.addEventListener('click', (e) => {
  if (e.target.closest('.podcast-btn')) {
    const btn = e.target.closest('.podcast-btn');
    const podcastId = btn.getAttribute('data-podcast');
    openPodcastModal(podcastId);
  }
});

function openPodcastModal(podcastId) {
  const podcast = podcastData[podcastId];
  if (!podcast || !podcastModal) return;
  
  getEl('podcastModalTitle').textContent = podcast.title;
  getEl('podcastModalContent').innerHTML = `
    <div class="modal-content-item">
      <h4>About</h4>
      <p>${podcast.description}</p>
    </div>
    <div class="modal-content-item">
      <h4>Details</h4>
      <p>${podcast.details}</p>
    </div>
    <div class="modal-content-item">
      <h4>Host</h4>
      <p>${podcast.host}</p>
    </div>
    <div class="modal-content-item">
      <h4>Category</h4>
      <p>${podcast.category}</p>
    </div>
    <a href="${podcast.link}" class="modal-link" target="_blank">${podcast.linkText}</a>
  `;
  
  podcastModal.setAttribute('aria-hidden', 'false');
  window.bbAnalytics?.('podcast_viewed', { podcast_id: podcastId, title: podcast.title });
}

// Close modals
document.addEventListener('click', (e) => {
  if (e.target.matches('[data-close]') || e.target.classList.contains('resource-modal') || e.target.classList.contains('podcast-modal')) {
    resourceModal.setAttribute('aria-hidden', 'true');
    podcastModal.setAttribute('aria-hidden', 'true');
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    resourceModal.setAttribute('aria-hidden', 'true');
    podcastModal.setAttribute('aria-hidden', 'true');
  }
});

// Add click tracking for analytics (placeholder for future implementation)
function trackClick(category, action, label) {
  console.log(`Analytics: ${category} - ${action} - ${label}`);
  // Future: Implement Google Analytics or other tracking
}

// Track resource/podcast clicks
document.addEventListener('click', (e) => {
  if (e.target.matches('.resource-link, .podcast-link')) {
    const item = e.target.closest('.resource-item, .podcast-item');
    const title = item?.querySelector('h3')?.textContent || 'Unknown';
    trackClick('Content', 'Link Click', title);
  }
});

// Add search functionality (placeholder for future implementation)
function initializeSearch() {
  // Future: Add search functionality for resources and podcasts
  console.log('Search functionality ready for implementation');
}

// Initialize page-specific features
document.addEventListener('DOMContentLoaded', () => {
  initializeSearch();
  
  // Add page-specific initialization
  const currentPage = window.location.pathname.split('/').pop();
  
  if (currentPage === 'resources.html') {
    console.log('Resources page loaded');
    // Add any resources-specific initialization here
  } else if (currentPage === 'podcasts.html') {
    console.log('Podcasts page loaded');
    // Add any podcasts-specific initialization here
  }
});

// Add keyboard navigation support
document.addEventListener('keydown', (e) => {
  // Allow Enter key to activate links when focused
  if (e.key === 'Enter' && e.target.matches('a')) {
    e.target.click();
  }
});

// Add accessibility improvements
document.addEventListener('DOMContentLoaded', () => {
  // Add ARIA labels to external links
  const externalLinks = document.querySelectorAll('a[target="_blank"]');
  externalLinks.forEach(link => {
    if (!link.getAttribute('aria-label')) {
      link.setAttribute('aria-label', `${link.textContent} (opens in new tab)`);
    }
  });
  
  // Add focus indicators for keyboard navigation
  const focusableElements = document.querySelectorAll('a, button, input');
  focusableElements.forEach(element => {
    element.addEventListener('focus', () => {
      element.style.outline = '2px solid #82d9f8';
    });
    
    element.addEventListener('blur', () => {
      element.style.outline = 'none';
    });
  });
});


// Mobile Menu Handler
function initializeMobileMenu() {
  if (document.querySelector('.mobile-menu-btn')) return;
  
  const userMenu = document.querySelector('.user-menu');
  if (!userMenu) return;

  // Hide desktop user menu on mobile
  const mediaQuery = window.matchMedia('(max-width: 768px)');
  
  function handleMobileView(e) {
    if (e.matches) {
      userMenu.style.display = 'none';
      if (!document.querySelector('.mobile-menu-btn')) {
        createMobileMenu();
      }
    } else {
      userMenu.style.display = 'flex';
      const mobileBtn = document.querySelector('.mobile-menu-btn');
      if (mobileBtn) mobileBtn.remove();
    }
  }

  function createMobileMenu() {
    const header = document.querySelector('header');
    if (!header) return;

    const mobileMenuBtn = document.createElement('button');
    mobileMenuBtn.className = 'mobile-menu-btn';
    mobileMenuBtn.setAttribute('aria-label', 'Open navigation menu');
    mobileMenuBtn.innerHTML = '☰';

    // Insert where the user menu was
    header.appendChild(mobileMenuBtn);

    const mobileNavOverlay = document.createElement('div');
    mobileNavOverlay.className = 'mobile-nav-overlay';
    mobileNavOverlay.setAttribute('aria-hidden', 'true');
    
    const desktopNav = document.querySelector('.desktop-nav');
    const navLinks = desktopNav ? Array.from(desktopNav.querySelectorAll('a')) : [];
    
    let navLinksHTML = '';
    navLinks.forEach(link => {
      navLinksHTML += `<a href="${link.href}">${link.textContent}</a>`;
    });

    // Get user info
    const userEmail = document.getElementById('dropdownUserEmail')?.textContent || 'Guest';
    const userInitial = document.getElementById('userInitial')?.textContent || 'B';

    mobileNavOverlay.innerHTML = `
      <div class="mobile-nav-content">
        <div class="mobile-nav-header">
          <div class="logo">
            <div class="logo-text" style="font-size: 32px;">BB</div>
            <span class="brand-name" style="font-size: 14px;">BloomBuddy</span>
          </div>
          <button class="mobile-nav-close" aria-label="Close navigation menu">&times;</button>
        </div>
        <div class="mobile-nav-links">
          ${navLinksHTML}
        </div>
        <div class="mobile-nav-footer">
          <div class="mobile-user-info">
            <div class="mobile-user-avatar">${userInitial}</div>
            <div class="mobile-user-email">${userEmail}</div>
          </div>
          <button class="mobile-logout-btn" id="mobileLogoutBtn">
            <svg class="dropdown-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm7.707 3.293a1 1 0 010 1.414L9.414 9H17a1 1 0 110 2H9.414l1.293 1.293a1 1 0 01-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
            Logout
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(mobileNavOverlay);

    mobileMenuBtn.addEventListener('click', () => {
      mobileNavOverlay.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    });

    const closeBtn = mobileNavOverlay.querySelector('.mobile-nav-close');
    closeBtn.addEventListener('click', closeMobileMenu);

    mobileNavOverlay.addEventListener('click', (e) => {
      if (e.target === mobileNavOverlay) {
        closeMobileMenu();
      }
    });

    const mobileLinks = mobileNavOverlay.querySelectorAll('.mobile-nav-links a');
    mobileLinks.forEach(link => {
      link.addEventListener('click', () => {
        closeMobileMenu();
      });
    });

    // Mobile logout handler
    const mobileLogoutBtn = mobileNavOverlay.querySelector('#mobileLogoutBtn');
    if (mobileLogoutBtn) {
      mobileLogoutBtn.addEventListener('click', async () => {
        try {
          await window.signOut(window.auth);
          console.log('User signed out successfully');
          window.location.href = 'index.html';
        } catch (error) {
          console.error('Logout error:', error);
          alert('Error signing out. Please try again.');
        }
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileNavOverlay.getAttribute('aria-hidden') === 'false') {
        closeMobileMenu();
      }
    });

    function closeMobileMenu() {
      mobileNavOverlay.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
  }

  mediaQuery.addListener(handleMobileView);
  handleMobileView(mediaQuery);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeMobileMenu);
} else {
  initializeMobileMenu();
}

setTimeout(initializeMobileMenu, 100);