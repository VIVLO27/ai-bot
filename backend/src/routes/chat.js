/**
 * Chat Route
 * POST /api/chat — Main NLP processing pipeline
 */

const express = require('express');
const router = express.Router();
const { classifier } = require('../nlp/intentClassifier');
const { extractEntities, computeMathFromText } = require('../nlp/entityExtractor');
const { getWeather, getWikipediaSummary } = require('../services/externalAPI');
const { getAIResponse } = require('../services/openrouter');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

router.post('/', async (req, res) => {
  const startTime = Date.now();

  try {
    const { message, sessionId } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const userMessage = message.trim();

    // Initialize session conversation history
    if (!req.session.history) {
      req.session.history = [];
    }

    // Add user message to history
    req.session.history.push({ role: 'user', content: userMessage });

    // Keep only last 10 messages
    if (req.session.history.length > 10) {
      req.session.history = req.session.history.slice(-10);
    }

    console.log(`[Chat] Query: "${userMessage}" | Session: ${sessionId?.slice(0, 8) || 'anon'}`);

    // === NLP PIPELINE ===

    // Step 1: Extract entities
    const entities = extractEntities(userMessage);

    // Step 2: Classify intent
    const classification = classifier.classify(userMessage);
    console.log(`[NLP] Intent: ${classification.tag} | Confidence: ${(classification.confidence * 100).toFixed(1)}%`);

    let responseText = null;
    let responseType = 'nlp';
    let metadata = {
      intent: classification.tag,
      confidence: parseFloat((classification.confidence * 100).toFixed(1)),
      entities,
    };

    // Step 3: Handle special commands or get response
    if (classification.tag !== 'default' && classification.intent) {
      const specialCommand = classifier.getSpecialCommand(classification.intent);

      if (specialCommand && specialCommand !== 'AI_FALLBACK') {
        // Handle special API-based responses
        switch (specialCommand) {
          case 'WEATHER_FETCH': {
            const location = entities.location || extractLocationFromQuery(userMessage) || 'New Delhi';
            responseText = await getWeather(location);
            responseType = 'weather';
            break;
          }

          case 'TIME_FETCH': {
            const now = new Date();
            responseText = `🕐 **Current Time**\n\n${now.toLocaleTimeString('en-US', { hour12: true, timeZoneName: 'short' })}\n\n📅 *${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}*`;
            responseType = 'time';
            break;
          }

          case 'DATE_FETCH': {
            const now = new Date();
            responseText = `📅 **Today's Date**\n\n**${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}**\n\n🕐 Time: ${now.toLocaleTimeString('en-US', { hour12: true })}`;
            responseType = 'date';
            break;
          }

          case 'MATH_COMPUTE': {
            const result = computeMathFromText(userMessage);
            if (result) {
              responseText = `🧮 **Calculation Result**\n\n\`\`\`\n${result}\n\`\`\``;
              responseType = 'math';
            } else {
              responseText = `🧮 I'd love to help with math! Please format your expression clearly, like:\n- "What is 25 + 73?"\n- "Calculate 150 / 6"\n- "Square root of 144"\n- "15% of 200"`;
            }
            break;
          }

          case 'WIKI_FETCH': {
            const topic = entities.topic || extractTopicFromQuery(userMessage);
            if (topic) {
              const wikiResult = await getWikipediaSummary(topic);
              responseText = wikiResult || await getAIResponse(userMessage, req.session.history.slice(0, -1), OPENROUTER_API_KEY);
              responseType = wikiResult ? 'wikipedia' : 'ai';
            } else {
              responseText = `🔍 What topic would you like me to look up? For example: "Tell me about quantum computing" or "What is the Eiffel Tower?"`;
            }
            break;
          }
        }
      } else if (specialCommand === 'AI_FALLBACK') {
        // Intentionally use AI
        responseText = await getAIResponse(userMessage, req.session.history.slice(0, -1), OPENROUTER_API_KEY);
        responseType = 'ai';
      } else {
        // Regular intent response
        responseText = classifier.getResponse(classification.intent);
        responseType = 'intent';
      }
    }

    // Step 4: Fallback to AI if no response yet
    if (!responseText) {
      responseText = await getAIResponse(userMessage, req.session.history.slice(0, -1), OPENROUTER_API_KEY);
      responseType = 'ai_fallback';
    }

    // Add bot response to history
    req.session.history.push({ role: 'assistant', content: responseText });

    const processingTime = Date.now() - startTime;
    console.log(`[Chat] Response type: ${responseType} | Time: ${processingTime}ms`);

    return res.json({
      response: responseText,
      metadata: {
        ...metadata,
        responseType,
        processingTime,
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('[Chat Route Error]', error);
    return res.status(500).json({
      response: `⚠️ I encountered an error processing your request. Please try again!`,
      metadata: { responseType: 'error' },
    });
  }
});

/**
 * Extract location from weather query
 */
function extractLocationFromQuery(query) {
  const patterns = [
    /weather (?:in|at|for|of) ([A-Za-z\s]+?)(?:\?|$)/i,
    /(?:in|at) ([A-Z][a-z]+(?: [A-Z][a-z]+)*) weather/i,
    /([A-Z][a-z]+(?: [A-Z][a-z]+)*) (?:weather|temperature|forecast)/i,
  ];
  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match) return match[1].trim();
  }
  return null;
}

/**
 * Extract search topic from query
 */
function extractTopicFromQuery(query) {
  const patterns = [
    /(?:about|search for|what is|who is|tell me about|explain|define|information about|history of|facts about)\s+(.+?)(?:\?|$)/i,
    /(?:capital of)\s+(.+?)(?:\?|$)/i,
    /(.+?)\s+(?:definition|meaning|facts|history)(?:\?|$)/i,
  ];
  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match && match[1]) return match[1].trim().replace(/[?.!]+$/, '');
  }
  return null;
}

// GET /api/chat/history — return session history
router.get('/history', (req, res) => {
  res.json({ history: req.session.history || [] });
});

// DELETE /api/chat/history — clear session history
router.delete('/history', (req, res) => {
  req.session.history = [];
  res.json({ message: 'History cleared' });
});

module.exports = router;
