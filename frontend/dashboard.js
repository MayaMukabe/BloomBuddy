// CONFIGURATION
// Backend API URL Configuration, automatically detects environment and uses appropriate backend URL
const API_BASE_URL = (() => {
  const hostname = window.location.hostname;
  // Development environment
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3001';
  }
  
  // Production environment
  return 'https://your-backend-url.railway.app'; //TODO UPDATE THIS WITH DEPLOYED BACKEND URL!
})();

console.log('Using backend API:', API_BASE_URL);

// UTILITY FUNCTIONS

// Get element by ID with error handling
function getEl(id) {
  const element = document.getElementById(id);
  if (!element) {
    console.warn(`Element with ID "${id}" not found`);
  }
  return element;
}

// Sanitize user input to prevent XSS attacks 
// TODOuse DOMPurify for production

function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}


// Rate limit function calls to prevent spam

function createRateLimiter(delay) {
  let lastCall = 0;
  let timeout;
  
  return function(func) {
    const now = Date.now();
    
    clearTimeout(timeout);
    
    if (now - lastCall >= delay) {
      lastCall = now;
      func();
    } else {
      timeout = setTimeout(() => {
        lastCall = Date.now();
        func();
      }, delay - (now - lastCall));
    }
  };
}

// Create rate limiter for send button (1 second minimum between messages)
const rateLimitedSend = createRateLimiter(1000);

// FIREBASE AUTH STATE MANAGEMENT

// Authentication state listener, redirects to login if user is not authenticated
window.onAuthStateChanged?.(window.auth, (user) => {
  if (user) {
    console.log('User authenticated:', user.uid);
    const userEmailEl = getEl('userEmail');
    if (userEmailEl) {
      userEmailEl.textContent = user.email || 'User';
    }
    
    // Store user ID for backend requests
    window.currentUserId = user.uid;
    window.currentUserEmail = user.email;
  } else {
    console.log('User not authenticated, redirecting to login');
    window.location.href = 'index.html';
  }
});


// LOGOUT FUNCTIONALITY
// Handle user logout
const logoutBtn = getEl('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
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


// CHAT MODAL MANAGEMENT
// Get DOM elements
const chatModal = getEl('chatModal');
const chatMessages = getEl('chatMessages');
const chatInput = getEl('chatInput');
const sendBtn = getEl('sendBtn');
const chatTitle = getEl('chatTitle');
const initialMessage = getEl('initialMessage');

// Chat state
let currentTopic = '';
let chatHistory = [];
let isProcessing = false; // Prevent multiple simultaneous requests


// Topic-specific configurations, each topic has its own title, initial message, and system prompt
const topicConfigs = {
  mood: {
    title: '💭 Mood Check',
    initialMessage: "Hello! I'm here to help you check in with your mood and emotional well-being. How are you feeling today?",
    systemPrompt: "You are a compassionate mental health assistant helping with mood checks. Be supportive, empathetic, and offer gentle guidance. Ask follow-up questions to understand their emotional state better. Always encourage professional help for serious concerns."
  },
  verse: {
    title: '📖 Verse + Encouragement',
    initialMessage: "Welcome! I'm here to provide you with spiritual encouragement and meaningful verses. What's on your heart today?",
    systemPrompt: "You are a spiritual counselor providing biblical encouragement and verses. Be uplifting, faith-centered, and offer relevant scripture when appropriate. Focus on hope, peace, and God's love. Be respectful of different beliefs."
  },
  practice: {
    title: '✨ Daily Practice',
    initialMessage: "Hi! I'm here to help you with your daily spiritual practices. What would you like to focus on today?",
    systemPrompt: "You are a spiritual practice guide helping with daily spiritual disciplines like prayer, meditation, gratitude, and mindfulness. Provide practical, actionable advice for spiritual growth that can be implemented immediately."
  },
  growth: {
    title: '🌱 Spiritual Growth',
    initialMessage: "Hello! I'm here to support your spiritual growth journey. What area would you like to explore or develop?",
    systemPrompt: "You are a spiritual mentor focused on helping people grow in their faith and relationship with God. Provide wisdom, guidance, and encouragement for deeper spiritual development. Be thoughtful and inspiring."
  }
};


//Initialize dashboard buttons and attach click handlers to all topic buttons
function initializeButtons() {
  const buttons = document.querySelectorAll('.dashboard-btn');
  console.log(`Found ${buttons.length} dashboard buttons`);
  
  buttons.forEach((btn) => {
    const topic = btn.getAttribute('data-topic');
    
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      console.log(`📱 Button clicked: ${topic}`);
      openChatModal(topic);
    });
  });
}


// Open chat modal for specific topic

function openChatModal(topic) {
  console.log(`Opening chat modal for topic: ${topic}`);
  currentTopic = topic;
  const config = topicConfigs[topic];
  
  if (!config) {
    console.error('No config found for topic:', topic);
    return;
  }
  
  // Update modal title and initial message
  if (chatTitle) chatTitle.textContent = config.title;
  if (initialMessage) initialMessage.textContent = config.initialMessage;
  
  // Clear previous chat history
  chatHistory = [];
  isProcessing = false;
  
  // Reset chat messages display
  if (chatMessages) {
    chatMessages.innerHTML = `
      <div class="message ai-message">
        <div class="message-content">
          <p>${config.initialMessage}</p>
        </div>
      </div>
    `;
  }
  
  // Show modal
  if (chatModal) {
    chatModal.setAttribute('aria-hidden', 'false');
  }
  
  // Focus input for better UX
  if (chatInput) {
    setTimeout(() => chatInput.focus(), 100);
  }
  
  // Enable send button
  if (sendBtn) {
    sendBtn.disabled = false;
  }
  
  console.log('Modal opened successfully');
}


//Close chat modal
function closeChatModal() {
  if (chatModal) {
    chatModal.setAttribute('aria-hidden', 'true');
  }
  isProcessing = false;
}

// Close modal on clicking close button or clicking outside
document.addEventListener('click', (e) => {
  if (e.target.matches('[data-close]') || e.target.classList.contains('chat-modal')) {
    closeChatModal();
  }
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeChatModal();
  }
});


// ABOUT MODAL MANAGEMENT
const aboutModal = getEl('aboutModal');

//Open About modal
function openAboutModal() {
  console.log('Opening About modal');
  if (aboutModal) {
    aboutModal.setAttribute('aria-hidden', 'false');
  }
}

// Open About modal when About link is clicked
document.addEventListener('click', (e) => {
  if (e.target.id === 'aboutLink' || e.target.textContent === 'About') {
    e.preventDefault();
    openAboutModal();
  }
});

// Close About modal
document.addEventListener('click', (e) => {
  if (e.target.matches('[data-close]') || e.target.classList.contains('about-modal')) {
    if (aboutModal) {
      aboutModal.setAttribute('aria-hidden', 'true');
    }
  }
});

// CHAT FUNCTIONALITY - SECURE BACKEND INTEGRATION
//Send message to secure backend
async function sendMessage() {
  // Validate input
  const message = chatInput?.value.trim();
  if (!message) {
    console.warn('Empty message, ignoring');
    return;
  }
  
  // Prevent multiple simultaneous requests
  if (isProcessing) {
    console.warn('Already processing a request, please wait');
    return;
  }
  
  // Check message length
  if (message.length > 4000) {
    alert('Message is too long. Please keep messages under 4000 characters.');
    return;
  }
  
  isProcessing = true;
  
  // Add user message to chat UI
  addMessageToChat(message, 'user');
  
  // Clear input
  if (chatInput) {
    chatInput.value = '';
  }
  
  // Disable send button to prevent spam
  if (sendBtn) {
    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending...';
  }
  
  // Show loading state
  const loadingMessage = addMessageToChat('Thinking...', 'ai', true);
  
  try {
    console.log('Sending message to backend...');
    
    // Build the conversation history
    const messages = [
      ...chatHistory,
      { role: 'user', content: message }
    ];
    
    // Make request to backend
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: messages,
        topic: currentTopic,
        userId: window.currentUserId || 'anonymous'
      })
    });
    
    console.log('Received response:', response.status);
    
    // Handle response
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Backend error:', response.status, errorData);
      throw new Error(errorData.message || `Server error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Response successful');
    
    // Validate response structure
    if (!data.success || !data.message) {
      throw new Error('Invalid response format from server');
    }
    
    // Remove loading message and add real response
    if (loadingMessage && loadingMessage.parentNode) {
      loadingMessage.remove();
    }
    addMessageToChat(data.message, 'ai');
    
    // Update chat history
    chatHistory.push(
      { role: 'user', content: message },
      { role: 'assistant', content: data.message }
    );
    
    // Keep only last 20 messages to prevent context from getting too large
    if (chatHistory.length > 20) {
      chatHistory = chatHistory.slice(-20);
      console.log('Trimmed chat history to last 20 messages');
    }
    
    // Log token usage if available (for monitoring costs)
    if (data.usage) {
      console.log('Token usage:', data.usage);
    }
    
  } catch (error) {
    console.error('Chat error:', error);
    
    // Remove loading message
    if (loadingMessage && loadingMessage.parentNode) {
      loadingMessage.remove();
    }
    
    // Error messages
    let errorMessage = 'Sorry, I encountered an error. ';
    
    if (error.message.includes('rate limit') || error.message.includes('429')) {
      errorMessage = 'You\'re sending messages too quickly. Please wait a moment and try again.';
    } else if (error.message.includes('network') || error.message.includes('Failed to fetch')) {
      errorMessage = 'Connection error. Please check your internet and try again.';
    } else if (error.message.includes('Invalid content') || error.message.includes('restricted')) {
      errorMessage = 'Your message contains restricted content. Please rephrase and try again.';
    } else if (error.message.includes('500')) {
      errorMessage = '🔧 Server error. Our team has been notified. Please try again in a few moments.';
    } else if (error.message.includes('401') || error.message.includes('403')) {
      errorMessage = 'Authentication error. Please log out and log back in.';
    } else {
      errorMessage += 'Please try again in a moment.';
    }
    
    addMessageToChat(errorMessage, 'ai');
    
  } finally {
    isProcessing = false;

    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.textContent = 'Send';
    }

    if (chatInput) {
      chatInput.focus();
    }
  }
}


//Add message to chat with sanitization to prevent XSS attacks
function addMessageToChat(message, sender, isLoading = false) {
  if (!chatMessages) return null;
  
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${sender}-message`;
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  
  const messageP = document.createElement('p');
  
  // Sanitize message to prevent XSS
  messageP.textContent = message;
  
  if (isLoading) {
    messageP.style.fontStyle = 'italic';
    messageP.style.opacity = '0.7';
  }
  
  contentDiv.appendChild(messageP);
  messageDiv.appendChild(contentDiv);
  chatMessages.appendChild(messageDiv);
  
  // Scroll to bottom with smooth animation
  chatMessages.scrollTo({
    top: chatMessages.scrollHeight,
    behavior: 'smooth'
  });
  
  return messageDiv;
}

// EVENT LISTENERS FOR CHAT INPUT
//Send button click handle
if (sendBtn) {
  sendBtn.addEventListener('click', () => {
    rateLimitedSend(() => sendMessage());
  });
}
//Enter key handler for chat input
//Send on Enter, new line on Shift+Enter
if (chatInput) {
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      rateLimitedSend(() => sendMessage());
    }
  });
  
  // Auto-resize textarea as user types
  chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = chatInput.scrollHeight + 'px';
  });
}

// INITIALIZATION
//Initialize the dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('Dashboard initializing...');
  initializeButtons();
  console.log('Dashboard initialized successfully');
});

// Backup initialization after short delay
setTimeout(() => {
  initializeButtons();
}, 100);

// ONLINE/OFFLINE STATUS MONITORING

window.addEventListener('online', () => {
  console.log('Connection restored');
});

window.addEventListener('offline', () => {
  console.log('Connection lost');
  if (isProcessing) {
    alert('Connection lost. Please check your internet and try again.');
    isProcessing = false;
    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.textContent = 'Send';
    }
  }
});

// ERROR BOUNDARY
// Global error handler
window.addEventListener('error', (e) => {
  console.error('Global error:', e.error); // log error  for debugging
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise rejection:', e.reason);
});

console.log('Dashboard.js loaded successfully');
console.log('Using secure backend API at:', API_BASE_URL);