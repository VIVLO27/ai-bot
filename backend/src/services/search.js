/**
 * Web Search Service
 * Fetches search results from DuckDuckGo HTML search and returns structured data
 */

const https = require('https');

/**
 * Perform a GET request using native https module
 */
function fetchUrl(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({ data, status: res.statusCode });
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Extract actual destination URL from DDG redirect url
 */
function extractActualUrl(url) {
  if (!url) return '';
  if (url.startsWith('//')) {
    url = 'https:' + url;
  }
  try {
    const parsed = new URL(url);
    const uddg = parsed.searchParams.get('uddg');
    if (uddg) return decodeURIComponent(uddg);
  } catch (e) {
    // Return original url if parsing fails
  }
  return url;
}

/**
 * Simple HTML entities decoder
 */
function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—');
}

/**
 * Search the web using DuckDuckGo
 * @param {string} query - The search query
 * @returns {Promise<Array<{title: string, url: string, snippet: string}>>}
 */
async function searchWeb(query) {
  if (!query || query.trim().length === 0) return [];

  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };

    const response = await fetchUrl(url, headers);
    if (response.status !== 200) {
      console.warn(`[Search] DDG responded with status ${response.status}`);
      return [];
    }

    const html = response.data;

    // Split HTML by web-result class
    const parts = html.split('class="result results_links results_links_deep web-result "');
    const results = [];

    // Parse the first 5 results
    for (const part of parts.slice(1, 6)) {
      const titleMatch = part.match(/<a[^>]*class="result__a"[^>]*>([\s\S]*?)<\/a>/);
      const urlMatch = part.match(/href="([^"]+)"/);
      const snippetMatch = part.match(/<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);

      const cleanText = (text) => {
        if (!text) return '';
        // Strip HTML tags and normalize whitespace
        const stripped = text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
        return decodeHtmlEntities(stripped);
      };

      const title = cleanText(titleMatch ? titleMatch[1] : '');
      const rawUrl = urlMatch ? urlMatch[1] : '';
      const finalUrl = extractActualUrl(rawUrl);
      const snippet = cleanText(snippetMatch ? snippetMatch[1] : '');

      if (title || snippet) {
        results.push({
          title: title || 'Untitled Result',
          url: finalUrl,
          snippet: snippet || ''
        });
      }
    }

    console.log(`[Search] Successfully fetched ${results.length} results for "${query}"`);
    return results;

  } catch (error) {
    console.error('[Search Service Error]', error.message);
    return [];
  }
}

module.exports = { searchWeb };
