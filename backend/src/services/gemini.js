/**
 * Gemini AI Service
 * Uses the Google Gemini API directly instead of OpenRouter.
 */

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

const MODEL_MAPPING = {
  'gemini-flash': 'gemini-2.5-flash',
  'gemini-pro': 'gemini-2.5-pro',
  'gemini-2.5-flash': 'gemini-2.5-flash',
  'gemini-2.5-pro': 'gemini-2.5-pro',
};

const DEFAULT_MODEL = 'gemini-2.5-flash';

function buildSystemPrompt(customPrompt) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  });

  const dateContext = `\n\nIMPORTANT — Current date and time: ${dateStr} at ${timeStr}.\nAlways use this date when answering questions about today, current events, ages, deadlines, or anything time-sensitive.\nIf you don't have information about a very recent event (after your training cutoff), say so honestly.`;

  if (customPrompt) {
    return customPrompt + dateContext;
  }

  return `You are an intelligent, friendly AI chatbot assistant for a web application.\nYou help users with questions, provide information, and have engaging conversations.\nKeep responses helpful, structured, and conversational. Use Markdown formatting when appropriate.\nYou are powered by Google Gemini and an NLP routing engine.\nIf asked about technical topics, explain them clearly and simply.` + dateContext;
}

function normalizeHistory(conversationHistory = [], userMessage = '') {
  const contents = [];

  for (const entry of conversationHistory.slice(-8)) {
    const role = entry.role === 'assistant' ? 'model' : 'user';
    const text = typeof entry.content === 'string'
      ? entry.content
      : entry.content?.text || '';

    if (text && text.trim()) {
      contents.push({ role, parts: [{ text }] });
    }
  }

  if (userMessage && userMessage.trim()) {
    contents.push({ role: 'user', parts: [{ text: userMessage }] });
  }

  return contents;
}

async function getAIResponse(userMessage, conversationHistory = [], apiKey, options = {}) {
  const selectedModelId = options.model || 'gemini-flash';
  const model = MODEL_MAPPING[selectedModelId] || selectedModelId || DEFAULT_MODEL;
  const systemPrompt = buildSystemPrompt(options.systemPrompt);
  const temperature = options.temperature !== undefined ? parseFloat(options.temperature) : 0.7;
  const image = options.image || null;
  const onChunk = options.onChunk || null;

  if (!apiKey) {
    console.warn('[Gemini] No API key provided, using local smart fallback.');
    const fallbackText = getSmartFallback(userMessage);
    if (onChunk) {
      const words = fallbackText.split(' ');
      for (const word of words) {
        onChunk(word + ' ');
        await new Promise((r) => setTimeout(r, 35));
      }
      return '';
    }
    return fallbackText;
  }

  const payload = {
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    generationConfig: {
      temperature,
      topP: 0.9,
      maxOutputTokens: 1500,
    },
    contents: normalizeHistory(conversationHistory, userMessage),
  };

  if (image) {
    payload.contents.push({
      role: 'user',
      parts: [
        { text: userMessage },
        { inlineData: { mimeType: 'image/jpeg', data: image.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '') } }
      ],
    });
  }

  try {
    const response = await fetch(`${GEMINI_API_URL}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini HTTP ${response.status}: ${errorText}`);
    }

    const json = await response.json();
    const content = json.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || '')
      .join('')
      .trim();

    if (!content) {
      throw new Error('Empty response from Gemini model.');
    }

    if (onChunk) {
      for (const chunk of chunkText(content)) {
        onChunk(chunk);
        await new Promise((r) => setTimeout(r, 12));
      }
      return '';
    }

    return content;
  } catch (error) {
    console.error(`[Gemini API Error] Model: ${model}`, error.message);

    const fallbackText = getSmartFallback(userMessage);
    if (onChunk) {
      onChunk(fallbackText);
      return '';
    }
    return fallbackText;
  }
}

function chunkText(text) {
  const words = text.split(/(\s+)/);
  const chunks = [];
  let current = '';

  for (const word of words) {
    if (current.length + word.length > 120) {
      chunks.push(current);
      current = word;
    } else {
      current += word;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

function getSmartFallback(message) {
  const lower = message.toLowerCase();

  if (lower.includes('blockchain') || lower.includes('crypto')) {
    return '💡 Blockchain is a distributed ledger technology that records transactions across many computers securely and transparently. It\'s the foundation of cryptocurrencies like Bitcoin and Ethereum.';
  }
  if (lower.includes('machine learning') || lower.includes('ml ')) {
    return '🤖 Machine Learning is a subset of AI where systems learn from data to improve performance without being explicitly programmed. It uses algorithms like regression, classification, and neural networks.';
  }
  if (lower.includes('python')) {
    return '🐍 Python is one of the most popular programming languages, known for its simplicity and versatility. It\'s widely used in AI/ML, web development, data science, and automation!';
  }
  if (lower.includes('javascript') || lower.includes('js')) {
    return '⚡ JavaScript is the language of the web! It runs in browsers and on servers (Node.js). It\'s essential for frontend development and is increasingly important in AI/ML tooling.';
  }
  if (lower.includes('sun') && (lower.includes('far') || lower.includes('distance'))) {
    return '☀️ The Sun is approximately 149.6 million kilometers (93 million miles) from Earth on average. Light from the Sun takes about 8 minutes and 20 seconds to reach us!';
  }
  if (lower.includes('largest country')) {
    return '🗺️ Russia is the largest country in the world by area, covering approximately 17.1 million square kilometers — about 11% of Earth\'s total land area!';
  }
  if (lower.includes('population') && lower.includes('world')) {
    return '🌍 The world\'s population is approximately 8.1 billion people as of 2024, with India and China being the most populous countries.';
  }

  const fallbacks = [
    'That\'s an interesting question! 🤔 While I process that through my NLP engine, could you try rephrasing? You can also ask me about weather, Wikipedia topics, math calculations, or general knowledge.',
    'I\'m analyzing your query using cosine similarity and intent classification... 🧠 I might need you to be more specific. Try asking about a specific topic, or type "help" to see what I can do.',
    'Great question! My NLP engine is working on it. 🤖 For the best results, try asking things like "what is [topic]?" or "weather in [city]".',
    'Interesting! I\'m not 100% sure about that one. Try asking me something like "what is artificial intelligence?" or "weather in Mumbai" — I love those! 😊',
  ];

  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

module.exports = { getAIResponse, getSmartFallback };
