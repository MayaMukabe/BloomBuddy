// Dashboard functionality with Firebase Auth and ChatGPT integration

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

// Logout functionality
getEl('logoutBtn')?.addEventListener('click', async () => {
  try {
    await window.signOut(window.auth);
    window.location.href = 'index.html';
  } catch (error) {
    console.error('Logout error:', error);
    alert('Error signing out. Please try again.');
  }
});

// Chat Modal Management
const chatModal = getEl('chatModal');
const chatMessages = getEl('chatMessages');
const chatInput = getEl('chatInput');
const sendBtn = getEl('sendBtn');
const chatTitle = getEl('chatTitle');
const initialMessage = getEl('initialMessage');

let currentTopic = '';
let chatHistory = [];

// Topic-specific prompts and initial messages
const topicConfigs = {
  mood: {
    title: 'Mood Check',
    initialMessage: "Hello! I'm here to help you check in with your mood and emotional well-being. How are you feeling today?",
    systemPrompt: "You are a compassionate mental health assistant helping with mood checks. Be supportive, empathetic, and offer gentle guidance. Ask follow-up questions to understand their emotional state better."
  },
  verse: {
    title: 'Verse + Encouragement',
    initialMessage: "Welcome! I'm here to provide you with spiritual encouragement and meaningful verses. What's on your heart today?",
    systemPrompt: "You are a spiritual counselor providing biblical encouragement and verses. Be uplifting, faith-centered, and offer relevant scripture when appropriate. Focus on hope, peace, and God's love."
  },
  practice: {
    title: 'Daily Practice',
    initialMessage: "Hi! I'm here to help you with your daily spiritual practices. What would you like to focus on today?",
    systemPrompt: "You are a spiritual practice guide helping with daily spiritual disciplines like prayer, meditation, gratitude, and mindfulness. Provide practical, actionable advice for spiritual growth."
  },
  growth: {
    title: 'Spiritual Growth',
    initialMessage: "Hello! I'm here to support your spiritual growth journey. What area would you like to explore or develop?",
    systemPrompt: "You are a spiritual mentor focused on helping people grow in their faith and relationship with God. Provide wisdom, guidance, and encouragement for deeper spiritual development."
  }
};

// Open chat modal for specific topic
function initializeButtons() {
  const buttons = document.querySelectorAll('.dashboard-btn');
  console.log('Found buttons:', buttons.length);
  
  buttons.forEach((btn, index) => {
    console.log(`Button ${index}:`, btn.textContent, btn.getAttribute('data-topic'));
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const topic = btn.getAttribute('data-topic');
      console.log('Button clicked:', topic);
      openChatModal(topic);
    });
  });
}

// Initialize buttons when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeButtons);

// Also try to initialize buttons after a short delay as backup
setTimeout(initializeButtons, 100);

function openChatModal(topic) {
  console.log('Opening chat modal for topic:', topic);
  currentTopic = topic;
  const config = topicConfigs[topic];
  
  if (!config) {
    console.error('No config found for topic:', topic);
    return;
  }
  
  console.log('Config found:', config);
  chatTitle.textContent = config.title;
  initialMessage.textContent = config.initialMessage;
  
  // Clear previous chat history
  chatHistory = [];
  chatMessages.innerHTML = `
    <div class="message ai-message">
      <div class="message-content">
        <p id="initialMessage">${config.initialMessage}</p>
      </div>
    </div>
  `;
  
  chatModal.setAttribute('aria-hidden', 'false');
  console.log('Modal should be visible now');
  chatInput.focus();
}

// Close chat modal
document.addEventListener('click', (e) => {
  if (e.target.matches('[data-close]') || e.target.classList.contains('chat-modal')) {
    chatModal.setAttribute('aria-hidden', 'true');
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    chatModal.setAttribute('aria-hidden', 'true');
  }
});

// About Modal Management
const aboutModal = getEl('aboutModal');

// Open About modal when About link is clicked
document.addEventListener('click', (e) => {
  if (e.target.textContent === 'About') {
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

// Send message functionality
sendBtn?.addEventListener('click', sendMessage);
chatInput?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

async function sendMessage() {
  const message = chatInput.value.trim();
  if (!message) return;
  
  // Add user message to chat
  addMessageToChat(message, 'user');
  chatInput.value = '';
  
  // Show loading state
  const loadingMessage = addMessageToChat('Thinking...', 'ai', true);
  
  try {
    // Get AI response with fallback to mock responses
    const response = await getChatGPTResponseWithFallback(message, currentTopic);
    
    // Remove loading message and add real response
    loadingMessage.remove();
    addMessageToChat(response, 'ai');
    
  } catch (error) {
    console.error('Chat error:', error);
    loadingMessage.remove();
    
    // Provide more specific error messages
    let errorMessage = 'Sorry, I encountered an error. ';
    
    if (error.message.includes('401')) {
      errorMessage += 'Authentication failed. Please check the API key.';
    } else if (error.message.includes('429')) {
      errorMessage += 'Rate limit exceeded. Please wait a moment and try again.';
    } else if (error.message.includes('500')) {
      errorMessage += 'Server error. Please try again in a few moments.';
    } else if (error.message.includes('CORS')) {
      errorMessage += 'Network error. Please check your internet connection.';
    } else {
      errorMessage += `Error: ${error.message}`;
    }
    
    addMessageToChat(errorMessage, 'ai');
  }
}

function addMessageToChat(message, sender, isLoading = false) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${sender}-message`;
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  
  const messageP = document.createElement('p');
  messageP.textContent = message;
  if (isLoading) {
    messageP.style.fontStyle = 'italic';
    messageP.style.opacity = '0.7';
  }
  
  contentDiv.appendChild(messageP);
  messageDiv.appendChild(contentDiv);
  chatMessages.appendChild(messageDiv);
  
  // Scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  return messageDiv;
}

// OpenRouter API Integration
async function getChatGPTResponse(userMessage, topic) {
  const config = topicConfigs[topic];
  if (!config) throw new Error('Invalid topic');
  
  // Add user message to history
  chatHistory.push({ role: 'user', content: userMessage });
  
  // Prepare messages for API
  const messages = [
    { role: 'system', content: config.systemPrompt },
    ...chatHistory.slice(-10) // Keep last 10 messages for context
  ];
  
  // OpenRouter API key
  const API_KEY = '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';
  
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      'HTTP-Referer': window.location.origin, // Optional: for analytics
      'X-Title': 'BloomBuddy' // Optional: for analytics
    },
    body: JSON.stringify({
      model: 'openai/gpt-3.5-turbo', // Using GPT-3.5-turbo through OpenRouter
      messages: messages,
      max_tokens: 500,
      temperature: 0.7
    })
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('OpenRouter API Error:', response.status, errorData);
    throw new Error(`API request failed: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
  }
  
  const data = await response.json();
  
  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    console.error('Unexpected API response:', data);
    throw new Error('Unexpected response format from API');
  }
  
  const aiMessage = data.choices[0].message.content;
  
  // Add AI response to history
  chatHistory.push({ role: 'assistant', content: aiMessage });
  
  return aiMessage;
}

// Alternative: If you don't have OpenAI API key, you can use this mock response
async function getMockResponse(userMessage, topic) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const responses = {
    mood: [
      "I understand you're feeling that way. It's completely normal to have ups and downs. Would you like to talk more about what's contributing to these feelings?",
      "Thank you for sharing that with me. Remember that your feelings are valid. What would help you feel more supported right now?",
      "I hear you. Sometimes just acknowledging our emotions is the first step toward feeling better. What's one small thing that usually brings you comfort?"
    ],
    verse: [
      "Here's a verse that might encourage you: 'For I know the plans I have for you,' declares the Lord, 'plans to prosper you and not to harm you, to give you hope and a future.' - Jeremiah 29:11",
      "May this bring you peace: 'Cast all your anxiety on him because he cares for you.' - 1 Peter 5:7",
      "Remember: 'The Lord is close to the brokenhearted and saves those who are crushed in spirit.' - Psalm 34:18"
    ],
    practice: [
      "That's a wonderful area to focus on! Let's start with a simple 5-minute practice. Would you like to try a breathing exercise or a gratitude reflection?",
      "Great choice! I'd suggest starting small and building consistency. What time of day works best for you to practice?",
      "Excellent! Let me share a simple technique you can try right now. Are you in a quiet space where you can focus for a few minutes?"
    ],
    growth: [
      "That's an important area for spiritual development. What draws you to explore this particular aspect of your faith?",
      "I'm excited to help you grow in this area! What's your current understanding, and what would you like to learn more about?",
      "That's a beautiful journey you're on. What challenges or questions have you encountered in this area of growth?"
    ]
  };
  
  const topicResponses = responses[topic] || responses.mood;
  return topicResponses[Math.floor(Math.random() * topicResponses.length)];
}

// Fallback to mock responses if API fails
async function getChatGPTResponseWithFallback(userMessage, topic) {
  try {
    return await getChatGPTResponse(userMessage, topic);
  } catch (error) {
    console.warn('OpenRouter API failed, using mock response:', error.message);
    return await getMockResponse(userMessage, topic);
  }
}

// Uncomment the line below to always use mock responses instead of the real API
// async function getChatGPTResponse(userMessage, topic) { return await getMockResponse(userMessage, topic); }
