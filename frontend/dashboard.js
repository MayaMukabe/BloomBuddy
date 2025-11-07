// CONFIGURATION
// Backend API URL Configuration, automatically detects environment and uses appropriate backend URL
const API_BASE_URL = (() => {
  const hostname = window.location.hostname;
  // Development environment
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3001';
  }
  
  // Production environment
  return 'https://bloombuddy-backend.onrender.com'; 
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
function sanitizeInput(input) {
  return DOMPurify.sanitize(input);
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
window.onAuthStateChanged?.(window.auth, async (user) => {
  if (user) {
    console.log('User authenticated:', user.uid);
    window.currentUserId = user.uid;

    const userMenu = getEl('userMenu');
    const guestMenu = getEl('guestMenu');

    const userEmailEl = getEl('userEmail');
    if (userEmailEl) userEmailEl.textContent = user.email || 'user';

    //Update profile dropdown info
    const userInitial = getEl('userInitial');
    const dropdownUserEmail = getEl('dropdownUserEmail');
    if (userInitial) {
      userInitial.textContent = (user.displayName || user.email || 'B').charAt(0).toUpperCase();
    }

    if (dropdownUserEmail) {
      dropdownUserEmail.textContent = user.email || 'Guest';
    }

    if (user.isAnonymous) {
      console.log("User is in Guest Mode");
      userMenu.style.display = 'none';
      guestMenu.style.display = 'flex';
    } else {
      console.log("User is a permanent user.");
      userMenu.style.display = 'flex';
      guestMenu.style.display = 'none';

      const userEmailEl = getEl('userEmail');
      if (userEmailEl) userEmailEl.textContent = user.email || 'User';
    }

    //Create or Update a user profile in FireStore
    const userDocRef = window.doc(window.db, 'users', user.uid);
    window.setDoc(userDocRef, {
      displayName: user.displayName || 'Anonymous',
      email: user.email,
      lastLogin: window.serverTimestamp(),
    }, { merge: true });


    // Initialize reminders here
    if (window.ReminderSystem) {
      const reminderSystem = new window.ReminderSystem();
      await reminderSystem.init(user.uid);
      window.reminderSystem = reminderSystem; // Make globally accessible
    }

  } else {
    console.log('User not authenticated, redirecting to login');
    window.location.href = 'index.html';
  }
});


//PROFILE DROPDOWN MANAGEMENT
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
  };
})
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


// CHAT MODAL MANAGEMENT
// Get DOM elements
const chatModal = getEl('chatModal');
const chatMessages = getEl('chatMessages');
const chatInput = getEl('chatInput');
const sendBtn = getEl('sendBtn');
const chatTitle = getEl('chatTitle');
const initialMessage = getEl('initialMessage');
const exportChatBtn = getEl('exportChatBtn');
const historyBtn = getEl('historyBtn');
const conversationHistorySidebar = getEl('conversationHistorySidebar');
const historyCloseBtn = getEl('historyCloseBtn');
const historyList = getEl('historyList');
const historyTopicFilter = getEl('historyTopicFilter');

// Chat state
let currentTopic = '';
let chatHistory = [];
let isProcessing = false; // Prevent multiple simultaneous requests
let currentConversationId = null;
let offlineQueue = [];
let conversations = []; // Store fetched conversations

const upgradeGuestBtn = getEl('upgradeGuestBtn');
const signupModal = getEl('signupModal');
const signupForm = getEl('signupForm');

if (upgradeGuestBtn) {
  upgradeGuestBtn.addEventListener('click', () => {
    if (signupModal) signupModal.setAttribute('aria-hidden', 'false');
  });
}

if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = getEl('signupName').value.trim();
    const email = getEl('signupEmail').value.trim();
    const password = getEl('signupPassword').value;

    const credential = window.EmailAuthProvider.credential(email, password);

    try {
      const userCredential = await window.linkWithCredential(window.auth.currentUser, credential);
      const user = userCredential.user;

      // update  profile with the new info after linking account
      const userDocRef = window.doc(window.db, 'users', user.uid);
      await window.setDoc(userDocRef, {
        displayName: name,
        email: user.email,
        // createdAt is not set here to preserve the original guest creation date
      }, { merge: true });

      alert("Success! Your account is now saved.");
      if (signupModal) signupModal.setAttribute('aria-hidden', 'true');
      // Force a UI update by reloading the page
      window.location.reload();

    } catch (error) {
      console.error("Error linking account:", error);
      if (error.code == 'auth/email-already-in-use') {
        alert("This email is already in use by another account.");
      } else {
        alert("Could not create account. Please try again.");
      }
    }
  });
}


// Topic-specific configurations, each topic has its own title, initial message, and system prompt
const topicConfigs = {
  mood: {
    title: '💭 Mood Check',
    initialMessage:"Hello! I'm here to help you check in with your mood and emotional well-being. To start, you could tell me if you're doing okay, not sure, or struggling.",
    systemPrompt: "You are a compassionate mental health assistant helping with mood checks. Be supportive, empathetic, and offer gentle guidance. Ask follow-up questions to understand their emotional state better. Always encourage professional help for serious concerns."
  },
  verse: {
    title: '📖 Verse + Encouragement',
    initialMessage: "Welcome! I'm here to provide you with spiritual encouragement and meaningful verses. What's on your heart today? You can mention feelings like anxiety, fear, doubt, sadness, stress, or confusion.",
    systemPrompt:"You are a spiritual counselor providing biblical encouragement and verses. Be uplifting, faith-centered, and offer relevant scripture when appropriate. Focus on hope, peace, and God's love. Be respectful of different beliefs."
  },
  practice: {
    title: '✨ Daily Practice',
    initialMessage: "Hi! I'm here to help you with your daily spiritual practices. Would you like a daily affirmation, a gratitude prompt, a short prayer, or a journal reflection?",
    systemPrompt: "You are a spiritual practice guide helping with daily spiritual disciplines like prayer, meditation, gratitude, and mindfulness. Provide practical, actionable advice for spiritual growth that can be implemented immediately."
  },
  growth: {
    title: '🌱 Spiritual Growth',
    initialMessage: "Hello! I'm here to support your spiritual growth journey. Which area would you like to grow in? For example, you could mention faith, forgiveness, hope, or purpose.",
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
  currentConversationId = null;
  
  // Reset chat messages display
  if (chatMessages) {
    chatMessages.innerHTML = ''; //Clear the board first
    loadMessagesFromLocalStorage();
    addMessageToChat(config.initialMessage, 'ai'); // Add the initial message with timestamp
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
  // Close history sidebar when closing chat modal
  if (conversationHistorySidebar) {
    conversationHistorySidebar.setAttribute('aria-hidden', 'true');
  }
  // Reset conversation state
  currentConversationId = null;
  chatHistory = [];
  isProcessing = false;
}

// CONVERSATION HISTORY MANAGEMENT

// Fetch conversations from Firestore
async function fetchConversations(topicFilter = '') {
  if (!window.currentUserId || !window.db) {
    console.warn('User not authenticated or Firestore not initialized');
    console.warn('currentUserId:', window.currentUserId);
    console.warn('db:', window.db);
    return [];
  }

  try {
    console.log('Fetching conversations for user:', window.currentUserId);
    const conversationsRef = window.collection(window.db, 'conversations');
    
    // Try query with orderBy first, fallback to simple query if index is missing
    let snapshot;
    try {
      let queryConstraints = [
        window.where('userId', '==', window.currentUserId)
      ];

      // If topic filter is specified, add it to the query
      if (topicFilter) {
        queryConstraints.push(window.where('topic', '==', topicFilter));
      }

      queryConstraints.push(window.orderBy('startedAt', 'desc'));
      
      const q = window.query(conversationsRef, ...queryConstraints);
      snapshot = await window.getDocs(q);
    } catch (orderByError) {
      console.warn('Error with orderBy query (index may be missing), trying without orderBy:', orderByError);
      // Fallback: query without orderBy if index doesn't exist
      let queryConstraints = [
        window.where('userId', '==', window.currentUserId)
      ];

      if (topicFilter) {
        queryConstraints.push(window.where('topic', '==', topicFilter));
      }
      
      const q = window.query(conversationsRef, ...queryConstraints);
      snapshot = await window.getDocs(q);
      
      // Sort manually in JavaScript
      const docs = snapshot.docs.sort((a, b) => {
        const aTime = a.data().startedAt?.toDate()?.getTime() || 0;
        const bTime = b.data().startedAt?.toDate()?.getTime() || 0;
        return bTime - aTime; // Descending order
      });
      snapshot = { docs };
    }

    console.log(`Found ${snapshot.docs.length} conversations`);
    const conversationList = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();
      console.log('Processing conversation:', doc.id, data);
      
      // Fetch the first message to use as preview
      let preview = 'No messages yet';
      try {
        const messagesRef = window.collection(window.db, 'conversations', doc.id, 'messages');
        const messagesQuery = window.query(
          messagesRef, 
          window.orderBy('timestamp', 'asc'), 
          window.limit(1)
        );
        const messagesSnapshot = await window.getDocs(messagesQuery);
        
        if (!messagesSnapshot.empty) {
          const firstMessage = messagesSnapshot.docs[0].data();
          preview = firstMessage.content.substring(0, 60) + (firstMessage.content.length > 60 ? '...' : '');
        }
      } catch (msgError) {
        console.warn('Error fetching messages preview for conversation', doc.id, ':', msgError);
        // Try without orderBy
        try {
          const messagesRef = window.collection(window.db, 'conversations', doc.id, 'messages');
          const messagesSnapshot = await window.getDocs(
            window.query(messagesRef, window.limit(1))
          );
          if (!messagesSnapshot.empty) {
            const firstMessage = messagesSnapshot.docs[0].data();
            preview = firstMessage.content.substring(0, 60) + (firstMessage.content.length > 60 ? '...' : '');
          }
        } catch (e) {
          console.warn('Could not fetch message preview:', e);
        }
      }

      conversationList.push({
        id: doc.id,
        topic: data.topic || 'unknown',
        startedAt: data.startedAt?.toDate() || new Date(),
        preview: preview
      });
    }

    console.log('Returning conversation list:', conversationList);
    return conversationList;
  } catch (error) {
    console.error('Error fetching conversations:', error);
    console.error('Error details:', error.message, error.code);
    // Show user-friendly error in history list
    if (historyList) {
      historyList.innerHTML = `<div class="history-empty" style="color: #d32f2f;">
        Error loading conversations: ${error.message || 'Unknown error'}. 
        Please check the console for details.
      </div>`;
    }
    return [];
  }
}

// Display conversations in the history sidebar
async function displayConversations(topicFilter = '') {
  if (!historyList) {
    console.error('History list element not found');
    return;
  }

  console.log('Displaying conversations with filter:', topicFilter);
  historyList.innerHTML = '<div class="history-loading">Loading conversations...</div>';
  
  conversations = await fetchConversations(topicFilter);
  console.log('Conversations fetched:', conversations.length);
  
  if (conversations.length === 0) {
    historyList.innerHTML = '<div class="history-empty">No conversations found. Start a new conversation to see it here!</div>';
    return;
  }

  historyList.innerHTML = '';
  
  conversations.forEach((conversation, index) => {
    const item = document.createElement('div');
    item.className = 'history-item';
    item.setAttribute('data-conversation-id', conversation.id);
    if (conversation.id === currentConversationId) {
      item.classList.add('active');
    }

    const topicName = topicConfigs[conversation.topic]?.title || conversation.topic;
    const date = conversation.startedAt.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });

    item.innerHTML = `
      <div class="history-item-topic">${topicName}</div>
      <div class="history-item-preview">${sanitizeInput(conversation.preview)}</div>
      <div class="history-item-date">${date}</div>
    `;

    item.addEventListener('click', () => {
      console.log('Loading conversation:', conversation.id);
      loadConversation(conversation.id);
    });

    historyList.appendChild(item);
  });
  
  console.log('Displayed', conversations.length, 'conversations');
}

// Load a conversation from Firestore
async function loadConversation(conversationId) {
  if (!conversationId || !window.db) {
    console.error('Invalid conversation ID or Firestore not initialized');
    return;
  }

  try {
    // Fetch conversation metadata
    const conversationRef = window.doc(window.db, 'conversations', conversationId);
    const conversationDoc = await window.getDoc(conversationRef);

    if (!conversationDoc.exists()) {
      console.error('Conversation not found');
      return;
    }

    const conversationData = conversationDoc.data();
    
    // Fetch all messages for this conversation
    const messagesRef = window.collection(window.db, 'conversations', conversationId, 'messages');
    const messagesSnapshot = await window.getDocs(
      window.query(messagesRef, window.orderBy('timestamp', 'asc'))
    );

    // Update current conversation state
    currentConversationId = conversationId;
    currentTopic = conversationData.topic || currentTopic;
    
    // Update UI with conversation topic
    const config = topicConfigs[currentTopic];
    if (config && chatTitle) {
      chatTitle.textContent = config.title;
    }

    // Clear current chat display
    if (chatMessages) {
      chatMessages.innerHTML = '';
    }

    // Load messages into chat
    chatHistory = [];
    messagesSnapshot.forEach(doc => {
      const messageData = doc.data();
      const timestamp = messageData.timestamp?.toDate() || new Date();
      
      // Add to chat history
      chatHistory.push({
        role: messageData.role,
        content: messageData.content,
        timestamp: timestamp.toISOString()
      });

      // Display message in chat
      addMessageToChat(messageData.content, messageData.role === 'user' ? 'user' : 'ai', false, timestamp);
    });

    // Add initial message if no messages exist
    if (chatHistory.length === 0 && config) {
      addMessageToChat(config.initialMessage, 'ai');
    }

    // Update active state in history list and refresh if sidebar is open
    if (historyList) {
      // Refresh the conversation list to update active state
      if (conversationHistorySidebar && conversationHistorySidebar.getAttribute('aria-hidden') === 'false') {
        const selectedTopic = historyTopicFilter?.value || '';
        await displayConversations(selectedTopic);
      }
    }

    // Close history sidebar
    if (conversationHistorySidebar) {
      conversationHistorySidebar.setAttribute('aria-hidden', 'true');
    }

    console.log('Conversation loaded successfully');
  } catch (error) {
    console.error('Error loading conversation:', error);
    addMessageToChat('Error loading conversation. Please try again.', 'ai');
  }
}

// Toggle history sidebar
function toggleHistorySidebar() {
  if (!conversationHistorySidebar) return;
  
  const isHidden = conversationHistorySidebar.getAttribute('aria-hidden') === 'true';
  conversationHistorySidebar.setAttribute('aria-hidden', isHidden ? 'false' : 'true');
  
  if (isHidden) {
    // Load conversations when opening sidebar
    const selectedTopic = historyTopicFilter?.value || '';
    displayConversations(selectedTopic);
  }
}

// Event listeners for history sidebar
if (historyBtn) {
  historyBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleHistorySidebar();
  });
}

if (historyCloseBtn) {
  historyCloseBtn.addEventListener('click', () => {
    if (conversationHistorySidebar) {
      conversationHistorySidebar.setAttribute('aria-hidden', 'true');
    }
  });
}

if (historyTopicFilter) {
  historyTopicFilter.addEventListener('change', (e) => {
    displayConversations(e.target.value);
  });
}


// Close chat modal and other modals
document.addEventListener('click', (e) => {
  // Check if the clicked element is a close button or the modal backdrop
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
  const loadingMessage = addMessageToChat('', 'ai', true);
  
  try {
    console.log('Sending message to backend...');
    
    // Build the conversation history
    const messages = [
      ...chatHistory,
      { role: 'user', content: message }
    ];

    if (!navigator.onLine) {
      console.log('Offline: Queuing message. ');
      const offlineMsg = { role: 'user', content: message, timestamp: new Date().toISOString() };
      offlineQueue.push(offlineMsg);
      saveOfflineQueueToLocalStorage();
      if (loadingMessage && loadingMessage.parentNode) {
        loadingMessage.remove();
      }
      addMessageToChat('You are offline. Message will be sent when you reconnect.', 'ai');
      isProcessing = false;
      if (sendBtn) {
        sendBtn.disabled = false;
        sendBtn.textContent = 'Send';
      }
      if (chatInput) {
        chatInput.focus();
      }
      return;
    }
    
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

    // Always remove he typing indicator regardless of success or failure
    if (loadingMessage && loadingMessage.parentNode){
      loadingMessage.remove();
    }
    
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

    //Save converstaion to Firestore
    if (!currentConversationId){
      console.log('Creating new conversation for user:', window.currentUserId, 'topic:', currentTopic);
      try {
        const conversationRef = await window.addDoc(window.collection(window.db, 'conversations'), {
          userId: window.currentUserId,
          topic: currentTopic,
          startedAt: window.serverTimestamp(),
        });
        currentConversationId = conversationRef.id;
        console.log('Created conversation with ID:', currentConversationId);
        
        // Refresh history sidebar if it's open
        if (conversationHistorySidebar && conversationHistorySidebar.getAttribute('aria-hidden') === 'false') {
          const selectedTopic = historyTopicFilter?.value || '';
          await displayConversations(selectedTopic);
        }
      } catch (error) {
        console.error('Error creating conversation:', error);
        throw error; // Re-throw to be caught by outer try-catch
      }
    }

    console.log('Saving messages to conversation:', currentConversationId);
    try {
      await window.addDoc(window.collection(window.db, 'conversations', currentConversationId, 'messages'), {
        role: 'user',
        content: message,
        timestamp: window.serverTimestamp()
      });

      await window.addDoc(window.collection(window.db, 'conversations', currentConversationId, 'messages'), {
        role: 'assistant',
        content: data.message,
        timestamp: window.serverTimestamp(),
      });
      console.log('Messages saved successfully');
    } catch (error) {
      console.error('Error saving messages:', error);
      // Don't throw - allow chat to continue even if save fails
    }
    
    // Update chat history
    chatHistory.push(
      { role: 'user', content: message },
      { role: 'assistant', content: data.message }
    );

    saveMessagesToLocalStorage();
    
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

//LOCAL STORAGE FUNCTIONS
function saveMessagesToLocalStorage() {
  localStorage.setItem(`chatHistory_${currentTopic}`, JSON.stringify(chatHistory));
}

function loadMessagesFromLocalStorage() {
  const savedHistory = localStorage.getItem(`chatHistory_${currentTopic}`);
  if (savedHistory) {
    try {
      chatHistory = JSON.parse(savedHistory);
      chatHistory.forEach(msg => {
      const timestamp = msg.timestamp ? new Date(msg.timestamp) : new Date();
      if (!isNaN(timestamp.getTime())) {
        addMessageToChat(msg.content, msg.role, false, timestamp);
      } else {
        console.warn("Invalid timestamp found localStorage:", msg.timestamp);
        addMessageToChat(msg.content, msg.role, false, new Date());
      }
    });
  } catch (e) {
    console.error("Failed to parse chat history from localStorage:", e);
    localStorage.removeItem(`chatHistory_${currentTopic}`) // Clear corrupted data
    chatHistory = []; //Reset History
  }  
} else {
  chatHistory = []; //Initialize if nothing is saved
}
}

function saveOfflineQueueToLocalStorage() {
  localStorage.setItem('offlineQueue', JSON.stringify(offlineQueue));
}

function loadOfflineQueueFromLocal() {
  const savedQueue = localStorage.getItem('offlineQueue');
  if (savedQueue) {
    offlineQueue = JSON.parse(savedQueue);
  }
}

async function syncMessagesWithFirestore() {
  if (offlineQueue.length === 0) return;

  console.log('Syncing offline messages...');
  addMessageToChat('Reconnected. Syncing messages...', 'ai');

  const queue = [...offlineQueue];
  offlineQueue = [];
  saveOfflineQueueToLocalStorage();

  for (const msg of queue) {
    await sendMessageToServer(msg);
  }

  addMessageToChat('Sync complete!', 'ai');
}

async function sendMessageToServer(msg) {
  try {
    const messages = [...chatHistory, { role: 'user', content: msg.content }];
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: messages,
        topic: currentTopic,
        userId: window.currentUserId || 'anonymous'
      })
    });

    if (!response.ok) throw new Error('Failed to sync message');

    const data = await response.json();
    addMessageToChat(data.message, 'ai');
    chatHistory.push({ role: 'user', content: msg.content }, { role: 'assistant', content: data.message });
    saveMessagesToLocalStorage();
  } catch (error) {
    console.error('Failed to sync a message:', error);
    addMessageToChat(`Failed to send message: "${msg.content.substring(0, 20)}..."`, 'ai');
  }
}


//Add message to chat with sanitization to prevent XSS attacks
// dashboard.js
function addMessageToChat(message, sender, isLoading = false, timestamp = new Date()) { 
  if (!chatMessages) return null;
  
  const messageWrapper = document.createElement('div');
  messageWrapper.className = `message ${sender}-message`;
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';

  if (isLoading) {
    contentDiv.innerHTML = `
      <div class="typing-indicator">
        <span></span>
        <span></span>
        <span></span>
      </div>
    `;
  } else {
    const messageP = document.createElement('p');
    let formattedMessage = message.replace(/\n/g, '<br>');
    formattedMessage = formattedMessage.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    messageP.innerHTML = sanitizeInput(formattedMessage);
    contentDiv.appendChild(messageP);
  }

  // Create the timestamp element
  const timestampSpan = document.createElement('span');
  timestampSpan.className = 'timestamp';
  timestampSpan.textContent = timestamp.toLocaleTimeString([], { 
    hour: 'numeric',
    minute: '2-digit'
  });
  
  messageWrapper.appendChild(contentDiv);
  if (!isLoading) {
    messageWrapper.appendChild(timestampSpan);
  }
  
  chatMessages.appendChild(messageWrapper);
  
  chatMessages.scrollTo({
    top: chatMessages.scrollHeight,
    behavior: 'smooth'
  });
  
  return messageWrapper;
}
function exportChatHistory(){
  if (chatHistory.length === 0) {
    alert("There is no conversation to export.")
    return;
  }

  const chatTitleText = chatTitle?.textContent || 'BloomBuddy Chat';
  const date = new Date().toLocaleDateString();

  //Format Chat history into a string
  let formattedText = `Chat History: ${chatTitleText}\n`;
  formattedText += `Exported on: ${date}\n\n`;

  const config = topicConfigs[currentTopic];
  if(config){
    formattedText += `BloomBuddy: ${config.initialMessage}\n\n`;
  }

  chatHistory.forEach(message => {
    const prefix = message.role === 'User' ? 'You:' : 'BloomBuddy:';
    formattedText += `${prefix} ${message.content}\n\n`;
  });

  const blob = new Blob([formattedText], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const safeFilename = chatTitleText.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  link.download = `BloomBuddy_Chat_${safeFilename}.txt`;

  //Trigger Download and Clean Up
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

}

// EVENT LISTENERS FOR CHAT INPUT
//Send button click handle
if (sendBtn) {
  sendBtn.addEventListener('click', () => {
    rateLimitedSend(() => sendMessage());
  });
}

  
  //Add click listener for the export button
if (exportChatBtn) {
  exportChatBtn.addEventListener('click', exportChatHistory);
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
  loadOfflineQueueFromLocal();
  console.log('Dashboard initialized successfully');
});

// Backup initialization after short delay
setTimeout(() => {
  initializeButtons();
}, 100);

// ONLINE/OFFLINE STATUS MONITORING

window.addEventListener('online', () => {
  console.log('Connection restored');
  syncMessagesWithFirestore();
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