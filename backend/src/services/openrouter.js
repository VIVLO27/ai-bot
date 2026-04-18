/**
 * OpenRouter AI Service
 * AI fallback using OpenRouter's free LLM models
 */

const axios = require('axios');

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Free models on OpenRouter
const MODELS = [
  'meta-llama/llama-3.2-3b-instruct:free',
  'mistralai/mistral-7b-instruct:free',
  'google/gemma-2-9b-it:free',
];

const SYSTEM_PROMPT = `You are an intelligent, friendly AI chatbot assistant for a web application. 
You help users with questions, provide information, and have engaging conversations.
Keep responses concise (2-4 sentences), helpful, and conversational.
Use emojis occasionally to make responses friendly.
You are powered by NLP technologies including TF-IDF vectorization and cosine similarity for intent matching.
If asked about technical topics, explain them clearly and simply.
Never refuse to answer basic questions.`;

/**
 * Get AI response from OpenRouter
 */
async function getAIResponse(userMessage, conversationHistory = [], apiKey) {
  if (!apiKey) {
    return getSmartFallback(userMessage);
  }

  // Build conversation messages
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...conversationHistory.slice(-6), // Last 6 messages for context
    { role: 'user', content: userMessage },
  ];

  // Try each model in order
  for (const model of MODELS) {
    try {
      const response = await axios.post(
        OPENROUTER_API_URL,
        {
          model,
          messages,
          max_tokens: 256,
          temperature: 0.7,
          top_p: 0.9,
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:3000',
            'X-Title': 'AI Chatbot - NLP Research Project',
          },
          timeout: 15000,
        }
      );

      const content = response.data?.choices?.[0]?.message?.content;
      if (content && content.trim()) {
        return content.trim();
      }
    } catch (error) {
      const status = error.response?.status;
      console.warn(`[OpenRouter] Model ${model} failed (${status}):`, error.message);

      // If auth error, don't retry other models
      if (status === 401 || status === 403) {
        break;
      }
      // Continue to next model for other errors
    }
  }

  // All models failed - use smart fallback
  return getSmartFallback(userMessage);
}

/**
 * Smart rule-based fallback when AI API unavailable
 */
function getSmartFallback(message) {
  const lower = message.toLowerCase();

  // Tech questions
  if (lower.includes('blockchain') || lower.includes('crypto')) {
    return '💡 Blockchain is a distributed ledger technology that records transactions across many computers securely and transparently. It\'s the foundation of cryptocurrencies like Bitcoin and Ethereum.';
  }
  if (lower.includes('machine learning') || lower.includes('ml ')) {
    return '🤖 Machine Learning is a subset of AI where systems learn from data to improve performance without being explicitly programmed. It uses algorithms like regression, classification, and neural networks!';
  }
  if (lower.includes('python')) {
    return '🐍 Python is one of the most popular programming languages, known for its simplicity and versatility. It\'s widely used in AI/ML, web development, data science, and automation!';
  }
  if (lower.includes('javascript') || lower.includes('js')) {
    return '⚡ JavaScript is the language of the web! It runs in browsers and on servers (Node.js). It\'s essential for frontend development and is becoming increasingly important in AI/ML with TensorFlow.js!';
  }

  // General knowledge
  if (lower.includes('sun') && (lower.includes('far') || lower.includes('distance'))) {
    return '☀️ The Sun is approximately 149.6 million kilometers (93 million miles) from Earth on average. Light from the Sun takes about 8 minutes and 20 seconds to reach us!';
  }
  if (lower.includes('largest country')) {
    return '🗺️ Russia is the largest country in the world by area, covering approximately 17.1 million square kilometers — that\'s about 11% of Earth\'s total land area!';
  }
  if (lower.includes('population') && lower.includes('world')) {
    return '🌍 The world\'s population is approximately 8.1 billion people as of 2024, with the most populous countries being India and China, each with over 1.4 billion people!';
  }

  // Default intelligent responses
  const fallbacks = [
    `That's an interesting question! 🤔 While I process that through my NLP engine, could you try rephrasing? You can also ask me about weather, Wikipedia topics, math calculations, or general knowledge!`,
    `I'm analyzing your query using cosine similarity and intent classification... 🧠 I might need you to be more specific. Try asking about a specific topic, or type "help" to see what I can do!`,
    `Great question! My NLP engine is working on it. 🤖 For the best results, try asking things like "what is [topic]?", "tell me about [subject]", or "weather in [city]".`,
    `Interesting! I'm not 100% sure about that one. Try asking me something like "what is artificial intelligence?" or "weather in Mumbai" — I love those! 😊`,
  ];

  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

module.exports = { getAIResponse, getSmartFallback };
