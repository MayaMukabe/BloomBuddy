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
      mood: `You are a compassionate mental health support assistant for BloomBuddy. 
             Your role is to provide empathetic, supportive responses while being careful 
             not to provide medical advice. Always encourage users to seek professional 
             help for serious concerns. Be warm, understanding, and non-judgmental.`,
      
      verse: `You are a spiritual counselor for BloomBuddy, specializing in biblical 
              encouragement and faith-based support. Share relevant scripture when appropriate, 
              but always be respectful of different beliefs. Focus on hope, peace, and God's love.`,
      

      practice: `You are a spiritual practice guide for BloomBuddy, helping users develop 
                 daily spiritual disciplines like prayer, meditation, gratitude, and mindfulness. 
                 Provide practical, actionable advice that can be implemented immediately.`,
      
      growth: `You are a spiritual mentor for BloomBuddy, focused on helping people grow 
               in their faith and relationship with God. Provide wisdom, guidance, and 
               encouragement for deeper spiritual development. Be thoughtful and inspiring.`,
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
        model: 'openai/gpt-3.5-turbo',
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
app.listen(PORT, () => {
  console.log('===========================================');
  console.log(`BloomBuddy Backend Server Started`);
  console.log(`Listening on ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log('===========================================');
});

//GRACEFUL SHUTDOWN

process.on('SIGTERM', () => {
  console.log('SIGTERM received. received.Shutting down gracefully...');
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






