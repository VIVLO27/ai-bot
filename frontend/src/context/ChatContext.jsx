import { createContext, useContext, useReducer, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { sendMessage as apiSendMessage, clearHistory as apiClearHistory } from '../services/api';

const ChatContext = createContext(null);

// Generate persistent session ID
const getSessionId = () => {
  let id = localStorage.getItem('chatbot_session_id');
  if (!id) { id = uuidv4(); localStorage.setItem('chatbot_session_id', id); }
  return id;
};

const initialState = {
  messages: [],       // { id, role, content, timestamp, metadata }
  isTyping: false,
  sessionId: getSessionId(),
  isOnline: true,
  sidebarOpen: true,
  chatSessions: JSON.parse(localStorage.getItem('chatbot_sessions') || '[]'),
};

function reducer(state, action) {
  switch (action.type) {
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };
    case 'SET_TYPING':
      return { ...state, isTyping: action.payload };
    case 'SET_ONLINE':
      return { ...state, isOnline: action.payload };
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarOpen: !state.sidebarOpen };
    case 'CLEAR_MESSAGES':
      return { ...state, messages: [] };
    case 'NEW_SESSION': {
      const newId = uuidv4();
      localStorage.setItem('chatbot_session_id', newId);
      return { ...state, messages: [], sessionId: newId };
    }
    case 'SAVE_SESSION': {
      const sessions = [action.payload, ...state.chatSessions.slice(0, 9)];
      localStorage.setItem('chatbot_sessions', JSON.stringify(sessions));
      return { ...state, chatSessions: sessions };
    }
    default:
      return state;
  }
}

export function ChatProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const sendMessage = useCallback(async (text) => {
    if (!text.trim()) return;

    // Add user message immediately
    const userMsg = {
      id: uuidv4(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_MESSAGE', payload: userMsg });
    dispatch({ type: 'SET_TYPING', payload: true });

    try {
      const data = await apiSendMessage(text.trim(), state.sessionId);

      // Small delay for natural feel
      await new Promise(r => setTimeout(r, 400));

      const botMsg = {
        id: uuidv4(),
        role: 'bot',
        content: data.response,
        timestamp: new Date().toISOString(),
        metadata: data.metadata,
      };
      dispatch({ type: 'ADD_MESSAGE', payload: botMsg });
      dispatch({ type: 'SET_ONLINE', payload: true });

      // Save first message as session title
      if (state.messages.length === 0) {
        dispatch({
          type: 'SAVE_SESSION',
          payload: {
            id: state.sessionId,
            title: text.trim().slice(0, 40) + (text.length > 40 ? '…' : ''),
            timestamp: new Date().toISOString(),
          },
        });
      }
    } catch (err) {
      console.error('[Chat Error]', err);
      dispatch({ type: 'SET_ONLINE', payload: false });
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: uuidv4(),
          role: 'bot',
          content: '⚠️ Connection error. Please make sure the backend server is running on port 5000.',
          timestamp: new Date().toISOString(),
          metadata: { responseType: 'error' },
        },
      });
    } finally {
      dispatch({ type: 'SET_TYPING', payload: false });
    }
  }, [state.sessionId, state.messages.length]);

  const newChat = useCallback(async () => {
    await apiClearHistory().catch(() => {});
    dispatch({ type: 'NEW_SESSION' });
  }, []);

  const toggleSidebar = useCallback(() => dispatch({ type: 'TOGGLE_SIDEBAR' }), []);

  return (
    <ChatContext.Provider value={{ ...state, sendMessage, newChat, toggleSidebar }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
}
