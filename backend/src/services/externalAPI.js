/**
 * External API Service
 * Fetches real-time weather data and Wikipedia summaries
 */

const axios = require('axios');

/**
 * Get current weather for a location using Open-Meteo (free, no key needed)
 * Falls back to a lat/lon lookup via geocoding
 */
async function getWeather(location = 'New Delhi') {
  try {
    // Step 1: Geocode the location using Open-Meteo's geocoding API
    const geoResponse = await axios.get('https://geocoding-api.open-meteo.com/v1/search', {
      params: { name: location, count: 1, language: 'en', format: 'json' },
      timeout: 5000,
    });

    const results = geoResponse.data.results;
    if (!results || results.length === 0) {
      return `I couldn't find weather data for "${location}". Try a different city name.`;
    }

    const { latitude, longitude, name, country } = results[0];

    // Step 2: Fetch weather using coordinates
    const weatherResponse = await axios.get('https://api.open-meteo.com/v1/forecast', {
      params: {
        latitude,
        longitude,
        current_weather: true,
        hourly: 'relative_humidity_2m,apparent_temperature',
        daily: 'weathercode,temperature_2m_max,temperature_2m_min',
        timezone: 'auto',
        forecast_days: 1,
      },
      timeout: 5000,
    });

    const cw = weatherResponse.data.current_weather;
    const daily = weatherResponse.data.daily;

    const weatherCode = cw.weathercode;
    const condition = getWeatherCondition(weatherCode);
    const windspeed = cw.windspeed;
    const temp = cw.temperature;
    const maxTemp = daily?.temperature_2m_max?.[0] ?? 'N/A';
    const minTemp = daily?.temperature_2m_min?.[0] ?? 'N/A';

    return `🌤️ **Weather in ${name}, ${country}**\n\n` +
      `🌡️ **Temperature:** ${temp}°C\n` +
      `📊 **High/Low:** ${maxTemp}°C / ${minTemp}°C\n` +
      `☁️ **Condition:** ${condition}\n` +
      `💨 **Wind Speed:** ${windspeed} km/h\n\n` +
      `*Data from Open-Meteo (real-time)*`;

  } catch (error) {
    console.error('[Weather API Error]', error.message);
    return `⚠️ I couldn't fetch weather data right now. Please try again later or check manually at weather.com.`;
  }
}

/**
 * Get a Wikipedia summary for a topic
 */
async function getWikipediaSummary(topic) {
  if (!topic || topic.trim().length === 0) return null;

  try {
    const encoded = encodeURIComponent(topic.trim());
    const response = await axios.get(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`,
      {
        timeout: 5000,
        headers: { 'User-Agent': 'AI-Chatbot/1.0 (academic-research)' },
      }
    );

    const { title, extract, content_urls } = response.data;

    if (!extract) return null;

    // Truncate to 3 sentences max
    const sentences = extract.split('. ');
    const summary = sentences.slice(0, 3).join('. ') + (sentences.length > 3 ? '.' : '');

    return `📖 **${title}**\n\n${summary}\n\n🔗 [Read more on Wikipedia](${content_urls?.desktop?.page || '#'})`;

  } catch (error) {
    if (error.response?.status === 404) {
      return `❓ I couldn't find information about "${topic}" on Wikipedia. Try rephrasing your question.`;
    }
    console.error('[Wikipedia API Error]', error.message);
    return null;
  }
}

/**
 * Map WMO weather code to human-readable condition
 */
function getWeatherCondition(code) {
  const conditions = {
    0: '☀️ Clear sky',
    1: '🌤️ Mainly clear', 2: '⛅ Partly cloudy', 3: '☁️ Overcast',
    45: '🌫️ Foggy', 48: '🌫️ Icy fog',
    51: '🌦️ Light drizzle', 53: '🌦️ Moderate drizzle', 55: '🌧️ Dense drizzle',
    61: '🌧️ Slight rain', 63: '🌧️ Moderate rain', 65: '🌧️ Heavy rain',
    71: '❄️ Slight snow', 73: '❄️ Moderate snow', 75: '❄️ Heavy snow',
    80: '🌦️ Slight showers', 81: '🌧️ Moderate showers', 82: '⛈️ Violent showers',
    95: '⛈️ Thunderstorm', 96: '⛈️ Thunderstorm with hail', 99: '⛈️ Heavy thunderstorm',
  };
  return conditions[code] || '🌡️ Unknown';
}

module.exports = { getWeather, getWikipediaSummary };
