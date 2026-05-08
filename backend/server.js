require("dotenv").config();

const express = require("express");

const cors = require("cors");

const helmet = require("helmet");

const morgan = require("morgan");

const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require('express-rate-limit');
const { requestLogger, globalErrorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();

const PORT = process.env.PORT || 3001;

// ========== TOKEN BUDGET SYSTEM ==========
// In-memory daily token tracker per user
// Resets daily. For multi-server: swap to Redis/Firestore
const DAILY_TOKEN_BUDGET = parseInt(process.env.DAILY_TOKEN_BUDGET) || 25000;
const tokenUsage = {}; // { 'userId:YYYY-MM-DD': { tokens: N, requests: N } }

function getUsageKey(userId) {
  const today = new Date().toISOString().split('T')[0];
  return `${userId}:${today}`;
}

function getUserUsage(userId) {
  const key = getUsageKey(userId);
  if (!tokenUsage[key]) {
    tokenUsage[key] = { tokens: 0, requests: 0 };
  }
  return tokenUsage[key];
}

function recordTokenUsage(userId, tokensUsed) {
  const usage = getUserUsage(userId);
  usage.tokens += tokensUsed;
  usage.requests += 1;
}

function getRemainingBudget(userId) {
  const usage = getUserUsage(userId);
  return Math.max(0, DAILY_TOKEN_BUDGET - usage.tokens);
}

// Clean up stale entries daily (prevent memory leak)
setInterval(() => {
  const today = new Date().toISOString().split('T')[0];
  for (const key of Object.keys(tokenUsage)) {
    if (!key.endsWith(today)) {
      delete tokenUsage[key];
    }
  }
}, 60 * 60 * 1000); // Every hour

// Build CSP directives
const cspDirectives = {
  // Default source - only allow same origin
  defaultSrc: ["'self'"],
  
  // Script sources - allow same origin, Firebase, and DOMPurify CDN
  // Note: 'unsafe-inline' is needed for Firebase initialization, but CSP still provides XSS protection
  // by blocking unauthorized script execution from untrusted sources
  scriptSrc: [
    "'self'",
    "https://www.gstatic.com",
    "https://cdnjs.cloudflare.com",
    "'unsafe-inline'" // Required for Firebase, but CSP still prevents XSS from untrusted sources
  ],
  
  // Style sources - allow same origin, Google Fonts, and inline styles
  styleSrc: [
    "'self'",
    "'unsafe-inline'", // Needed for dynamic styling
    "https://fonts.googleapis.com"
  ],
  
  // Font sources - allow same origin and Google Fonts
  fontSrc: [
    "'self'",
    "https://fonts.gstatic.com",
    "data:" // Allow data URIs for fonts if needed
  ],
  
  // Image sources - allow same origin, data URIs, and Firebase storage
  imgSrc: [
    "'self'",
    "data:",
    "https:",
    "blob:" // Allow blob URLs for images
  ],
  
  // Connect sources - allow API calls to backend and Firebase services
  connectSrc: [
    "'self'",
    "https://openrouter.ai", // Backend API calls to OpenRouter
    "https://bloombuddy-backend.onrender.com", // Production backend
    "http://localhost:3001", // Development backend
    "http://127.0.0.1:3001", // Alternative localhost
    // Firebase services
    "https://identitytoolkit.googleapis.com",
    "https://securetoken.googleapis.com",
    "https://firestore.googleapis.com",
    "https://firebasestorage.googleapis.com",
    "https://*.firebaseio.com",
    "https://*.googleapis.com",
    "wss://*.firebaseio.com", // WebSocket connections for Firebase
    "https://bloombuddy-id.firebaseapp.com",
    "https://bloombuddy-id.firebasestorage.app"
  ],
  
  // Frame sources - restrict to prevent clickjacking
  frameSrc: [
    "'self'",
    "https://www.google.com" // If using Google sign-in iframe
  ],
  
  // Object sources - deny embedded objects
  objectSrc: ["'none'"],
  
  // Media sources - allow same origin for audio/video
  mediaSrc: ["'self'"],
  
  // Worker sources - allow service workers from same origin
  workerSrc: [
    "'self'",
    "blob:" // Allow blob URLs for service workers
  ],
  
  // Manifest source - allow same origin for web app manifest
  manifestSrc: ["'self'"],
  
  // Form actions - restrict form submissions to same origin
  formAction: ["'self'"],
  
  // Base URI - prevent base tag injection
  baseUri: ["'self'"],
};

// Add upgradeInsecureRequests in production only
if (process.env.NODE_ENV === 'production') {
  cspDirectives.upgradeInsecureRequests = [];
}

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: cspDirectives,
      // Report violations to a reporting endpoint (optional but recommended)
      reportOnly: false, // Set to true for testing CSP without blocking
    },
    // Additional security headers
    crossOriginEmbedderPolicy: false, // Set to true if you don't need to embed external resources
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin resources
  })
);

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://127.0.0.1:5500', 
  'http://localhost:5500', 
  'http://localhost:3000'
];

//CORS CONFIGURATION
app.use(cors({
  //TODO REPLACE WITH ACTUAL FRONTEND URL
  origin: allowedOrigins,
  credentials: true, //Allow cookies to be sent
  methods: ['GET', 'POST', 'OPTIONS'], //Allowed HTTP methods
  allowedHeaders: ['Content-Type', 'Authorization'], //Alowed Headers
}));

//Body Parser to read JSON from request bodies
app.use(express.json({ limit: '10mb'})); //Limit to prevent massive payloads

//URL Encoded Parser to read from data
app.use(express.urlencoded({ extended: true, limit: '10mb'}));

//Request Logger to log all request in development
if (process.env.NODE_ENV !== 'production'){
  app.use(morgan('dev'));
}
// Structured request logger (all environments)
app.use(requestLogger);

//RATE LIMITING CONFIGURATION

//General rate limit for all API endpoints
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, //15 minute window
  max: 100, //maximum 100 request per window
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, //Return rate limit info in headers
  legacyHeaders: false,

})

//Stricter limit for chat endpoint
const chatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1-minute window
  max: 10, // Maximum 10 chat requests per minute
  message: 'Too many chat requests. Please wait a moment before sending another message.',
  skipSuccessfulRequests: false,
  keyGenerator: (req) => {
    // Use helper for IPv6-safe IPs
    return req.userId || ipKeyGenerator(req);
  },
});


//Even stricter limit for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, //15 minute window
  max: 5,
  message: 'Too many authentication attempts. Please try again later.',
  skipFailedRequests: false, 
});

//Apply genral limiter to all routes
app.use('/api', generalLimiter);

//HEALTH CHECK ENDPOINT
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// VERSE OF THE DAY ENDPOINT
const DAILY_VERSES = [
  { text: "The Lord is my shepherd; I shall not want.", ref: "Psalm 23:1", theme: "peace" },
  { text: "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future.", ref: "Jeremiah 29:11", theme: "hope" },
  { text: "Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.", ref: "Joshua 1:9", theme: "courage" },
  { text: "Cast all your anxiety on him because he cares for you.", ref: "1 Peter 5:7", theme: "peace" },
  { text: "I can do all things through Christ who strengthens me.", ref: "Philippians 4:13", theme: "strength" },
  { text: "The Lord is close to the brokenhearted and saves those who are crushed in spirit.", ref: "Psalm 34:18", theme: "comfort" },
  { text: "Trust in the Lord with all your heart and lean not on your own understanding.", ref: "Proverbs 3:5", theme: "faith" },
  { text: "But those who hope in the Lord will renew their strength. They will soar on wings like eagles.", ref: "Isaiah 40:31", theme: "hope" },
  { text: "Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God.", ref: "Philippians 4:6", theme: "peace" },
  { text: "And we know that in all things God works for the good of those who love him.", ref: "Romans 8:28", theme: "faith" },
  { text: "The Lord is my light and my salvation — whom shall I fear?", ref: "Psalm 27:1", theme: "courage" },
  { text: "Come to me, all you who are weary and burdened, and I will give you rest.", ref: "Matthew 11:28", theme: "comfort" },
  { text: "He gives strength to the weary and increases the power of the weak.", ref: "Isaiah 40:29", theme: "strength" },
  { text: "The peace of God, which transcends all understanding, will guard your hearts and your minds.", ref: "Philippians 4:7", theme: "peace" },
  { text: "When I am afraid, I put my trust in you.", ref: "Psalm 56:3", theme: "faith" },
  { text: "God is our refuge and strength, an ever-present help in trouble.", ref: "Psalm 46:1", theme: "strength" },
  { text: "Be still, and know that I am God.", ref: "Psalm 46:10", theme: "peace" },
  { text: "The Lord your God is with you, the Mighty Warrior who saves. He will take great delight in you.", ref: "Zephaniah 3:17", theme: "love" },
  { text: "For God has not given us a spirit of fear, but of power and of love and of a sound mind.", ref: "2 Timothy 1:7", theme: "courage" },
  { text: "Weeping may stay for the night, but rejoicing comes in the morning.", ref: "Psalm 30:5", theme: "hope" },
  { text: "Have I not commanded you? Be strong and courageous. Do not be afraid.", ref: "Joshua 1:9", theme: "courage" },
  { text: "The Lord will fight for you; you need only to be still.", ref: "Exodus 14:14", theme: "faith" },
  { text: "He heals the brokenhearted and binds up their wounds.", ref: "Psalm 147:3", theme: "comfort" },
  { text: "Even though I walk through the darkest valley, I will fear no evil, for you are with me.", ref: "Psalm 23:4", theme: "courage" },
  { text: "Let all that you do be done in love.", ref: "1 Corinthians 16:14", theme: "love" },
  { text: "This is the day that the Lord has made; let us rejoice and be glad in it.", ref: "Psalm 118:24", theme: "gratitude" },
  { text: "Give thanks to the Lord, for he is good; his love endures forever.", ref: "Psalm 107:1", theme: "gratitude" },
  { text: "The joy of the Lord is your strength.", ref: "Nehemiah 8:10", theme: "strength" },
  { text: "Therefore, if anyone is in Christ, the new creation has come: The old has gone, the new is here!", ref: "2 Corinthians 5:17", theme: "hope" },
  { text: "But the fruit of the Spirit is love, joy, peace, forbearance, kindness, goodness, faithfulness.", ref: "Galatians 5:22", theme: "growth" },
];

app.get('/api/verse-of-the-day', generalLimiter, (req, res) => {
  const now = new Date();
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
  const verse = DAILY_VERSES[dayOfYear % DAILY_VERSES.length];

  res.status(200).json({
    success: true,
    verse: verse.text,
    reference: verse.ref,
    theme: verse.theme,
    date: now.toISOString().split('T')[0],
  });
});

//CHAT ENDPOINT - MAIN FUNCTIONALITY
app.post('/api/chat', chatLimiter, async (req, res) => {
  console.log('Chat request received:', new Date().toISOString());

  try {
    //Validate Request

    //Extract and validate required fields from request body
    const { messages, topic, userId, userContext } = req.body;

    // Check token budget before processing
    const effectiveUserId = userId || req.ip || 'anonymous';
    const remaining = getRemainingBudget(effectiveUserId);
    if (remaining <= 0) {
      console.warn(`Token budget exceeded for user: ${effectiveUserId}`);
      return res.status(429).json({
        error: 'Daily limit reached',
        message: 'You\'ve reached your daily conversation limit. Your budget resets at midnight. Come back tomorrow! 🌅',
        budgetExceeded: true,
        remaining: 0,
      });
    }

    //check if messsages array exists and has content
    if (!messages || !Array.isArray(messages) || messages.length ===0){
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Message array is required and cannot be empty',
      });
    }

    //validate message structure and content length
    for (const message of messages){
      //Each role must have a role and content
      if(!message.role || !message.content){
        return res.status(400).json({
          error: 'Invalid message format',
          message: 'Each message must have role and content',
        });
      }

      //Prevent extremely long messages
      if(message.content.length > 4000){
        return res.status(400).json({
          error: 'Message too long',
          message: 'Individual messages cannot exceed 4000 characters',
        });
      }

      //check for potential prompt injection attempts
      const suspiciousPatterns = [
        /ignore previous instructions/i,
        /disregard all prior/i,
        /system:/i,
        /\[INST\]/i,
      ];

      for (const pattern of suspiciousPatterns){
        if(pattern.test(message.content)){
          console.warn(`Potential prompt injection detected from user ${userId || 'anonymous'}`);
          return res.status(400).json({
            error: 'Invalid content',
            message: 'Your message contains restricted patterns',
          });
        }
      }
    }

    //CHECK API KEY

    //Make sure we have the OpenRouter API Key
    if (!process.env.OPENROUTER_API_KEY){
      console.error('OpenRouter API Key not configured');
      return res.status(500).json({
        error: 'Server configuration error',
        message: 'Chat service is not properly configured',
      });
    }


    //PREPARE OPENROUTER REQUEST
    const systemPrompts = {
      mood: `You are BloomBuddy, a compassionate and wise companion. Your voice is warm, gentle, and deeply empathetic.

             **Your Core Directives:**
             1.  **Introduce Yourself:** In your first response, introduce yourself as BloomBuddy.
             2.  **Provide Deep, Empathetic Responses:** Your responses should be thoughtful, detailed (2-3 paragraphs), and show genuine understanding.
             3.  **Strictly Follow the Mood Check Logic:**
                 * **If the user mentions feeling anxious or worried:**
                     * Acknowledge their feeling: "I hear that you're feeling anxious right now. That worry you're carrying doesn't have to be carried alone."
                     * Share the verse: "Therefore do not worry about tomorrow, for tomorrow will worry about itself. Each day has enough trouble of its own." - Matthew 6:34
                     * Offer encouragement: "Anxiety often grows when we focus on 'what if' scenarios. God invites you to focus on today, this moment, and trust Him with tomorrow."
                     * Suggest next steps clearly: "Would you like to [Pray for Peace Now], [Write My Worries Down], or try a [3-Minute Calm Exercise]?"
                 * **If the user mentions feeling sad or down:**
                     * Acknowledge their feeling: "I can feel the heaviness you're carrying. Sadness is part of being human, and it's okay to not be okay right now."
                     * Share the verse: "He heals the brokenhearted and binds up their wounds." - Psalm 147:3
                     * Offer encouragement: "Even in darkness, you are not forgotten. God sees your pain and is close to you in this moment. Healing often happens slowly, but it does happen."
                     * Suggest next steps clearly: "Would you like to [Get Comfort Verses], [Read About God's Love], or [Practice Small Gratitude]?"
                 * **If the user is stressed or overwhelmed:**
                     * Acknowledge their feeling: "It sounds like life feels like too much right now. Let's take this one breath, one step at a time."
                     * Share the verse: "Cast your cares on the Lord and he will sustain you; he will never let the righteous be shaken." - Psalm 55:22
                     * Offer encouragement: "When everything feels urgent, remember that you don't have to solve everything today. Give yourself permission to prioritize and rest."
                     * Suggest next steps clearly: "Would you like to [Take 5 Deep Breaths], get help to [Prioritize], or [Pray for Strength]?"
             4.  **Never give medical advice.**`,
      
      verse: `You are BloomBuddy, a source of spiritual light and encouragement.

             **Your Core Directives:**
             1.  **Introduce Yourself:** In your first response, introduce yourself as BloomBuddy.
             2.  **Follow the Verse & Encouragement Structure:** When a user asks for a verse about a specific feeling (e.g., fear, strength), you must structure your response exactly as follows:
                 * **Empathetic Opening:** Start by acknowledging their feeling. For fear: "Fear has a way of making everything seem bigger than it is. But you have access to a courage that's greater than any fear." For strength: "You're looking for strength, and that takes courage in itself. Real strength isn't about being tough - it's about knowing where your help comes from."
                 * **Main Verse:** Provide the designated verse. For fear, use Joshua 1:9. For strength, use Philippians 4:13.
                 * **Explanation:** Explain the verse's context and meaning. For Joshua 1:9: "God spoke these words to Joshua when he was about to face his biggest challenge... The same God who was with Joshua is with you today." For Philippians 4:13: "Paul wrote this while in prison, facing incredible hardship. His strength didn't come from his circumstances - it came from his connection to Christ."
                 * **Reflection Question:** Ask the specific reflection question. For fear: "What would you do if you knew you couldn't fail?" For strength: "Where in your life do you need God's strength most right now?"
                 * **Follow-up Options:** List the specific follow-up options provided in the user flow document.`,

      practice: `You are BloomBuddy, a gentle guide for daily spiritual practice.

              **Your Core Directives:**
             1.  **Introduce Yourself:** Begin your first message by introducing yourself as BloomBuddy.
             2.  **Follow the Daily Practice Logic:**
                 * **For Gratitude:**
                     * Start with: "Gratitude is like sunlight for the soul. Let's find some light together."
                     * Instruct: "Think about your day so far. Even in difficult times, there are usually small things we can appreciate."
                     * Prompt: "What's one simple thing you're grateful for today? For example: [Waking up this morning], [Having shelter], or [Someone who cares about me]."
                     * On completion, respond with: "Beautiful. Psalm 100:4 says 'Enter his gates with thanksgiving and his courts with praise.' Thank you for practicing gratitude today."
                 * **For Morning Prayer:**
                     * Start with: "Starting your day with prayer is like putting on spiritual armor. Let's pray together."
                     * Guide the user through the simple, line-by-line prayer provided in the plan, asking for an "Amen" or "Yes" after each line.`,
      
      growth: `You are BloomBuddy, a wise and encouraging mentor for the path of spiritual growth.

              **Your Core Directives:**
             1.  **Introduce Yourself:** Start your first response by introducing yourself as BloomBuddy.
             2.  **Follow the Spiritual Growth Logic:**
                 * **For Building Faith:**
                     * Teaching: "Faith isn't about having all the answers. Hebrews 11:1 says faith is 'confidence in what we hope for and assurance about what we do not see.'"
                     * Real Example: "Think about sitting in a chair. You don't analyze the wood and engineering - you simply trust it will hold you. That's faith in action."
                     * Growth Challenge: "This week, try writing down one way you see God's faithfulness each day."
                 * **For Finding Forgiveness:**
                     * Teaching: "Ephesians 4:32 says 'Be kind and compassionate to one another, forgiving each other, just as in Christ God forgave you.'"
                     * Truth: "Forgiveness doesn't mean what happened was okay. It means you're choosing freedom over bitterness."
                     * Application: "Start by asking God to help you want to forgive."`,

      journal: `You are BloomBuddy, offering a gentle spiritual reflection on a journal entry.

               **Your Core Directives:**
              1.  Do NOT introduce yourself - the user already knows you.
              2.  Read the user's journal entry carefully and reflect on it with warmth and empathy.
              3.  Keep your reflection to 2-3 sentences max. Be brief and meaningful.
              4.  Include one relevant Bible verse that connects to the emotion or theme in their entry.
              5.  End with a short, encouraging thought - not a question.
              6.  Never give advice unless asked. Simply reflect and encourage.`,
    };

    // Build context string from userContext (if provided)
    let contextString = '';
    if (userContext) {
      const parts = [];
      if (userContext.userName) parts.push(`The user's name is ${userContext.userName}.`);
      if (userContext.recentMoodKeywords && userContext.recentMoodKeywords.length > 0) {
        parts.push(`They've recently expressed feelings of: ${userContext.recentMoodKeywords.join(', ')}.`);
      }
      if (userContext.recentTopics && userContext.recentTopics.length > 0) {
        const topicLabels = { mood: 'mood check', verse: 'verse encouragement', practice: 'daily practice', growth: 'spiritual growth', journal: 'journaling' };
        const labels = userContext.recentTopics.map(t => topicLabels[t] || t);
        parts.push(`Their recent conversations have been about: ${labels.join(', ')}.`);
      }
      if (userContext.conversationCount) {
        parts.push(`They've had ${userContext.conversationCount} conversations with you so far.`);
      }
      if (parts.length > 0) {
        contextString = '\n\nUSER CONTEXT (reference naturally, don\'t list this back to them):\n' + parts.join(' ');
      }
    }

    //Build the complete message array with system prompt
    const completeMessages = [
      {
        role: 'system',
        content: systemPrompts[topic] + '\n\nIMPORTANT GUIDELINES:\n- Keep responses to 2-3 short paragraphs unless the user asks you to elaborate.\n- Speak like a wise, caring friend — not a therapist reading from a manual.\n- Be grounded in faith but never preachy or aggressive. Let scripture feel like a gentle invitation, not a lecture.\n- Avoid bullet-point lists in your first response. Use natural, flowing language.\n- Never start with "I understand" or "That\'s a great question." Be genuine and specific to what the user actually said.\n- If the user shares something heavy, sit with them first before offering advice.' + contextString,
      },
      ...messages,// add all user mesages
    ];

    //MAKE API REQUEST TO OPENROUTER
    async function fetchWithRetry(url, options, retries = 2, timeout = 20000) {
      for (let i = 0; i <= retries; i++) {
        try {
          const controller = new AbortController();
          const id = setTimeout(() => controller.abort(), timeout);
          const response = await fetch(url, { ...options, signal: controller.signal });
          clearTimeout(id);
          return response;
        } catch (err) {
          if (i === retries) throw err;
          console.warn(`Fetch failed, retrying... (${i + 1}/${retries})`);
        }
      }
    }

    const openRouterResponse = await fetchWithRetry('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:3000',
        'X-Title': 'BloomBuddy',
      },
      body: JSON.stringify({
        model: "openai/gpt-3.5-turbo",
        messages: completeMessages,
        max_tokens: 500,
        temperature: 0.7,
        top_p: 0.9,
        frequency_penalty: 0.3,
        presence_penalty: 0.3,
      }),
    });

    //HANDLE OPENROUTER RESPONSE

    //check if the request was successful
    if(!openRouterResponse.ok){
      const errorData = await openRouterResponse.json().catch(() => ({}));
      console.error('OpenRouter Api error:', openRouterResponse.status, errorData);

      //Handle specific error codes
      if (openRouterResponse.status === 429){
        return res.status(429).json({
          error: 'Rate Limited',
          message: 'Chat service is temporarily unavailable due to high demand. Please try again in a moment.',
        });
      }

      if (openRouterResponse.status === 401) {
        console.error('Invalid OpenRouter API key');
        return res.status(500).json({
          error: 'Authentication error',
          message: 'Chat service authentication failed',
        });
      }

      //Generic error response
      return res.status(500).json({
        error: 'Chat service error',
        message: 'Unable to process your message at this time',
      });
    }

    //Parse the response
    const data = await openRouterResponse.json();

    //Validate response structure
    if (!data.choices || !data.choices[0] || !data.choices[0].message){
      console.error('Unexpected OpenRouter response structure:', data);
      return res.status(500).json({
        error: 'Invalid response',
        message: 'Received unexpected response from chat service',
      });
    }

    //SEND RESPONSE TO CLIENT

    //extract AI's message
    const aiMessage = data.choices[0].message.content;
    console.log(`Chat request completed sucessfully for topic: ${topic}`);

    // Track token usage
    const tokensUsed = data.usage?.total_tokens || 0;
    const effectiveUserIdForTracking = userId || req.ip || 'anonymous';
    if (tokensUsed > 0) {
      recordTokenUsage(effectiveUserIdForTracking, tokensUsed);
      console.log(`Tokens used: ${tokensUsed}, Remaining: ${getRemainingBudget(effectiveUserIdForTracking)}`);
    }

    //Send the response back to the client
    res.status(200).json({
      success: true,
      message: aiMessage,
      usage: data.usage || null, //Includes token usage if availabe
      remaining: getRemainingBudget(effectiveUserIdForTracking),
      timestamp: new Date().toISOString(),
    });
    } catch (error){
      //ERROR HANDLING
      console.error('Chat endpoint error:', error);
      //Don't expose internal error details to client
      res.status(500).json({
        error:'internal server error',
        message: 'An unexpected error occurred. Please try again later.',
      });
    }
});

// USAGE CHECK ENDPOINT
app.get('/api/usage', generalLimiter, (req, res) => {
  const userId = req.query.userId || req.ip || 'anonymous';
  const usage = getUserUsage(userId);
  const remaining = getRemainingBudget(userId);

  res.status(200).json({
    success: true,
    tokensUsed: usage.tokens,
    requestsToday: usage.requests,
    remaining: remaining,
    dailyBudget: DAILY_TOKEN_BUDGET,
    percentUsed: Math.round((usage.tokens / DAILY_TOKEN_BUDGET) * 100),
  });
});

//FIREBASE AUTH VERICATION ENDPOINT
app.post('/api/verify-auth', authLimiter, async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken){
      return res.status(400).json({
        error: 'Missing Token',
        message: 'Authentication token is required',
      });
    }

    //TODO VERIFY THE FIREABSE TOKEN
    res.status(200).json({
      valid: true, 
      message: 'Token verification not yet implemented',
    });
  } catch (error){
    console.error('Auth verification error:', error);
    res.status(500).json({
      error: 'Verification failed',
      message: 'Unable to verify authentication',
    });
  }
});

//404 HANDLER + GLOBAL ERROR HANDLER
app.use(notFoundHandler);
app.use(globalErrorHandler);

//START SERVER
const server = app.listen(PORT, () => {
  console.log('===========================================');
  console.log(`BloomBuddy Backend Server Started`);
  console.log(`Listening on ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log('===========================================');
});

//GRACEFUL SHUTDOWN

process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server Closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});






