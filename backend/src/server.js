require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');

const chatRouter = require('./routes/chat');

const app = express();
const PORT = process.env.PORT || 5000;
const IS_PROD = process.env.NODE_ENV === 'production';

// ===== Allowed Origins =====
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5175',
  'http://localhost:3000',
  'http://localhost:5176',
  'http://127.0.0.1:5173',
  'https://ai-bot-xi-peach.vercel.app',   // Production Vercel frontend
];

// Also allow any additional frontend URL from env var
if (process.env.FRONTEND_URL) {
  ALLOWED_ORIGINS.push(process.env.FRONTEND_URL);
}

// ===== Middleware =====

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (curl, Postman, mobile apps)
    if (!origin) return callback(null, true);
    // Allow any vercel.app subdomain
    if (origin.endsWith('.vercel.app') || ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('CORS: Origin not allowed'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Session — use secure cookies in production (HTTPS on Render)
app.use(session({
  secret: process.env.SESSION_SECRET || 'ai-chatbot-secret-key-2024',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: IS_PROD,       // HTTPS only in production
    httpOnly: true,
    sameSite: IS_PROD ? 'none' : 'lax', // 'none' needed for cross-site on Render+Vercel
    maxAge: 24 * 60 * 60 * 1000,
  },
}));

// Request logging
app.use((req, res, next) => {
  if (req.method !== 'OPTIONS') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  }
  next();
});

// ===== Routes =====

app.get('/', (req, res) => {
  res.json({ message: '🤖 NeuralChat AI Backend', status: 'online' });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    message: '🤖 AI Chatbot Backend is running!',
    version: '1.0.0',
    nlp: 'TF-IDF + Cosine Similarity',

    timestamp: new Date().toISOString(),
  });
});

app.get('/api/models', async (req, res) => {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      }
    });
    if (!response.ok) {
      throw new Error(`OpenRouter HTTP ${response.status}`);
    }
    const data = await response.json();
    
    // Sort models by pricing, prefer free and then by popularity/context length, etc., or just return as is
    // Let's return just a simplified list
    const models = data.data.map(model => ({
      id: model.id,
      name: model.name,
      context_length: model.context_length
    }));
    
    // Send top 50 models to not overwhelm the UI, or just send all
    res.json({ models });
  } catch (error) {
    console.error('[Models Route Error]', error);
    res.status(500).json({ error: 'Failed to fetch models' });
  }
});

app.use('/api/chat', chatRouter);

// ===== Error Handler =====
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.message);
  if (err.message.startsWith('CORS')) {
    return res.status(403).json({ error: 'CORS error', message: err.message });
  }
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// ===== Start Server =====
app.listen(PORT, () => {
  console.log('\n🚀 ============================');
  console.log(`🤖 NeuralChat Backend`);
  console.log(`🌐 Port: ${PORT} | Mode: ${IS_PROD ? 'Production' : 'Development'}`);
  console.log(`🔑 OpenRouter: ${process.env.OPENROUTER_API_KEY ? '✅ Connected' : '❌ Not set'}`);
  console.log(`📡 NLP Engine: TF-IDF + Cosine Similarity`);
  console.log('============================\n');
});

module.exports = app;
