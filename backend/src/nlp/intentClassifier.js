/**
 * Intent Classifier Module
 * Loads intents, builds TF-IDF vectors, classifies user queries using cosine similarity
 */

const { TFIDFVectorizer } = require('./vectorizer');
const { findBestMatch } = require('./similarity');
const intentsData = require('../data/intents.json');

const SIMILARITY_THRESHOLD = 0.25; // Minimum score to match an intent
const HIGH_CONFIDENCE_THRESHOLD = 0.55;

class IntentClassifier {
  constructor() {
    this.intents = [];
    this.vectorizer = new TFIDFVectorizer();
    this.intentVectors = [];
    this.patternToTag = []; // parallel array: pattern index -> tag
    this.initialized = false;
  }

  /**
   * Initialize: load intents and pre-compute TF-IDF vectors
   */
  initialize() {
    const intents = intentsData.intents.filter(i => i.tag !== 'default');
    this.intents = intentsData.intents;

    // Flatten: one entry per pattern
    const allPatterns = [];
    this.patternToTag = [];

    intents.forEach(intent => {
      intent.patterns.forEach(pattern => {
        allPatterns.push(pattern);
        this.patternToTag.push(intent.tag);
      });
    });

    if (allPatterns.length === 0) {
      console.warn('[IntentClassifier] No patterns found in intents.json');
      return;
    }

    // Fit vectorizer on all patterns
    this.vectorizer.fit(allPatterns);

    // Compute TF-IDF vectors for all patterns
    this.intentVectors = allPatterns.map(p => this.vectorizer.transform(p));

    this.initialized = true;
    console.log(`[IntentClassifier] Initialized with ${allPatterns.length} patterns across ${intents.length} intents`);
    console.log(`[IntentClassifier] Vocabulary size: ${this.vectorizer.vocabularySize}`);
  }

  /**
   * Classify a user query and return the best matching intent
   */
  classify(query) {
    if (!this.initialized) {
      return { tag: 'default', confidence: 0, response: null };
    }

    // Quick keyword override for common patterns
    const lower = query.toLowerCase().trim();

    // Rule-based fast matching for very short inputs
    const quickMatches = {
      'hi': 'greeting', 'hello': 'greeting', 'hey': 'greeting',
      'bye': 'goodbye', 'ok': 'yes', 'okay': 'yes', 'yes': 'yes', 'no': 'no',
      'thanks': 'thanks', 'thank you': 'thanks',
      'help': 'help', 'joke': 'joke',
    };

    if (quickMatches[lower]) {
      const tag = quickMatches[lower];
      const intent = this.intents.find(i => i.tag === tag);
      return { tag, confidence: 0.99, intent };
    }

    // TF-IDF + Cosine Similarity classification
    const queryVector = this.vectorizer.transform(query);
    const { index, score } = findBestMatch(queryVector, this.intentVectors);

    if (index === -1 || score < SIMILARITY_THRESHOLD) {
      return { tag: 'default', confidence: score, intent: null };
    }

    const matchedTag = this.patternToTag[index];
    const intent = this.intents.find(i => i.tag === matchedTag);

    return {
      tag: matchedTag,
      confidence: score,
      intent,
      highConfidence: score >= HIGH_CONFIDENCE_THRESHOLD,
    };
  }

  /**
   * Get a random response from an intent
   */
  getResponse(intent) {
    if (!intent || !intent.responses || intent.responses.length === 0) return null;
    const responses = intent.responses.filter(r => !r.startsWith('FETCH') && r !== 'AI_FALLBACK' && r !== 'MATH_COMPUTE' && r !== 'WIKI_FETCH' && r !== 'WEATHER_FETCH' && r !== 'TIME_FETCH' && r !== 'DATE_FETCH');
    if (responses.length === 0) return intent.responses[0]; // return special command
    return responses[Math.floor(Math.random() * responses.length)];
  }

  /**
   * Check if intent requires special processing
   */
  requiresSpecialHandling(intent) {
    if (!intent || !intent.responses) return false;
    const specialCommands = ['WEATHER_FETCH', 'WIKI_FETCH', 'MATH_COMPUTE', 'TIME_FETCH', 'DATE_FETCH', 'AI_FALLBACK'];
    return intent.responses.some(r => specialCommands.includes(r));
  }

  /**
   * Get the special command for an intent
   */
  getSpecialCommand(intent) {
    if (!intent || !intent.responses) return null;
    const specialCommands = ['WEATHER_FETCH', 'WIKI_FETCH', 'MATH_COMPUTE', 'TIME_FETCH', 'DATE_FETCH', 'AI_FALLBACK'];
    return intent.responses.find(r => specialCommands.includes(r)) || null;
  }
}

// Singleton
const classifier = new IntentClassifier();
classifier.initialize();

module.exports = { classifier, IntentClassifier };
