
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
        fieldId: null // Will be determined by form context
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
        fieldId: null // Will show on email field by default, but can be context-aware
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
        fieldId: null // Will be determined by form context
      },
      'auth/missing-password': {
        title: 'Password Required',
        message: 'Please enter your password.',
        action: null,
        fieldId: null // Will be determined by form context
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
        fieldId: null // Will be determined by form context
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
   * @param {HTMLElement} [formElement=null] - Optional form context to search within.
   */
  showInlineError(fieldId, message, formElement = null) {
    // Try to find field within form context first, then globally
    let field = null;
    if (formElement) {
      field = formElement.querySelector(`#${fieldId}`);
    }
    if (!field) {
      field = document.getElementById(fieldId);
    }
    if (!field) return;

    const formGroup = field.closest('.form-group');
    if (!formGroup) return;

    const errorMessage = formGroup.querySelector('.error-message');
    if (!errorMessage) return;

    errorMessage.textContent = message;
    formGroup.classList.add('error');
    field.setAttribute('aria-invalid', 'true');
    
    // Set up aria-describedby for accessibility
    if (!errorMessage.id) {
      errorMessage.id = `error-${fieldId}`;
    }
    field.setAttribute('aria-describedby', errorMessage.id);
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
      const input = group.querySelector('input, textarea, select');
      if (input) {
        input.removeAttribute('aria-invalid');
        input.removeAttribute('aria-describedby');
      }
    });
  }

  /**
   * Get the correct field ID based on form context
   * @param {string} fieldId - The field ID from error map
   * @param {HTMLElement} formElement - The form element to check context
   * @returns {string|null} - The correct field ID for this form context
   */
  getContextualFieldId(fieldId, formElement) {
    if (!fieldId || !formElement) return fieldId;

    // Check if the field exists in this form
    if (formElement.querySelector(`#${fieldId}`)) {
      return fieldId;
    }

    // Map common field names to context-specific IDs
    const formId = formElement.id;
    const fieldMap = {
      'loginForm': {
        'loginEmail': 'loginEmail',
        'loginPassword': 'loginPassword',
        'signupEmail': 'loginEmail',
        'resetEmail': 'loginEmail'
      },
      'signupForm': {
        'loginEmail': 'signupEmail',
        'signupEmail': 'signupEmail',
        'resetEmail': 'signupEmail',
        'loginPassword': 'signupPassword'
      },
      'forgotPasswordForm': {
        'loginEmail': 'resetEmail',
        'signupEmail': 'resetEmail',
        'resetEmail': 'resetEmail'
      }
    };

    const contextMap = fieldMap[formId];
    if (contextMap && contextMap[fieldId]) {
      // Verify the mapped field exists
      const mappedId = contextMap[fieldId];
      if (formElement.querySelector(`#${mappedId}`)) {
        return mappedId;
      }
    }

    // Try to find any email/password field in the form if the specific one doesn't exist
    if (fieldId.includes('Email') || fieldId.includes('email')) {
      const emailField = formElement.querySelector('input[type="email"]');
      if (emailField) return emailField.id;
    }
    if (fieldId.includes('Password') || fieldId.includes('password')) {
      const passwordField = formElement.querySelector('input[type="password"]');
      if (passwordField) return passwordField.id;
    }

    return null;
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
    let fieldId = errorInfo.fieldId || error.fieldId;

    // If fieldId is null, try to determine it from error code and form context
    if (!fieldId && formElement) {
      const errorCode = error?.code || '';
      
      // Determine field ID based on error code
      if (errorCode.includes('email') || errorCode === 'auth/invalid-email' || 
          errorCode === 'auth/missing-email' || errorCode === 'validation/email-invalid') {
        // Find email field in form
        const emailField = formElement.querySelector('input[type="email"]');
        if (emailField) fieldId = emailField.id;
      } else if (errorCode.includes('password') || errorCode === 'auth/wrong-password' || 
                 errorCode === 'auth/missing-password' || errorCode === 'auth/weak-password' ||
                 errorCode === 'validation/password-too-short') {
        // Find password field in form
        const passwordField = formElement.querySelector('input[type="password"]');
        if (passwordField) fieldId = passwordField.id;
      } else if (errorCode === 'auth/invalid-credential') {
        // Show on email field for invalid credentials
        const emailField = formElement.querySelector('input[type="email"]');
        if (emailField) fieldId = emailField.id;
      }
    }

    // Get context-aware field ID if we have a form and fieldId
    if (fieldId && formElement) {
      fieldId = this.getContextualFieldId(fieldId, formElement);
    }

    // Try to show inline error
    if (fieldId && formElement) {
      const field = formElement.querySelector(`#${fieldId}`);
      if (field) {
        this.showInlineError(fieldId, errorInfo.message, formElement);
        // Only focus if it's a user input error (not network/system errors)
        const isUserInputError = error?.code?.startsWith('auth/invalid') || 
                                error?.code?.startsWith('auth/wrong') ||
                                error?.code?.startsWith('auth/missing') ||
                                error?.code?.startsWith('validation/');
        if (isUserInputError) {
          // Small delay to ensure error is visible before focusing
          setTimeout(() => field.focus(), 100);
        }
        return; // Don't show a toast if we showed an inline error
      }
    }
    
    // --- Toast Notification Logic (Fallback) ---
    // Only show toast for errors that can't be shown inline (network errors, system errors, etc.)
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
   * @param {HTMLElement} [formElement=null] - Optional form element for context-aware field IDs
   * @returns {Error|null} - Validation error or null if valid
   */
  validateAuthInput(data, formElement = null) {
    const { email, password, confirmPassword, name } = data;

    // Helper to get the correct field ID based on form context
    const getFieldId = (defaultId, emailId = null, passwordId = null) => {
      if (data.fieldId) return data.fieldId;
      if (formElement) {
        // Try to find the field in the form
        if (formElement.querySelector(`#${defaultId}`)) {
          return defaultId;
        }
        // Try email/password fallbacks
        if (emailId && formElement.querySelector(`#${emailId}`)) {
          return emailId;
        }
        if (passwordId && formElement.querySelector(`#${passwordId}`)) {
          return passwordId;
        }
      }
      return defaultId;
    };

    // --- Signup Validation ---
    if (name !== undefined && !name.trim()) {
      const error = new Error('Name required');
      error.code = 'validation/name-required';
      error.fieldId = getFieldId('signupName');
      return error;
    }

    // --- Universal Validation ---
    if (!email || !email.trim()) {
      const error = new Error('Email required');
      error.code = 'auth/missing-email';
      error.fieldId = getFieldId('loginEmail', 'signupEmail', 'resetEmail');
      return error;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      const error = new Error('Invalid email format');
      error.code = 'validation/email-invalid';
      error.fieldId = getFieldId('loginEmail', 'signupEmail', 'resetEmail');
      return error;
    }

    if (password === undefined) {
      return null; // Not all forms need password (e.g., forgot password)
    }

    if (!password) {
      const error = new Error('Password required');
      error.code = 'auth/missing-password';
      error.fieldId = getFieldId('loginPassword', null, 'signupPassword');
      return error;
    }
    
    if (password.length < 6) {
      const error = new Error('Password too short');
      error.code = 'validation/password-too-short';
      error.fieldId = getFieldId('signupPassword', null, 'loginPassword');
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