/**
 * Tokenizer Module
 * Handles text cleaning, tokenization, and stopword removal
 */

const STOPWORDS = new Set([
  'a', 'an', 'the', 'is', 'it', 'in', 'on', 'at', 'to', 'for', 'of', 'and',
  'or', 'but', 'not', 'are', 'was', 'were', 'be', 'been', 'being', 'have',
  'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
  'may', 'might', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'i',
  'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your',
  'yours', 'yourself', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers',
  'herself', 'they', 'them', 'their', 'theirs', 'what', 'with', 'this',
  'that', 'these', 'those', 'if', 'then', 'else', 'when', 'while', 'how',
  'so', 'up', 'about', 'out', 'as', 'by', 'just', 'into', 'through',
  'during', 'before', 'after', 'above', 'below', 'from', 'too', 'very',
  'get', 'go', 'got', 'now', 'than', 'only', 'also', 'both', 'each',
  'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'same', 'own',
  's', 't', 'll', 've', 'd', 'm', 're', 'which', 'who', 'whom', 'whose'
]);

/**
 * Tokenize and clean text:
 * 1. Lowercase
 * 2. Remove punctuation (keep words)
 * 3. Split into tokens
 * 4. Remove stopwords
 * 5. Basic stemming (strip common suffixes)
 */
function tokenize(text, removeStopwords = true) {
  if (!text || typeof text !== 'string') return [];

  // Lowercase
  let cleaned = text.toLowerCase();

  // Remove special characters, keep letters, numbers, spaces
  cleaned = cleaned.replace(/[^a-z0-9\s]/g, ' ');

  // Split into tokens
  let tokens = cleaned.split(/\s+/).filter(t => t.length > 0);

  // Remove stopwords
  if (removeStopwords) {
    tokens = tokens.filter(t => !STOPWORDS.has(t));
  }

  // Stem tokens (simple suffix stripping)
  tokens = tokens.map(stem);

  return tokens;
}

/**
 * Simple Porter-like stemmer (suffix stripping)
 */
function stem(word) {
  if (word.length <= 3) return word;

  // Common suffix rules
  const rules = [
    [/ing$/, ''],
    [/tion$/, ''],
    [/ness$/, ''],
    [/ment$/, ''],
    [/able$/, ''],
    [/ible$/, ''],
    [/ful$/, ''],
    [/less$/, ''],
    [/ous$/, ''],
    [/ive$/, ''],
    [/ize$/, ''],
    [/ise$/, ''],
    [/ly$/, ''],
    [/ed$/, ''],
    [/er$/, ''],
    [/est$/, ''],
    [/s$/, ''],
  ];

  for (const [pattern, replacement] of rules) {
    if (pattern.test(word)) {
      const stemmed = word.replace(pattern, replacement);
      if (stemmed.length >= 3) return stemmed;
    }
  }

  return word;
}

module.exports = { tokenize, stem, STOPWORDS };
