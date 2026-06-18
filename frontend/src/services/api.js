import axios from 'axios';

// In production: set VITE_API_URL in Vercel environment variables
// In development: falls back to localhost:5000
const API_BASE = (import.meta.env.VITE_API_URL || 'https://ai-bot-tc4d.onrender.com') + '/api';

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  timeout: 30000, // Increased timeout for deep-reasoning models
});

/**
 * Send a chat message to the backend NLP engine
 */
export async function sendMessage(message, sessionId) {
  const response = await api.post('/chat', { message, sessionId });
  return response.data;
}

/**
 * Get chat history from session (supports session ID)
 */
export async function getChatHistory(sessionId) {
  const url = sessionId ? `/chat/history/${sessionId}` : '/chat/history';
  const response = await api.get(url);
  return response.data;
}

/**
 * Clear chat history (supports session ID)
 */
export async function clearHistory(sessionId) {
  const url = sessionId ? `/chat/history/${sessionId}` : '/chat/history';
  const response = await api.delete(url);
  return response.data;
}

/**
 * Health check
 */
export async function checkHealth() {
  const response = await api.get('/health');
  return response.data;
}

export { API_BASE };
export default api;
