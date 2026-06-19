/**
 * Chat Route
 * POST /api/chat — Main NLP and AI processing pipeline (supports SSE streaming)
 */

const express = require('express');
const router = express.Router();
const { classifier } = require('../nlp/intentClassifier');
const { extractEntities, computeMathFromText } = require('../nlp/entityExtractor');
const { getWeather, getWikipediaSummary } = require('../services/externalAPI');
const { getAIResponse } = require('../services/openrouter');
const { searchWeb } = require('../services/search');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Get history for a specific session ID
router.get('/history/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  
  if (!req.session.conversations) {
    req.session.conversations = {};
  }
  
  const history = req.session.conversations[sessionId] || [];
  return res.json({ history });
});

// Delete history for a specific session ID
router.delete('/history/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  
  if (req.session.conversations) {
    req.session.conversations[sessionId] = [];
  }
  
  return res.json({ message: `History cleared for session ${sessionId}` });
});

// Legacy history routing (backwards compatibility)
router.get('/history', (req, res) => {
  const history = req.session.history || [];
  return res.json({ history });
});

router.delete('/history', (req, res) => {
  req.session.history = [];
  return res.json({ message: 'History cleared' });
});

// POST /api/chat — Chat pipeline
router.post('/', async (req, res) => {
  const startTime = Date.now();

  try {
    const {
      message,
      sessionId,
      model = 'google/gemini-2.5-flash:free',
      searchEnabled = false,
      responseTone = 'detailed',
      bypassNLP = false,
      image = null,
      stream = true
    } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const userMessage = message.trim();
    const activeSessionId = sessionId || 'default';

    // Initialize session conversations storage
    if (!req.session.conversations) {
      req.session.conversations = {};
    }
    if (!req.session.conversations[activeSessionId]) {
      req.session.conversations[activeSessionId] = [];
    }

    const history = req.session.conversations[activeSessionId];

    console.log(`[Chat] Query: "${userMessage}" | Session: ${activeSessionId.slice(0, 8)} | Model: ${model} | Search: ${searchEnabled} | Tone: ${responseTone}`);

    // Determine if we should bypass local NLP classifier
    // Note: Multimodal requests (with images) MUST go directly to the vision-capable LLM
    const shouldBypassNLP = bypassNLP || !!image;

    let localResponseText = null;
    let localResponseType = null;
    let classification = { tag: 'default', confidence: 0 };
    let entities = {};

    if (!shouldBypassNLP) {
      // Step 1: Extract entities
      entities = extractEntities(userMessage);

      // Step 2: Classify intent
      classification = classifier.classify(userMessage);
      console.log(`[NLP] Intent: ${classification.tag} | Confidence: ${(classification.confidence * 100).toFixed(1)}%`);

      // Step 3: Handle high-confidence local intent matches
      if (classification.tag !== 'default' && classification.intent && classification.confidence >= 0.7) {
        const specialCommand = classifier.getSpecialCommand(classification.intent);

        if (specialCommand && specialCommand !== 'AI_FALLBACK') {
          switch (specialCommand) {
            case 'WEATHER_FETCH': {
              const location = entities.location || extractLocationFromQuery(userMessage) || 'New Delhi';
              localResponseText = await getWeather(location);
              localResponseType = 'weather';
              break;
            }

            case 'TIME_FETCH': {
              const now = new Date();
              localResponseText = `🕐 **Current Time**\n\n${now.toLocaleTimeString('en-US', { hour12: true, timeZoneName: 'short' })}\n\n📅 *${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}*`;
              localResponseType = 'time';
              break;
            }

            case 'DATE_FETCH': {
              const now = new Date();
              localResponseText = `📅 **Today's Date**\n\n**${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}**\n\n🕐 Time: ${now.toLocaleTimeString('en-US', { hour12: true })}`;
              localResponseType = 'date';
              break;
            }

            case 'MATH_COMPUTE': {
              const result = computeMathFromText(userMessage);
              if (result) {
                localResponseText = `🧮 **Calculation Result**\n\n\`\`\`\n${result}\n\`\`\``;
                localResponseType = 'math';
              } else {
                localResponseText = `🧮 I'd love to help with math! Please format your expression clearly, like:\n- "What is 25 + 73?"\n- "Calculate 150 / 6"\n- "Square root of 144"\n- "15% of 200"`;
                localResponseType = 'math_help';
              }
              break;
            }

            case 'WIKI_FETCH': {
              const topic = entities.topic || extractTopicFromQuery(userMessage);
              if (topic) {
                const wikiResult = await getWikipediaSummary(topic);
                if (wikiResult) {
                  localResponseText = wikiResult;
                  localResponseType = 'wikipedia';
                }
              }
              break;
            }
          }
        }
      }
    }

    // Prepare system prompt based on selected tone
    let basePrompt = `You are NeuralChat, an advanced AI assistant. You help users with questions, provide detailed information, and have engaging conversations.`;
    if (responseTone === 'concise') {
      basePrompt += ` Keep your response very brief (2-3 sentences maximum) and direct. Use emojis occasionally to be friendly.`;
    } else if (responseTone === 'detailed') {
      basePrompt += ` Provide highly structured, comprehensive, and clear answers. Use headings, lists, tables, and formatted code blocks (with programming language badges) when appropriate.`;
    } else if (responseTone === 'creative') {
      basePrompt += ` Respond with a warm, engaging, and expressive tone. Use rich descriptions, creative insights, and helpful analogies.`;
    }

    // Step 4: Handle Web Search Grounding if enabled (and local response not found)
    let searchResults = [];
    let dynamicSystemPrompt = basePrompt;

    if (!localResponseText && searchEnabled) {
      console.log(`[Search] Triggering search query for: "${userMessage}"`);
      searchResults = await searchWeb(userMessage);
      
      if (searchResults.length > 0) {
        const searchContext = searchResults.map((r, i) => 
          `[${i + 1}] Title: ${r.title}\nURL: ${r.url}\nSnippet: ${r.snippet}`
        ).join('\n\n');
        
        dynamicSystemPrompt = `${basePrompt}

You are provided with real-time web search results matching the user's query. Ground your response strictly in these results. 
Cite your sources in the text using bracketed numbers, such as [1], [2], etc., corresponding to the search results list. 
If the search results do not contain enough info, use your general knowledge but clearly state what came from your training vs the search results.

Web Search Results:
${searchContext}`;
      }
    }

    // SSE STREAMING RESPONSE PATH
    if (stream) {
      // Set up SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      // If resolved locally, write it as a single SSE chunk and terminate
      if (localResponseText) {
        res.write(`data: ${JSON.stringify({ token: localResponseText })}\n\n`);
        
        const metadata = {
          intent: classification.tag,
          confidence: parseFloat((classification.confidence * 100).toFixed(1)),
          entities,
          responseType: localResponseType,
          processingTime: Date.now() - startTime,
          timestamp: new Date().toISOString()
        };

        // Add to history
        history.push({ role: 'user', content: userMessage });
        history.push({ role: 'assistant', content: localResponseText });
        // Save back to session
        if (history.length > 15) req.session.conversations[activeSessionId] = history.slice(-15);

        res.write(`data: ${JSON.stringify({ done: true, metadata, fullText: localResponseText })}\n\n`);
        res.end();
        return;
      }

      // Otherwise, stream from OpenRouter
      let fullResponseText = '';
      try {
        await getAIResponse(userMessage, history, OPENROUTER_API_KEY, {
          model,
          systemPrompt: dynamicSystemPrompt,
          image,
          onChunk: (chunk) => {
            fullResponseText += chunk;
            res.write(`data: ${JSON.stringify({ token: chunk })}\n\n`);
          }
        });

        const metadata = {
          intent: shouldBypassNLP ? 'ai_direct' : classification.tag,
          confidence: shouldBypassNLP ? 100 : parseFloat((classification.confidence * 100).toFixed(1)),
          entities,
          responseType: searchResults.length > 0 ? 'search_grounded' : (image ? 'multimodal' : 'ai_stream'),
          searchResults: searchResults.length > 0 ? searchResults : undefined,
          processingTime: Date.now() - startTime,
          timestamp: new Date().toISOString()
        };

        // Add to session history
        history.push({ role: 'user', content: userMessage });
        history.push({ role: 'assistant', content: fullResponseText });
        if (history.length > 15) req.session.conversations[activeSessionId] = history.slice(-15);

        res.write(`data: ${JSON.stringify({ done: true, metadata, fullText: fullResponseText })}\n\n`);
        res.end();

      } catch (err) {
        console.error('[Streaming Error]', err);
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.end();
      }

    } else {
      // STANDARD JSON PATH (FALLBACK / NON-STREAMING)
      if (localResponseText) {
        history.push({ role: 'user', content: userMessage });
        history.push({ role: 'assistant', content: localResponseText });
        if (history.length > 15) req.session.conversations[activeSessionId] = history.slice(-15);

        return res.json({
          response: localResponseText,
          metadata: {
            intent: classification.tag,
            confidence: parseFloat((classification.confidence * 100).toFixed(1)),
            entities,
            responseType: localResponseType,
            processingTime: Date.now() - startTime,
            timestamp: new Date().toISOString()
          }
        });
      }

      const responseText = await getAIResponse(userMessage, history, OPENROUTER_API_KEY, {
        model,
        systemPrompt: dynamicSystemPrompt,
        image
      });

      history.push({ role: 'user', content: userMessage });
      history.push({ role: 'assistant', content: responseText });
      if (history.length > 15) req.session.conversations[activeSessionId] = history.slice(-15);

      return res.json({
        response: responseText,
        metadata: {
          intent: shouldBypassNLP ? 'ai_direct' : classification.tag,
          confidence: shouldBypassNLP ? 100 : parseFloat((classification.confidence * 100).toFixed(1)),
          entities,
          responseType: searchResults.length > 0 ? 'search_grounded' : (image ? 'multimodal' : 'ai_direct'),
          searchResults: searchResults.length > 0 ? searchResults : undefined,
          processingTime: Date.now() - startTime,
          timestamp: new Date().toISOString()
        }
      });
    }

  } catch (error) {
    console.error('[Chat Route Error]', error);
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: 'Internal server error processing response.' })}\n\n`);
      res.end();
    } else {
      return res.status(500).json({
        response: `⚠️ I encountered an error processing your request. Please try again!`,
        metadata: { responseType: 'error' },
      });
    }
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

module.exports = router;
