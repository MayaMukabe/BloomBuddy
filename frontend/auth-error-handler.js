
class AuthErrorHandler {
  constructor() {
    this.errorMap = {
      // Authentication Errors
      'auth/user-not-found': {
        title: 'Account Not Found',
        message: 'No account exists with this email address. Please sign up.',
        action: 'Sign Up',
        fieldId: 'loginEmail'
      },
      'auth/wrong-password': {
        title: 'Incorrect Password',
        message: 'The password you entered is incorrect. Please try again.',
        action: 'Forgot Password?',
        fieldId: 'loginPassword'
      },
      'auth/invalid-email': {
        title: 'Invalid Email',
        message: 'Please enter a valid email address.',
        action: null,
        fieldId: 'loginEmail' // Also applies to signupEmail, resetEmail
      },
      'auth/email-already-in-use': {
        title: 'Email Already Registered',
        message: 'An account with this email already exists. Please log in.',
        action: 'Log In',
        fieldId: 'signupEmail'
      },
      'auth/weak-password': {
        title: 'Weak Password',
        message: 'Please choose a stronger password with at least 6 characters.',
        action: null,
        fieldId: 'signupPassword'
      },
      'auth/too-many-requests': {
        title: 'Too Many Attempts',
        message: 'Too many unsuccessful attempts. Please wait a few minutes before trying again.',
        action: null
      },
      'auth/invalid-credential': {
        title: 'Invalid Credentials',
        message: 'The email or password you entered is incorrect. Please try again.',
        action: null,
        fieldId: 'loginEmail'
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
        message: 'An account already exists with this email using a different sign-in method.',
        action: null,
        fieldId: 'loginEmail'
      },
      'auth/network-request-failed': {
        title: 'Connection Error',
        message: 'Unable to connect. Please check your internet connection and try again.',
        action: null
      },
      'auth/missing-email': {
        title: 'Email Required',
        message: 'Please enter your email address.',
        action: null,
        fieldId: 'loginEmail' // and others
      },
      'auth/missing-password': {
        title: 'Password Required',
        message: 'Please enter your password.',
        action: null,
        fieldId: 'loginPassword'
      },
      
      // Validation Errors
      'validation/passwords-no-match': {
        title: 'Passwords Don\'t Match',
        message: 'The passwords you entered don\'t match. Please try again.',
        action: null,
        fieldId: 'signupConfirm'
      },
      'validation/password-too-short': {
        title: 'Password Too Short',
        message: 'Your password must be at least 6 characters long.',
        action: null,
        fieldId: 'signupPassword'
      },
      'validation/email-invalid': {
        title: 'Invalid Email',
        message: 'Please enter a valid email address.',
        action: null,
        fieldId: 'signupEmail' // Default to signup, but will be dynamic
      },
      'validation/name-required': {
        title: 'Name Required',
        message: 'Please enter your full name.',
        action: null,
        fieldId: 'signupName'
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
    if (!error || !error.code) {
      return this.errorMap['default'];
    }
    const errorCode = error.code;
    return this.errorMap[errorCode] || this.errorMap['default'];
  }

  /**
   * Shows an inline error message under the specified form field.
   * @param {string} fieldId - The ID of the input field.
   * @param {string} message - The error message to display.
   */
  showInlineError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    const formGroup = field.closest('.form-group');
    if (!formGroup) return;

    const errorMessage = formGroup.querySelector('.error-message');
    if (!errorMessage) return;

    errorMessage.textContent = message;
    formGroup.classList.add('error');
  }

  /**
   * Clears all inline error messages within a specific form.
   * @param {HTMLElement} formElement - The form element to clear errors from.
   */
  clearInlineErrors(formElement) {
    if (!formElement) return;
    formElement.querySelectorAll('.form-group.error').forEach((group) => {
      group.classList.remove('error');
      const errorMessage = group.querySelector('.error-message');
      if (errorMessage) {
        errorMessage.textContent = '';
      }
    });
  }

  /**
   * Handle authentication error, showing inline or toast message
   * @param {Error} error - The error to handle
   * @param {Function} actionCallback - Optional callback for action button
   * @param {HTMLElement} [formElement=null] - The form to show inline errors on.
   */
  handle(error, actionCallback = null, formElement = null) {
    const errorInfo = this.getErrorInfo(error);
    
    // Log error for debugging
    console.error('Auth error handled:', {
      code: error?.code || 'unknown',
      title: errorInfo.title,
      field: errorInfo.fieldId
    });

    // --- Inline Error Logic ---
    // Try to find the field ID from the error map, or from the error object itself (for validation)
    const fieldId = errorInfo.fieldId || error.fieldId;

    if (fieldId && formElement) {
      // Find the specific field in the context of the passed form
      const field = formElement.querySelector(`#${fieldId}`);
      if (field) {
        this.showInlineError(fieldId, errorInfo.message);
        field.focus();
        return; // Don't show a toast if we showed an inline error
      }
    }
    
    // --- Toast Notification Logic (Fallback) ---
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

    // --- Signup Validation ---
    if (name !== undefined && !name) {
      const error = new Error('Name required');
      error.code = 'validation/name-required';
      error.fieldId = 'signupName';
      return error;
    }

    // --- Universal Validation ---
    if (!email) {
      const error = new Error('Email required');
      error.code = 'auth/missing-email';
      error.fieldId = data.fieldId || 'loginEmail'; // Use provided fieldId or default
      return error;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      const error = new Error('Invalid email format');
      error.code = 'validation/email-invalid';
      error.fieldId = data.fieldId || 'loginEmail';
      return error;
    }

    if (password === undefined) {
      return null; // Not all forms need password (e.g., forgot password)
    }

    if (!password) {
      const error = new Error('Password required');
      error.code = 'auth/missing-password';
      error.fieldId = data.fieldId || 'loginPassword';
      return error;
    }
    
    if (password.length < 6) {
      const error = new Error('Password too short');
      error.code = 'validation/password-too-short';
      error.fieldId = data.fieldId || 'signupPassword';
      return error;
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      const error = new Error('Passwords do not match');
      error.code = 'validation/passwords-no-match';
      error.fieldId = 'signupConfirm';
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
    button.dataset.originalText = button.innerHTML; // Use innerHTML to save icon
    button.innerHTML = text; // Use innerHTML
    button.classList.add('loading');
  }

  static hide(button) {
    if (!button) return;
    
    button.disabled = false;
    button.innerHTML = button.dataset.originalText || 'Submit'; // Use innerHTML
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