/**
 * OpenRouter AI Service
 * Supports multi-model execution, streaming responses, and multimodal (vision) input.
 */

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Curated model mapping — ALL FREE models (no credits required)
const MODEL_MAPPING = {
  'auto-free':    'openrouter/free',                        // Free tier Auto Router
  'gemini-flash':  'google/gemini-2.5-flash:free',          // Free tier Gemini 2.5 Flash
  'gemini-pro':   'google/gemini-2.5-pro:free',             // Free tier Gemini 2.5 Pro
  'deepseek-r1':  'deepseek/deepseek-r1:free',              // Free DeepSeek R1 reasoning
  'llama-3.3':    'meta-llama/llama-3.3-70b-instruct:free', // Free Llama 3.3 70B
  'gemma-2':      'google/gemma-2-9b-it:free',              // Free Gemma 2 9B
  'llama-3.2':    'meta-llama/llama-3.2-3b-instruct:free',  // Free Llama 3.2 3B
  'mistral':      'mistralai/mistral-7b-instruct:free',     // Free Mistral 7B
  'phi-4':        'microsoft/phi-4:free',                   // Free Microsoft Phi-4
};

const DEFAULT_MODEL = 'google/gemini-2.5-flash:free';

/**
 * Dynamically build the system prompt with the current date/time injected.
 * This ensures the AI always knows today's date and can answer time-sensitive
 * questions accurately instead of relying on its stale training cutoff.
 */
function buildSystemPrompt(customPrompt) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  });

  const dateContext = `\n\nIMPORTANT — Current date and time: ${dateStr} at ${timeStr}.
Always use this date when answering questions about today, current events, ages, deadlines, or anything time-sensitive.
If you don't have information about a very recent event (after your training cutoff), say so honestly.`;

  if (customPrompt) {
    return customPrompt + dateContext;
  }

  return `You are an intelligent, friendly AI chatbot assistant for a web application.
You help users with questions, provide information, and have engaging conversations.
Keep responses helpful, structured, and conversational. Use Markdown formatting when appropriate.
You are powered by modern AI models and an NLP routing engine.
If asked about technical topics, explain them clearly and simply.` + dateContext;
}

/**
 * Get AI response from OpenRouter (supports streaming via callback)
 * @param {string} userMessage - User input
 * @param {Array} conversationHistory - Past messages context
 * @param {string} apiKey - OpenRouter API Key
 * @param {Object} options - Additional options { model, systemPrompt, image, temperature, onChunk }
 */
async function getAIResponse(userMessage, conversationHistory = [], apiKey, options = {}) {
  const selectedModelId = options.model || 'gemini-flash';
  const model = MODEL_MAPPING[selectedModelId] || selectedModelId || DEFAULT_MODEL;
  const systemPrompt = buildSystemPrompt(options.systemPrompt);
  const temperature = options.temperature !== undefined ? parseFloat(options.temperature) : 0.7;
  const image = options.image || null; // base64 string
  const onChunk = options.onChunk || null; // function callback for streaming

  if (!apiKey) {
    console.warn('[OpenRouter] No API key provided, using local smart fallback.');
    const fallbackText = getSmartFallback(userMessage);
    if (onChunk) {
      // Simulate streaming for fallback
      const words = fallbackText.split(' ');
      for (const word of words) {
        onChunk(word + ' ');
        await new Promise(r => setTimeout(r, 40));
      }
      return '';
    }
    return fallbackText;
  }

  // Format user message content (multimodal if image is attached)
  let userContent = [];
  if (image) {
    userContent.push({
      type: 'text',
      text: userMessage,
    });
    userContent.push({
      type: 'image_url',
      image_url: {
        url: image, // format: "data:image/jpeg;base64,..."
      },
    });
  } else {
    userContent = userMessage;
  }

  // Build conversation messages
  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.slice(-8), // Keep up to 8 messages for context
    { role: 'user', content: userContent },
  ];

  try {
    const isStreaming = typeof onChunk === 'function';

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'NeuralChat - Advanced AI Platform',
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 1500,
        temperature,
        top_p: 0.9,
        stream: isStreaming,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter HTTP ${response.status}: ${errorText}`);
    }

    if (isStreaming) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep partial line in buffer

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          if (trimmed === 'data: [DONE]') continue;

          if (trimmed.startsWith('data: ')) {
            try {
              const json = JSON.parse(trimmed.slice(6));
              const token = json.choices?.[0]?.delta?.content;
              if (token) {
                onChunk(token);
              }
            } catch (err) {
              // Ignore partial or malformed chunk parsing errors
            }
          }
        }
      }
      return ''; // Streaming returns empty as chunks are processed on-the-fly
    } else {
      const json = await response.json();
      const content = json.choices?.[0]?.message?.content;
      if (!content || !content.trim()) {
        throw new Error('Empty response from AI model.');
      }
      return content.trim();
    }

  } catch (error) {
    console.error(`[OpenRouter API Error] Model: ${model}`, error.message);
    
    // Attempt fallback model if custom model fails
    if (model !== DEFAULT_MODEL && !image) {
      console.log(`[OpenRouter] Retrying with default model: ${DEFAULT_MODEL}`);
      return getAIResponse(userMessage, conversationHistory, apiKey, {
        ...options,
        model: 'gemini-flash',
      });
    }

    // Return smart fallback if all API routes fail
    const fallbackText = getSmartFallback(userMessage);
    if (onChunk) {
      onChunk(fallbackText);
      return '';
    }
    return fallbackText;
  }
}

/**
 * Smart rule-based fallback when AI API is unavailable
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
    return '🌍 The world\'s population is approximately 8.1 billion people as of 2024, with India and China being the most populous countries, each with over 1.4 billion people!';
  }

  const fallbacks = [
    `That's an interesting question! 🤔 While I process that through my NLP engine, could you try rephrasing? You can also ask me about weather, Wikipedia topics, math calculations, or general knowledge!`,
    `I'm analyzing your query using cosine similarity and intent classification... 🧠 I might need you to be more specific. Try asking about a specific topic, or type "help" to see what I can do!`,
    `Great question! My NLP engine is working on it. 🤖 For the best results, try asking things like "what is [topic]?", "tell me about [subject]", or "weather in [city]".`,
    `Interesting! I'm not 100% sure about that one. Try asking me something like "what is artificial intelligence?" or "weather in Mumbai" — I love those! 😊`,
  ];

  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

module.exports = { getAIResponse, getSmartFallback };
