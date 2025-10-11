// Modal logic and basic demo handlers

function getEl(id) { return document.getElementById(id); }

const loginModal = getEl('loginModal');
const signupModal = getEl('signupModal');

const openLoginBtn = getEl('openLogin');
const openSignupBtn = getEl('openSignup');
const googleSignInBtn = getEl('googleSignIn');

function openModal(modal) {
  if (!modal) return;
  modal.setAttribute('aria-hidden', 'false');
  // focus first input for accessibility
  const firstInput = modal.querySelector('input');
  if (firstInput) firstInput.focus();
}

function closeModal(modal) {
  if (!modal) return;
  modal.setAttribute('aria-hidden', 'true');
}

openLoginBtn?.addEventListener('click', () => openModal(loginModal));
openSignupBtn?.addEventListener('click', () => openModal(signupModal));

document.addEventListener('click', (e) => {
  const target = e.target;
  if (!(target instanceof Element)) return;

  // Close buttons
  if (target.matches('[data-close]')) {
    const modal = target.closest('.modal');
    if (modal) closeModal(modal);
  }

  // Click outside content
  if (target.classList.contains('modal')) {
    closeModal(target);
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal(loginModal);
    closeModal(signupModal);
  }
});

// Firebase Authentication handlers
const loginForm = getEl('loginForm');
const signupForm = getEl('signupForm');

// Show loading state
function showLoading(button, text = 'Loading...') {
  button.disabled = true;
  button.textContent = text;
}

function hideLoading(button, originalText) {
  button.disabled = false;
  button.textContent = originalText;
}

// Handle login
loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = /** @type {HTMLInputElement} */ (getEl('loginEmail')).value.trim();
  const password = /** @type {HTMLInputElement} */ (getEl('loginPassword')).value;
  const submitBtn = loginForm.querySelector('button[type="submit"]');
  
  if (!email || !password) {
    alert('Please fill in all fields.');
    return;
  }

  showLoading(submitBtn, 'Signing in...');

  try {
    const userCredential = await window.signInWithEmailAndPassword(window.auth, email, password);
    const user = userCredential.user;
    
    console.log('User logged in:', user);
    alert(`Welcome back! Logged in as: ${user.email}`);
    closeModal(loginModal);
    
    // Redirect to dashboard
    window.location.href = 'dashboard.html';
    
  } catch (error) {
    console.error('Login error:', error);
    let errorMessage = 'Login failed. ';
    
    switch (error.code) {
      case 'auth/user-not-found':
        errorMessage += 'No account found with this email.';
        break;
      case 'auth/wrong-password':
        errorMessage += 'Incorrect password.';
        break;
      case 'auth/invalid-email':
        errorMessage += 'Invalid email address.';
        break;
      case 'auth/too-many-requests':
        errorMessage += 'Too many failed attempts. Please try again later.';
        break;
      default:
        errorMessage += error.message;
    }
    
    alert(errorMessage);
  } finally {
    hideLoading(submitBtn, 'Log in');
  }
});

// Handle signup
signupForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = /** @type {HTMLInputElement} */ (getEl('signupName')).value.trim();
  const email = /** @type {HTMLInputElement} */ (getEl('signupEmail')).value.trim();
  const password = /** @type {HTMLInputElement} */ (getEl('signupPassword')).value;
  const confirm = /** @type {HTMLInputElement} */ (getEl('signupConfirm')).value;
  const submitBtn = signupForm.querySelector('button[type="submit"]');

  if (!name || !email || !password || !confirm) {
    alert('Please fill in all fields.');
    return;
  }

  if (password !== confirm) {
    alert('Passwords do not match.');
    return;
  }

  if (password.length < 6) {
    alert('Password must be at least 6 characters long.');
    return;
  }

  showLoading(submitBtn, 'Creating account...');

  try {
    const userCredential = await window.createUserWithEmailAndPassword(window.auth, email, password);
    const user = userCredential.user;
    
    // Create a user profile in Firestore
    const userDocRef = window.doc(window.db, 'users', user.uid);
    await window.setDoc(userDocRef, {
      displayName: name,
      email: user.email,
      createdAt: window.serverTimestamp(),
    });
    
    console.log('User created:', user);
    alert(`Welcome, ${name}! Your account has been created successfully.`);
    closeModal(signupModal);
    
    // Redirect to dashboard
    window.location.href = 'dashboard.html';
    
  } catch (error) {
    console.error('Signup error:', error);
    let errorMessage = 'Account creation failed. ';
    
    switch (error.code) {
      case 'auth/email-already-in-use':
        errorMessage += 'An account with this email already exists.';
        break;
      case 'auth/invalid-email':
        errorMessage += 'Invalid email address.';
        break;
      case 'auth/weak-password':
        errorMessage += 'Password is too weak.';
        break;
      default:
        errorMessage += error.message;
    }
    
    alert(errorMessage);
  } finally {
    hideLoading(submitBtn, 'Sign up');
  }
});

//Google Sign-In Funtionality
async function signInWithGoogle() {
  const provider = new window.GoogleAuthProvider();
  showLoading(googleSignInBtn, 'Opening...');

  try {
    const result = await window.signInWithPopup(window.auth, provider);
    const user = result.user;
    const additionalUserInfo = window.getAdditionalUserInfo(result);

    //create a profile if its a new user
    if (additionalUserInfo.isNewUser) {
      const userDocRef = window.doc(window.db, 'user', user.id);
      await window.setDoc(userDocRef, {
        displayName: user.displayName,
        email: user.email,
        createdAt: window.serverTimestamp(),
      });
      console.log('New User profile created in Firestore for:', user.displayName);

    } 
    //Redirect to the dashboard
    window.location.href = 'dashboard.html';
  } catch (error) {
    console.error('Google Sign-In Error:', error);
    let errorMessage = "Could not sign in with Google. ";
    if (error.code === 'auth/popup-closed-by-user') {
      errorMessage += "The sign-in window was closed.";
    } else if (error.code === 'auth/account-exists-with-different-credentials') {
      errorMessage += "An account already exists with this email address. Please sign in with your original method"
    }
    alert(errorMessage);
  } finally {
    hideLoading(googleSignInBtn, 'Sign in with Google');
    googleSignInBtn.innerHTML = '<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google logo"/> Sign in with Google';
  }
}

if (googleSignInBtn) {
  googleSignInBtn.addEventListener('click', signInWithGoogle);
}

// Monitor authentication state
window.onAuthStateChanged?.(window.auth, (user) => {
  if (user) {
    console.log('User is signed in:', user);
    // User is signed in, you can redirect or update UI
  } else {
    console.log('User is signed out');
    // User is signed out
  }
});

// Optional: guest continue
getEl('continueGuest')?.addEventListener('click', () => {
  // window.location.href = 'dashboard.html';
  alert('Continuing as guest...');
});

