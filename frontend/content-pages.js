// Content Pages JavaScript - Shared between Resources and Podcasts

function getEl(id) { return document.getElementById(id); }

// Firebase Auth State Management
window.onAuthStateChanged?.(window.auth, (user) => {
  if (user) {
    console.log('User is signed in:', user);
    getEl('userEmail').textContent = user.email || 'User';
  } else {
    console.log('User is signed out');
    // Redirect to login if not authenticated
    window.location.href = 'index.html';
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
    link: '#',
    linkText: 'Find on Amazon'
  },
  'jesus-calling': {
    title: 'Jesus Calling',
    author: 'by Sarah Young',
    description: 'Daily devotions written as if Jesus is speaking directly to you. A comforting and inspiring devotional that brings peace and encouragement to your daily life.',
    details: 'Experience a deeper relationship with Jesus as you savor the presence of the One who understands you perfectly and loves you forever. With Scripture and personal reflections, this devotional helps you hear God\'s voice in your daily life.',
    link: '#',
    linkText: 'Find on Amazon'
  },
  'boundaries': {
    title: 'Boundaries',
    author: 'by Dr. Henry Cloud & Dr. John Townsend',
    description: 'Learn to set healthy boundaries in relationships and life. This book provides practical guidance for establishing limits that protect your emotional and spiritual well-being.',
    details: 'When to say yes, when to say no to take control of your life. This book shows you how to set boundaries with family, friends, and colleagues while maintaining loving relationships.',
    link: '#',
    linkText: 'Find on Amazon'
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