/**
 * Cosine Similarity Module
 * Computes similarity between TF-IDF vectors
 */

/**
 * Calculate cosine similarity between two vectors
 * cos(θ) = (A · B) / (|A| × |B|)
 * Returns value in [0, 1]: 0 = completely different, 1 = identical
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    magnitudeA += vecA[i] * vecA[i];
    magnitudeB += vecB[i] * vecB[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) return 0;

  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Find the best matching vector from a list
 * Returns { index, score, tag }
 */
function findBestMatch(queryVector, intentVectors) {
  let bestScore = -1;
  let bestIndex = -1;

  intentVectors.forEach((intentVec, idx) => {
    const score = cosineSimilarity(queryVector, intentVec);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = idx;
    }
  });

  return { index: bestIndex, score: bestScore };
}

/**
 * Compute all similarity scores for ranking
 */
function rankMatches(queryVector, intentVectors) {
  return intentVectors
    .map((vec, idx) => ({ index: idx, score: cosineSimilarity(queryVector, vec) }))
    .sort((a, b) => b.score - a.score);
}

module.exports = { cosineSimilarity, findBestMatch, rankMatches };
