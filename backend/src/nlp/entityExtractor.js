/**
 * Entity Extractor Module
 * Extracts named entities from user queries: dates, numbers, names, locations, math expressions
 */

/**
 * Extract all entities from text
 * Returns an object with found entities
 */
function extractEntities(text) {
  const entities = {
    numbers: [],
    dates: [],
    mathExpression: null,
    topic: null,
    location: null,
    time: null,
  };

  const lowerText = text.toLowerCase();

  // Extract numbers
  const numberMatches = text.match(/\b\d+(\.\d+)?\b/g);
  if (numberMatches) {
    entities.numbers = numberMatches.map(Number);
  }

  // Extract math expressions
  const mathMatch = text.match(/[\d\s\+\-\*\/\^\%\(\)\.]+/);
  if (mathMatch && /[\+\-\*\/\^]/.test(mathMatch[0])) {
    entities.mathExpression = mathMatch[0].trim();
  }

  // Extract dates
  const datePatterns = [
    /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/,
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(,\s*\d{4})?\b/i,
    /\b\d{1,2}\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s*\d{0,4}\b/i,
  ];
  datePatterns.forEach(pattern => {
    const match = text.match(pattern);
    if (match) entities.dates.push(match[0]);
  });

  // Extract search topic (after "about", "search for", "what is", "who is", "tell me about", "define")
  const topicPatterns = [
    /(?:about|search for|search|tell me about|what is|who is|define|explain|history of|facts about)\s+(.+?)(?:\?|$)/i,
    /(?:capital of|capital city of)\s+(.+?)(?:\?|$)/i,
    /(.+?)\s+(?:definition|meaning|explanation)/i,
  ];
  for (const pattern of topicPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      entities.topic = match[1].trim().replace(/[?!.]+$/, '');
      break;
    }
  }

  // Extract location for weather
  const weatherPattern = /(?:weather|temperature|forecast)\s+(?:in|at|for|of)?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/;
  const locationMatch = text.match(weatherPattern);
  if (locationMatch) {
    entities.location = locationMatch[1];
  }

  return entities;
}

/**
 * Evaluate a math expression safely
 */
function evaluateMath(expression) {
  try {
    // Allow only safe math characters
    const sanitized = expression.replace(/[^0-9\s\+\-\*\/\^\%\(\)\.]/g, '');
    if (!sanitized.trim()) return null;

    // Convert ^ to ** for exponentiation
    const jsExpr = sanitized.replace(/\^/g, '**');

    // Evaluate safely using Function (limited scope)
    const result = Function(`"use strict"; return (${jsExpr})`)();

    if (typeof result === 'number' && isFinite(result)) {
      return result;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Try to compute math from natural language
 */
function computeMathFromText(text) {
  const lowerText = text.toLowerCase();

  // Handle percentage
  const pctMatch = text.match(/(\d+(?:\.\d+)?)\s*%\s*of\s*(\d+(?:\.\d+)?)/i);
  if (pctMatch) {
    const pct = parseFloat(pctMatch[1]);
    const of = parseFloat(pctMatch[2]);
    return `${pct}% of ${of} = ${(pct / 100) * of}`;
  }

  // Handle square root
  const sqrtMatch = text.match(/square root of\s*(\d+(?:\.\d+)?)/i);
  if (sqrtMatch) {
    const num = parseFloat(sqrtMatch[1]);
    return `√${num} = ${Math.sqrt(num).toFixed(4)}`;
  }

  // Handle power/exponent
  const powerMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:to the power of|raised to|power of|\^)\s*(\d+(?:\.\d+)?)/i);
  if (powerMatch) {
    const base = parseFloat(powerMatch[1]);
    const exp = parseFloat(powerMatch[2]);
    return `${base}^${exp} = ${Math.pow(base, exp)}`;
  }

  // Handle word operations
  const wordMath = {
    plus: '+', added: '+', add: '+',
    minus: '-', subtract: '-', subtracted: '-',
    times: '*', multiplied: '*', multiply: '*',
    divided: '/', divide: '/', over: '/',
  };

  let expr = lowerText;
  Object.entries(wordMath).forEach(([word, op]) => {
    expr = expr.replace(new RegExp(`\\b${word}\\b`, 'g'), op);
  });

  const entities = extractEntities(text);
  if (entities.mathExpression) {
    const result = evaluateMath(entities.mathExpression);
    if (result !== null) {
      return `${entities.mathExpression} = ${result}`;
    }
  }

  // Try direct expression
  const directMatch = expr.match(/[\d\s\+\-\*\/\^\%\(\)\.]+/);
  if (directMatch && /[\+\-\*\/]/.test(directMatch[0])) {
    const result = evaluateMath(directMatch[0].trim());
    if (result !== null) {
      return `${directMatch[0].trim()} = ${result}`;
    }
  }

  return null;
}

module.exports = { extractEntities, evaluateMath, computeMathFromText };
