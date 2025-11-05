// Centralized authentication error handling with user-friendly messages
class AuthErrorHandler {
  constructor() {
    this.errorMap = {
      // Authentication Errors
      'auth/user-not-found': {
        title: 'Account Not Found',
        message: 'No account exists with this email address. Please check your email or sign up for a new account.',
        action: 'Sign Up'
      },
      'auth/wrong-password': {
        title: 'Incorrect Password',
        message: 'The password you entered is incorrect. Please try again or reset your password.',
        action: 'Forgot Password?'
      },
      'auth/invalid-email': {
        title: 'Invalid Email',
        message: 'Please enter a valid email address.',
        action: null
      },
      'auth/email-already-in-use': {
        title: 'Email Already Registered',
        message: 'An account with this email already exists. Please log in or use a different email address.',
        action: 'Log In'
      },
      'auth/weak-password': {
        title: 'Weak Password',
        message: 'Please choose a stronger password with at least 6 characters.',
        action: null
      },
      'auth/too-many-requests': {
        title: 'Too Many Attempts',
        message: 'Too many unsuccessful attempts. Please wait a few minutes before trying again.',
        action: null
      },
      'auth/user-disabled': {
        title: 'Account Disabled',
        message: 'This account has been disabled. Please contact support for assistance.',
        action: 'Contact Support'
      },
      'auth/operation-not-allowed': {
        title: 'Sign-In Method Disabled',
        message: 'This sign-in method is currently unavailable. Please try another method.',
        action: null
      },
      'auth/invalid-credential': {
        title: 'Invalid Credentials',
        message: 'The email or password you entered is incorrect. Please try again.',
        action: null
      },
      'auth/requires-recent-login': {
        title: 'Session Expired',
        message: 'For security, please log in again to continue with this action.',
        action: 'Log In Again'
      },
      'auth/popup-closed-by-user': {
        title: 'Sign-In Cancelled',
        message: 'The sign-in window was closed. Please try again.',
        action: null
      },
      'auth/popup-blocked': {
        title: 'Pop-up Blocked',
        message: 'Your browser blocked the sign-in window. Please allow pop-ups for this site.',
        action: null
      },
      'auth/account-exists-with-different-credential': {
        title: 'Account Already Exists',
        message: 'An account already exists with this email using a different sign-in method. Please use your original sign-in method.',
        action: null
      },
      'auth/network-request-failed': {
        title: 'Connection Error',
        message: 'Unable to connect. Please check your internet connection and try again.',
        action: null
      },
      'auth/invalid-verification-code': {
        title: 'Invalid Code',
        message: 'The verification code is incorrect. Please try again.',
        action: null
      },
      'auth/invalid-verification-id': {
        title: 'Verification Failed',
        message: 'The verification session has expired. Please request a new code.',
        action: null
      },
      'auth/missing-verification-code': {
        title: 'Code Required',
        message: 'Please enter the verification code.',
        action: null
      },
      'auth/missing-email': {
        title: 'Email Required',
        message: 'Please enter your email address.',
        action: null
      },
      'auth/missing-password': {
        title: 'Password Required',
        message: 'Please enter your password.',
        action: null
      },
      'auth/invalid-action-code': {
        title: 'Invalid Link',
        message: 'This link is invalid or has expired. Please request a new one.',
        action: null
      },
      'auth/expired-action-code': {
        title: 'Link Expired',
        message: 'This link has expired. Please request a new one.',
        action: null
      },
      'auth/credential-already-in-use': {
        title: 'Credential In Use',
        message: 'This credential is already associated with another account.',
        action: null
      },
      
      // Network Errors
      'network-error': {
        title: 'Connection Problem',
        message: 'Unable to connect to our servers. Please check your internet connection.',
        action: null
      },
      'timeout': {
        title: 'Request Timeout',
        message: 'The request took too long. Please try again.',
        action: null
      },
      
      // Validation Errors
      'validation/passwords-no-match': {
        title: 'Passwords Don\'t Match',
        message: 'The passwords you entered don\'t match. Please try again.',
        action: null
      },
      'validation/password-too-short': {
        title: 'Password Too Short',
        message: 'Your password must be at least 6 characters long.',
        action: null
      },
      'validation/email-invalid': {
        title: 'Invalid Email',
        message: 'Please enter a valid email address.',
        action: null
      },
      'validation/field-required': {
        title: 'Required Field',
        message: 'Please fill in all required fields.',
        action: null
      },
      
      // Default fallback
      'default': {
        title: 'Something Went Wrong',
        message: 'An unexpected error occurred. Please try again in a moment.',
        action: null
      }
    };
  }

  /**
   * Get user-friendly error information from Firebase error
   * @param {Error} error - The Firebase error object
   * @returns {Object} - Error information with title, message, and action
   */
  getErrorInfo(error) {
    // Handle non-Firebase errors
    if (!error || !error.code) {
      return this.errorMap['default'];
    }

    // Get error code from Firebase error
    const errorCode = error.code;
    
    // Return mapped error or default
    return this.errorMap[errorCode] || this.errorMap['default'];
  }

  /**
   * Handle authentication error and show toast
   * @param {Error} error - The error to handle
   * @param {Function} actionCallback - Optional callback for action button
   */
  handle(error, actionCallback = null) {
    const errorInfo = this.getErrorInfo(error);
    
    // Log error for debugging (sanitized)
    console.error('Auth error handled:', {
      code: error?.code || 'unknown',
      title: errorInfo.title
    });

    // Show toast notification
    ToastNotification.show({
      type: 'error',
      title: errorInfo.title,
      message: errorInfo.message,
      action: errorInfo.action,
      actionCallback: actionCallback,
      duration: 6000
    });
  }

  /**
   * Validate form input and return custom validation error if needed
   * @param {Object} data - Form data to validate
   * @returns {Error|null} - Validation error or null if valid
   */
  validateAuthInput(data) {
    const { email, password, confirmPassword, name } = data;

    // Check required fields
    if (!email || !password) {
      const error = new Error('Required field missing');
      error.code = 'validation/field-required';
      return error;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      const error = new Error('Invalid email format');
      error.code = 'validation/email-invalid';
      return error;
    }

    // Validate password length
    if (password.length < 6) {
      const error = new Error('Password too short');
      error.code = 'validation/password-too-short';
      return error;
    }

    // Validate password match (if confirming)
    if (confirmPassword !== undefined && password !== confirmPassword) {
      const error = new Error('Passwords do not match');
      error.code = 'validation/passwords-no-match';
      return error;
    }

    return null;
  }
}

// Toast Notification System
class ToastNotification {
  static container = null;

  static init() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.setAttribute('aria-live', 'polite');
      this.container.setAttribute('aria-atomic', 'true');
      document.body.appendChild(this.container);
    }
  }

  static show(options = {}) {
    this.init();

    const {
      type = 'info', // 'success', 'error', 'warning', 'info'
      title = '',
      message = '',
      action = null,
      actionCallback = null,
      duration = 5000
    } = options;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');

    const icon = this.getIcon(type);

    toast.innerHTML = `
      <div class="toast-icon">${icon}</div>
      <div class="toast-content">
        ${title ? `<div class="toast-title">${this.escapeHtml(title)}</div>` : ''}
        <div class="toast-message">${this.escapeHtml(message)}</div>
        ${action ? `<button class="toast-action-btn">${this.escapeHtml(action)}</button>` : ''}
      </div>
      <button class="toast-close" aria-label="Close notification">×</button>
    `;

    // Add to container
    this.container.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('toast-show'), 10);

    // Setup close button
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => this.remove(toast));

    // Setup action button
    if (action && actionCallback) {
      const actionBtn = toast.querySelector('.toast-action-btn');
      actionBtn.addEventListener('click', () => {
        actionCallback();
        this.remove(toast);
      });
    }

    // Auto remove after duration
    if (duration > 0) {
      setTimeout(() => this.remove(toast), duration);
    }

    return toast;
  }

  static remove(toast) {
    toast.classList.remove('toast-show');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }

  static getIcon(type) {
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };
    return icons[type] || icons.info;
  }

  static escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Convenience methods
  static success(message, title = 'Success') {
    return this.show({ type: 'success', title, message });
  }

  static error(message, title = 'Error') {
    return this.show({ type: 'error', title, message });
  }

  static warning(message, title = 'Warning') {
    return this.show({ type: 'warning', title, message });
  }

  static info(message, title = 'Info') {
    return this.show({ type: 'info', title, message });
  }
}

// Loading state manager
class LoadingManager {
  static show(button, text = 'Loading...') {
    if (!button) return;
    
    button.disabled = true;
    button.dataset.originalText = button.textContent;
    button.textContent = text;
    button.classList.add('loading');
  }

  static hide(button) {
    if (!button) return;
    
    button.disabled = false;
    button.textContent = button.dataset.originalText || 'Submit';
    button.classList.remove('loading');
    delete button.dataset.originalText;
  }
}

// Export for use in other files
window.AuthErrorHandler = AuthErrorHandler;
window.ToastNotification = ToastNotification;
window.LoadingManager = LoadingManager;

// Initialize auth error handler globally
window.authErrorHandler = new AuthErrorHandler();

console.log('Auth Error Handler initialized');