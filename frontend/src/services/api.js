import axios from 'axios';

// In production: set VITE_API_URL in Vercel environment variables
// In development: falls back to localhost:5000
const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api';

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  timeout: 20000,
});

/**
 * Send a chat message to the backend NLP engine
 */
export async function sendMessage(message, sessionId) {
  const response = await api.post('/chat', { message, sessionId });
  return response.data;
}

/**
 * Get chat history from session
 */
export async function getChatHistory() {
  const response = await api.get('/chat/history');
  return response.data;
}

/**
 * Clear chat history
 */
export async function clearHistory() {
  const response = await api.delete('/chat/history');
  return response.data;
}

/**
 * Health check
 */
export async function checkHealth() {
  const response = await api.get('/health');
  return response.data;
}

export default api;
