/**
 * TF-IDF Vectorizer Module
 * Converts tokenized text into numeric TF-IDF vectors for similarity computation
 */

const { tokenize } = require('./tokenizer');

class TFIDFVectorizer {
  constructor() {
    this.vocabulary = new Map(); // word -> index
    this.idf = new Map();        // word -> idf value
    this.numDocs = 0;
    this.docFrequency = new Map(); // word -> number of docs containing it
  }

  /**
   * Fit the vectorizer on a corpus of documents
   * Builds vocabulary and computes IDF values
   */
  fit(documents) {
    this.numDocs = documents.length;
    this.docFrequency = new Map();
    this.vocabulary = new Map();

    // Build document frequency
    documents.forEach(doc => {
      const tokens = new Set(tokenize(doc));
      tokens.forEach(token => {
        this.docFrequency.set(token, (this.docFrequency.get(token) || 0) + 1);
      });
    });

    // Build vocabulary (sorted for consistency)
    let idx = 0;
    const sortedWords = [...this.docFrequency.keys()].sort();
    sortedWords.forEach(word => {
      this.vocabulary.set(word, idx++);
    });

    // Compute IDF: log((N + 1) / (df + 1)) + 1
    this.docFrequency.forEach((df, word) => {
      const idfVal = Math.log((this.numDocs + 1) / (df + 1)) + 1;
      this.idf.set(word, idfVal);
    });

    return this;
  }

  /**
   * Transform a single document into a TF-IDF vector
   */
  transform(document) {
    const tokens = tokenize(document);
    const vectorSize = this.vocabulary.size;
    const vector = new Array(vectorSize).fill(0);

    if (tokens.length === 0) return vector;

    // Compute TF for each token
    const tfMap = new Map();
    tokens.forEach(token => {
      tfMap.set(token, (tfMap.get(token) || 0) + 1);
    });

    // Apply TF-IDF: tf * idf
    tfMap.forEach((count, token) => {
      if (this.vocabulary.has(token)) {
        const idx = this.vocabulary.get(token);
        const tf = count / tokens.length;  // normalized TF
        const idfVal = this.idf.get(token) || 0;
        vector[idx] = tf * idfVal;
      }
    });

    return vector;
  }

  /**
   * Fit and transform in one step
   */
  fitTransform(documents) {
    this.fit(documents);
    return documents.map(doc => this.transform(doc));
  }

  /**
   * Get vocabulary size
   */
  get vocabularySize() {
    return this.vocabulary.size;
  }
}

module.exports = { TFIDFVectorizer };
