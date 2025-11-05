

function getEl(id) { return document.getElementById(id); }

// Modal Elements
const loginModal = getEl('loginModal');
const signupModal = getEl('signupModal');
const forgotPasswordModal = getEl('forgotPasswordModal');

// Main Page Buttons
const openLoginBtn = getEl('openLogin');
const openSignupBtn = getEl('openSignup');
const continueGuestBtn = getEl('continueGuest');

// Modal Switching Buttons
const switchToSignupBtn = getEl('switchToSignup');
const switchToLoginBtn = getEl('switchToLogin');
const forgotPasswordLinkBtn = getEl('forgotPasswordLink');
const backToLoginBtn = getEl('backToLogin');

// Forms
const loginForm = getEl('loginForm');
const signupForm = getEl('signupForm');
const forgotPasswordForm = getEl('forgotPasswordForm');


// Modal Management
function openModal(modal) {
  if (!modal) return;
  // Close all other modals first
  closeModal(loginModal);
  closeModal(signupModal);
  closeModal(forgotPasswordModal);
  
  // Clear errors from all forms
  if (loginForm) window.authErrorHandler.clearInlineErrors(loginForm);
  if (signupForm) window.authErrorHandler.clearInlineErrors(signupForm);
  if (forgotPasswordForm) window.authErrorHandler.clearInlineErrors(forgotPasswordForm);
  
  // Open the target modal
  modal.setAttribute('aria-hidden', 'false');
  const firstInput = modal.querySelector('input');
  if (firstInput) firstInput.focus();

  // Reset forgot password modal to initial state
  if (modal === forgotPasswordModal) {
    getEl('forgotPasswordInitial').style.display = 'block';
    getEl('forgotPasswordSuccess').style.display = 'none';
    forgotPasswordForm.reset();
    window.authErrorHandler.clearInlineErrors(forgotPasswordForm);
  }
}

function closeModal(modal) {
  if (!modal) return;
  modal.setAttribute('aria-hidden', 'true');
}

// --- Event Listeners for Modal Navigation ---

// Main page buttons
openLoginBtn?.addEventListener('click', () => openModal(loginModal));
openSignupBtn?.addEventListener('click', () => openModal(signupModal));

// Modal close buttons
document.addEventListener('click', (e) => {
  const target = e.target;
  if (!(target instanceof Element)) return;

  if (target.matches('[data-close]')) {
    const modal = target.closest('.modal');
    if (modal) closeModal(modal);
  }

  if (target.classList.contains('modal')) {
    closeModal(target);
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal(loginModal);
    closeModal(signupModal);
    closeModal(forgotPasswordModal);
  }
});

// Modal switching links
switchToSignupBtn?.addEventListener('click', () => openModal(signupModal));
switchToLoginBtn?.addEventListener('click', () => openModal(loginModal));
forgotPasswordLinkBtn?.addEventListener('click', () => openModal(forgotPasswordModal));
backToLoginBtn?.addEventListener('click', () => openModal(loginModal));

// --- Real-time Error Clearing on Input ---
// Clear errors when user starts typing in any auth form field
function setupInputErrorClearing(form) {
  if (!form) return;
  
  const inputs = form.querySelectorAll('input');
  inputs.forEach(input => {
    // Clear error for this specific field when user types
    input.addEventListener('input', () => {
      const formGroup = input.closest('.form-group');
      if (formGroup && formGroup.classList.contains('error')) {
        formGroup.classList.remove('error');
        const errorMessage = formGroup.querySelector('.error-message');
        if (errorMessage) {
          errorMessage.textContent = '';
        }
        input.removeAttribute('aria-invalid');
        input.removeAttribute('aria-describedby');
      }
    });
    
    // Also clear on focus
    input.addEventListener('focus', () => {
      const formGroup = input.closest('.form-group');
      if (formGroup && formGroup.classList.contains('error')) {
        formGroup.classList.remove('error');
        const errorMessage = formGroup.querySelector('.error-message');
        if (errorMessage) {
          errorMessage.textContent = '';
        }
        input.removeAttribute('aria-invalid');
        input.removeAttribute('aria-describedby');
      }
    });
  });
}

// Setup error clearing for all auth forms
if (loginForm) setupInputErrorClearing(loginForm);
if (signupForm) setupInputErrorClearing(signupForm);
if (forgotPasswordForm) setupInputErrorClearing(forgotPasswordForm);

// --- Firebase Authentication Handlers ---

// Handle Login
loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  window.authErrorHandler.clearInlineErrors(loginForm); // Clear previous errors
  
  const emailInput = getEl('loginEmail');
  const passwordInput = getEl('loginPassword');
  const submitBtn = loginForm.querySelector('button[type="submit"]');
  
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  // Validate input
  const validationError = window.authErrorHandler.validateAuthInput({ 
    email, 
    password
  }, loginForm);
  if (validationError) {
    window.authErrorHandler.handle(validationError, null, loginForm);
    return;
  }

  LoadingManager.show(submitBtn, 'Signing in...');

  try {
    const userCredential = await window.signInWithEmailAndPassword(window.auth, email, password);
    const user = userCredential.user;
    
    console.log('User logged in:', user.uid);
    ToastNotification.success('You\'ve successfully signed in!', 'Welcome Back');
    closeModal(loginModal);
    
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 500);
    
  } catch (error) {
    console.error('Login error:', error.code);
    window.authErrorHandler.handle(error, () => {
      if (error.code === 'auth/wrong-password') {
        openModal(forgotPasswordModal);
      } else if (error.code === 'auth/user-not-found') {
        openModal(signupModal);
      }
    }, loginForm); // Pass form for inline errors
  } finally {
    LoadingManager.hide(submitBtn);
  }
});

// Handle Signup
signupForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  window.authErrorHandler.clearInlineErrors(signupForm); // Clear previous errors
  
  const nameInput = getEl('signupName');
  const emailInput = getEl('signupEmail');
  const passwordInput = getEl('signupPassword');
  const confirmInput = getEl('signupConfirm');
  const submitBtn = signupForm.querySelector('button[type="submit"]');

  const name = nameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const confirmPassword = confirmInput.value;

  // Validate input
  const validationError = window.authErrorHandler.validateAuthInput({ 
    email, 
    password, 
    confirmPassword, 
    name
  }, signupForm);
  
  if (validationError) {
    window.authErrorHandler.handle(validationError, null, signupForm);
    return;
  }

  LoadingManager.show(submitBtn, 'Creating account...');

  try {
    const userCredential = await window.createUserWithEmailAndPassword(window.auth, email, password);
    const user = userCredential.user;
    
    const userDocRef = window.doc(window.db, 'users', user.uid);
    await window.setDoc(userDocRef, {
      displayName: name,
      email: user.email,
      createdAt: window.serverTimestamp(),
    });
    
    console.log('User created:', user.uid);
    ToastNotification.success(
      `Welcome to BloomBuddy, ${name}! Your account has been created.`,
      'Account Created'
    );
    closeModal(signupModal);
    
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 1000);
    
  } catch (error) {
    console.error('Signup error:', error.code);
    window.authErrorHandler.handle(error, () => {
      if (error.code === 'auth/email-already-in-use') {
        openModal(loginModal);
      }
    }, signupForm); // Pass form for inline errors
  } finally {
    LoadingManager.hide(submitBtn);
  }
});

// Handle Forgot Password
forgotPasswordForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  window.authErrorHandler.clearInlineErrors(forgotPasswordForm);

  const emailInput = getEl('resetEmail');
  const email = emailInput.value.trim();
  const submitBtn = forgotPasswordForm.querySelector('button[type="submit"]');

  const validationError = window.authErrorHandler.validateAuthInput({ 
    email
  }, forgotPasswordForm);
  if (validationError) {
    window.authErrorHandler.handle(validationError, null, forgotPasswordForm);
    return;
  }

  LoadingManager.show(submitBtn, 'Sending link...');

  try {
    await window.sendPasswordResetEmail(window.auth, email);
    
    // Show success message INSIDE the modal
    getEl('resetEmailSuccess').textContent = email;
    getEl('forgotPasswordInitial').style.display = 'none';
    getEl('forgotPasswordSuccess').style.display = 'block';

  } catch (error) {
    console.error('Forgot Password error:', error.code);
    window.authErrorHandler.handle(error, null, forgotPasswordForm);
  } finally {
    LoadingManager.hide(submitBtn);
  }
});


// Google Sign-In (Now attached to all Google buttons)
async function signInWithGoogle(e) {
  const provider = new window.GoogleAuthProvider();
  const googleBtn = e.currentTarget;
  
  LoadingManager.show(googleBtn, 'Opening...');

  try {
    const result = await window.signInWithPopup(window.auth, provider);
    const user = result.user;
    const additionalUserInfo = window.getAdditionalUserInfo(result);

    if (additionalUserInfo.isNewUser) {
      const userDocRef = window.doc(window.db, 'users', user.uid);
      await window.setDoc(userDocRef, {
        displayName: user.displayName,
        email: user.email,
        createdAt: window.serverTimestamp(),
      });
      console.log('New user profile created:', user.uid);
      
      ToastNotification.success(
        `Welcome to BloomBuddy, ${user.displayName}!`,
        'Account Created'
      );
    } else {
      ToastNotification.success('Successfully signed in!', 'Welcome Back');
    }

    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 500);
    
  } catch (error) {
    console.error('Google Sign-In Error:', error.code);
    window.authErrorHandler.handle(error);
  } finally {
    // Restore Google button HTML
    const originalHTML = '<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google logo"/> Sign in with Google';
    googleBtn.innerHTML = originalHTML; // Use innerHTML to restore image
    LoadingManager.hide(googleBtn);
    // Re-set the innerHTML as LoadingManager.hide() might overwrite it
    googleBtn.innerHTML = originalHTML;
    if (googleBtn.closest('#signupModal')) {
      googleBtn.innerHTML = googleBtn.innerHTML.replace('Sign in', 'Sign up');
    }
  }
}

// Attach to all Google sign-in buttons
document.querySelectorAll('.google-signin-btn').forEach(btn => {
  btn.addEventListener('click', signInWithGoogle);
});


// Guest Sign-In
continueGuestBtn?.addEventListener('click', async () => {
  LoadingManager.show(continueGuestBtn, 'Entering as guest...');
  
  try {
    await window.signInAnonymously(window.auth);
    
    ToastNotification.info(
      'You\'re using guest mode. Sign up to save your progress!',
      'Guest Mode'
    );
    
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 500);
    
  } catch (error) {
    console.error('Anonymous sign-in failed:', error.code);
    window.authErrorHandler.handle(error);
    LoadingManager.hide(continueGuestBtn);
  }
});

// Monitor Authentication State
window.onAuthStateChanged?.(window.auth, (user) => {
  if (user) {
    console.log('User authenticated:', user.uid);
    
    const userInitial = getEl('userInitial');
    const dropdownUserEmail = getEl('dropdownUserEmail');
    
    if (userInitial) {
      userInitial.textContent = (user.displayName || user.email || 'B').charAt(0).toUpperCase();
    }
    if (dropdownUserEmail) {
      dropdownUserEmail.textContent = user.email || 'Guest';
    }
  } else {
    console.log('User signed out');
  }
});

// Logout Functionality
document.addEventListener('click', async (e) => {
  if (e.target.id === 'logoutBtn') {
    e.preventDefault();
    
    try {
      await window.signOut(window.auth);
      console.log('User signed out successfully');
      
      ToastNotification.success('You\'ve been signed out successfully.', 'Signed Out');
      
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 500);
      
    } catch (error) {
      console.error('Logout error:', error.code);
      window.authErrorHandler.handle(error);
    }
  }
});

// Profile Dropdown Management
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

function initializeMobileMenu() {
  if (document.querySelector('.mobile-menu-btn')) return;
  
  const userMenu = document.querySelector('.user-menu');
  if (!userMenu) return;

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

    const mobileLogoutBtn = mobileNavOverlay.querySelector('#mobileLogoutBtn');
    if (mobileLogoutBtn) {
      mobileLogoutBtn.addEventListener('click', async () => {
        try {
          await window.signOut(window.auth);
          console.log('User signed out successfully');
          
          ToastNotification.success('You\'ve been signed out.', 'Signed Out');
          
          setTimeout(() => {
            window.location.href = 'index.html';
          }, 500);
        } catch (error) {
          console.error('Logout error:', error.code);
          window.authErrorHandler.handle(error);
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

console.log('Authentication handlers initialized with inline errors and full modal logic.');

