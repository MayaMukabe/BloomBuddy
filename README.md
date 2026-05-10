# BloomBuddy

**Your personal companion for spiritual growth and emotional well-being.**

BloomBuddy is a faith-centered, AI-powered web app that provides personalized spiritual guidance, mood support, daily devotional practices, and curated resources — all in a safe, judgment-free space.

## Features

- **AI Spiritual Companion** — Four specialized conversation modes:
  - **Mood Check** — Compassionate emotional support
  - **Verse + Encouragement** — Biblical wisdom tailored to your situation
  - **Daily Practice** — Guided spiritual disciplines (prayer, gratitude, meditation)
  - **Spiritual Growth** — Deeper faith exploration
- **Curated Resources** — Books, apps, and websites for spiritual and mental wellness
- **Podcast Directory** — Faith, mindfulness, and mental health podcasts with direct Spotify links
- **User Profiles** — Personalized settings, avatar customization, and preference management
- **Reminders** — Customizable daily spiritual practice notifications
- **Conversation History** — Review and continue past conversations
- **PWA Support** — Install as a native app on any device

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML/CSS/JS (no framework) |
| Backend | Node.js + Express |
| AI | OpenRouter API (GPT-3.5 Turbo) |
| Auth | Firebase Authentication (Google, Email, Anonymous) |
| Database | Cloud Firestore |
| Hosting | Render (backend), Firebase Hosting (frontend) |

## Project Structure

```
BloomBuddy/
├── frontend/
│   ├── firebase-config.js    # Centralized Firebase configuration
│   ├── index.html            # Landing page + auth
│   ├── dashboard.html        # Main AI chat interface
│   ├── resources.html        # Curated resource library
│   ├── podcasts.html         # Podcast directory
│   ├── profile.html          # User profile & settings
│   ├── styles.css            # Base design system + tokens
│   ├── dashboard.css         # Dashboard-specific styles
│   ├── content-pages.css     # Resources/Podcasts styles
│   ├── profile.css           # Profile page styles
│   ├── script.js             # Landing page logic
│   ├── dashboard.js          # Chat + conversation logic
│   ├── content-pages.js      # Resource/podcast data + handlers
│   └── profile.js            # Profile management logic
├── backend/
│   ├── server.js             # Express API server
│   ├── .env.example          # Environment variable template
│   └── package.json
├── sw.js                     # Service Worker (PWA)
└── manifest.json             # PWA manifest
```

## Getting Started

### Prerequisites
- Node.js 18+
- An [OpenRouter](https://openrouter.ai/) API key
- A [Firebase](https://firebase.google.com/) project

### Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your API keys
npm install
npm start
```

### Environment Variables

| Variable | Description |
|---|---|
| `OPENROUTER_API_KEY` | Your OpenRouter API key |
| `FRONTEND_URL` | Frontend URL for CORS (e.g., `https://yourdomain.com`) |
| `PORT` | Server port (default: 3000) |

### Frontend Setup

The frontend is static HTML — serve it with any HTTP server:

```bash
cd frontend
npx http-server . -p 8080
```

Or deploy to Firebase Hosting, Netlify, or Vercel.

## Design Philosophy

- **Faith-centered but emotionally accessible** — Christian foundation without being preachy
- **Light minimalist aesthetic** — Clean, professional feel with Inter + Plus Jakarta Sans typography
- **Warm AI personality** — Speaks like a wise, caring friend, not a clinical therapist
- **Mobile-first responsive** — PWA-ready with safe area inset support

## License

MIT

---

*Built by the BloomBuddy team*