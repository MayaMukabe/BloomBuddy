require("dotenv").config();

const express = require("express");

const cors = require("cors");

const helmet = require("helmet");

const morgan = require("morgan");

const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require('express-rate-limit');

const app = express();

const PORT = process.env.PORT || 3001;

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        scriptSrc: ["'self'", "https://www.gstatic.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
      },
    },
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

//CHAT ENDPOINT - MAIN FUNCTIONALITY
app.post('/api/chat', chatLimiter, async (req, res) => {
  console.log('Chat request received:', new Date().toISOString());

  try {
    //Validate Request

    //Extract and validate required fields from request body
    const { messages, topic, userId } = req.body;

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
    };

    //Build the complete message array with system prompt
    const completeMessages = [
      {
        role: 'system',
        content: systemPrompts[topic] + '\n\nalways be respectful, helpful, and supportive. Keep resonses  concise but meaningful.',
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

    //Send the response back to the client
    res.status(200).json({
      success: true,
      message: aiMessage,
      usage: data.usage || null, //Includes token usage if availabe
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

//404 HANDLER TO CATCH ALL UNFINED ROUTES
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message:`The endpoint ${req.method} ${req.path} does not exist`,
  });
});

//GLOBAL ERROR HANDLER

app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  //Dont leak arror details in production
  const message = process.env.NODE_ENV === 'production'
    ? 'An unexpected error occurred'
    : err.message;

  res.status(err.status || 500).json({
    error: 'Server error',
    message: message,
  });
});

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






