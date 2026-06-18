import { createContext, useContext, useReducer, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { getChatHistory, clearHistory, API_BASE } from '../services/api';

const ChatContext = createContext(null);

// Generate persistent session ID
const getSessionId = () => {
  let id = localStorage.getItem('chatbot_session_id');
  if (!id) {
    id = uuidv4();
    localStorage.setItem('chatbot_session_id', id);
  }
  return id;
};

const initialState = {
  messages: [],       // { id, role, content, timestamp, metadata }
  isTyping: false,
  sessionId: getSessionId(),
  isOnline: true,
  sidebarOpen: true,
  chatSessions: JSON.parse(localStorage.getItem('chatbot_sessions') || '[]'),
  
  // Advanced Features State
  activeModel: localStorage.getItem('chatbot_active_model') || 'gemini-flash',
  searchEnabled: localStorage.getItem('chatbot_search_enabled') === 'true',
  responseTone: localStorage.getItem('chatbot_response_tone') || 'detailed',
  bypassNLP: localStorage.getItem('chatbot_bypass_nlp') === 'true',
  activeImage: null, // base64 string
};

function reducer(state, action) {
  switch (action.type) {
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };
    
    case 'UPDATE_MESSAGE_CONTENT':
      return {
        ...state,
        messages: state.messages.map(msg =>
          msg.id === action.payload.id
            ? { ...msg, content: action.payload.content, metadata: action.payload.metadata || msg.metadata }
            : msg
        ),
      };

    case 'SET_TYPING':
      return { ...state, isTyping: action.payload };
    
    case 'SET_ONLINE':
      return { ...state, isOnline: action.payload };
    
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarOpen: !state.sidebarOpen };
    
    case 'CLEAR_MESSAGES':
      return { ...state, messages: [] };
    
    case 'SET_MESSAGES':
      return { ...state, messages: action.payload };

    case 'SET_SESSION_ID':
      localStorage.setItem('chatbot_session_id', action.payload);
      return { ...state, sessionId: action.payload };

    case 'NEW_SESSION': {
      const newId = uuidv4();
      localStorage.setItem('chatbot_session_id', newId);
      return { ...state, messages: [], sessionId: newId, activeImage: null };
    }
    
    case 'SAVE_SESSION': {
      // Check if session already exists in list
      const exists = state.chatSessions.some(s => s.id === action.payload.id);
      let sessions = [...state.chatSessions];
      if (exists) {
        sessions = sessions.map(s => s.id === action.payload.id ? { ...s, title: action.payload.title } : s);
      } else {
        sessions = [action.payload, ...state.chatSessions.slice(0, 19)]; // Limit to 20 recent sessions
      }
      localStorage.setItem('chatbot_sessions', JSON.stringify(sessions));
      return { ...state, chatSessions: sessions };
    }

    // Setting modifiers
    case 'SET_ACTIVE_MODEL':
      localStorage.setItem('chatbot_active_model', action.payload);
      return { ...state, activeModel: action.payload };

    case 'SET_SEARCH_ENABLED':
      localStorage.setItem('chatbot_search_enabled', String(action.payload));
      return { ...state, searchEnabled: action.payload };

    case 'SET_RESPONSE_TONE':
      localStorage.setItem('chatbot_response_tone', action.payload);
      return { ...state, responseTone: action.payload };

    case 'SET_BYPASS_NLP':
      localStorage.setItem('chatbot_bypass_nlp', String(action.payload));
      return { ...state, bypassNLP: action.payload };

    case 'SET_ACTIVE_IMAGE':
      return { ...state, activeImage: action.payload };

    default:
      return state;
  }
}

export function ChatProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Settings modification callbacks
  const setActiveModel = useCallback((model) => dispatch({ type: 'SET_ACTIVE_MODEL', payload: model }), []);
  const setSearchEnabled = useCallback((enabled) => dispatch({ type: 'SET_SEARCH_ENABLED', payload: enabled }), []);
  const setResponseTone = useCallback((tone) => dispatch({ type: 'SET_RESPONSE_TONE', payload: tone }), []);
  const setBypassNLP = useCallback((bypass) => dispatch({ type: 'SET_BYPASS_NLP', payload: bypass }), []);
  const setActiveImage = useCallback((image) => dispatch({ type: 'SET_ACTIVE_IMAGE', payload: image }), []);

  // Send a chat message (uses SSE streaming reader)
  const sendMessage = useCallback(async (text) => {
    if (!text.trim() && !state.activeImage) return;

    const userMessageContent = text.trim();
    const currentImage = state.activeImage;

    // Clear active image preview once sending starts
    dispatch({ type: 'SET_ACTIVE_IMAGE', payload: null });

    // Add user message immediately
    const userMsgId = uuidv4();
    const userMsg = {
      id: userMsgId,
      role: 'user',
      content: userMessageContent,
      timestamp: new Date().toISOString(),
      // Attach image preview if there is one
      metadata: currentImage ? { image: currentImage } : undefined,
    };
    dispatch({ type: 'ADD_MESSAGE', payload: userMsg });
    dispatch({ type: 'SET_TYPING', payload: true });

    // Save session title if this is the first message in this conversation
    if (state.messages.length === 0) {
      dispatch({
        type: 'SAVE_SESSION',
        payload: {
          id: state.sessionId,
          title: userMessageContent ? (userMessageContent.slice(0, 40) + (userMessageContent.length > 40 ? '…' : '')) : 'Image Conversation',
          timestamp: new Date().toISOString(),
        },
      });
    }

    const botMsgId = uuidv4();
    const initialBotMsg = {
      id: botMsgId,
      role: 'bot',
      content: '',
      timestamp: new Date().toISOString(),
      metadata: { responseType: 'ai_stream' },
    };
    dispatch({ type: 'ADD_MESSAGE', payload: initialBotMsg });

    try {
      // POST with SSE enabled
      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessageContent || 'Please analyze this image.',
          sessionId: state.sessionId,
          model: state.activeModel,
          searchEnabled: state.searchEnabled,
          responseTone: state.responseTone,
          bypassNLP: state.bypassNLP,
          image: currentImage,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Server responded with ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedText = '';
      let finalMetadata = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Hold onto partial line

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          if (trimmed.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(trimmed.slice(6));
              
              if (parsed.token) {
                accumulatedText += parsed.token;
                dispatch({
                  type: 'UPDATE_MESSAGE_CONTENT',
                  payload: { id: botMsgId, content: accumulatedText }
                });
              }
              
              if (parsed.error) {
                throw new Error(parsed.error);
              }

              if (parsed.done) {
                finalMetadata = parsed.metadata;
                if (parsed.fullText) {
                  accumulatedText = parsed.fullText;
                }
              }
            } catch (err) {
              // Ignore line parsing mistakes
            }
          }
        }
      }

      // Finalize with metadata (citations, processing time, etc.)
      dispatch({
        type: 'UPDATE_MESSAGE_CONTENT',
        payload: {
          id: botMsgId,
          content: accumulatedText,
          metadata: finalMetadata || { responseType: 'ai_complete' }
        }
      });
      dispatch({ type: 'SET_ONLINE', payload: true });

    } catch (err) {
      console.error('[Chat Stream Error]', err);
      dispatch({ type: 'SET_ONLINE', payload: false });
      dispatch({
        type: 'UPDATE_MESSAGE_CONTENT',
        payload: {
          id: botMsgId,
          content: `⚠️ Error: ${err.message || 'Unable to connect to the backend server. Please make sure the backend is running.'}`,
          metadata: { responseType: 'error' }
        }
      });
    } finally {
      dispatch({ type: 'SET_TYPING', payload: false });
    }
  }, [state.sessionId, state.activeModel, state.searchEnabled, state.responseTone, state.bypassNLP, state.activeImage, state.messages.length]);

  // Load a session's history and switch to it
  const selectSession = useCallback(async (id) => {
    dispatch({ type: 'SET_SESSION_ID', payload: id });
    dispatch({ type: 'SET_TYPING', payload: true });
    dispatch({ type: 'SET_ACTIVE_IMAGE', payload: null });
    
    try {
      const data = await getChatHistory(id);
      
      const formattedMessages = data.history.flatMap((msg, index) => {
        // If it's a user message, check if we want to separate metadata or construct it
        // We recreate simple messages
        const formatted = {
          id: `${id}-msg-${index}`,
          role: msg.role === 'user' ? 'user' : 'bot',
          content: msg.content,
          timestamp: new Date().toISOString(),
        };
        return [formatted];
      });
      
      dispatch({ type: 'SET_MESSAGES', payload: formattedMessages });
      dispatch({ type: 'SET_ONLINE', payload: true });
    } catch (err) {
      console.error('[Load Session Error]', err);
      dispatch({ type: 'SET_MESSAGES', payload: [] });
      dispatch({ type: 'SET_ONLINE', payload: false });
    } finally {
      dispatch({ type: 'SET_TYPING', payload: false });
    }
  }, []);

  // Clear current active session's conversation
  const clearSession = useCallback(async () => {
    try {
      await clearHistory(state.sessionId);
      dispatch({ type: 'CLEAR_MESSAGES' });
    } catch (err) {
      console.error('[Clear History Error]', err);
    }
  }, [state.sessionId]);

  // Reset context to create a new session
  const newChat = useCallback(() => {
    dispatch({ type: 'NEW_SESSION' });
  }, []);

  const toggleSidebar = useCallback(() => dispatch({ type: 'TOGGLE_SIDEBAR' }), []);

  return (
    <ChatContext.Provider
      value={{
        ...state,
        sendMessage,
        newChat,
        selectSession,
        clearSession,
        toggleSidebar,
        setActiveModel,
        setSearchEnabled,
        setResponseTone,
        setBypassNLP,
        setActiveImage
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
}
