import React, { useState, useEffect } from 'react';
import { useChat } from '../context/ChatContext';
import { API_BASE } from '../services/api';

export default function SidePanel() {
  const {
    sidebarOpen,
    newChat,
    chatSessions,
    sessionId,
    selectSession,
    activeModel,
    setActiveModel,
    responseTone,
    setResponseTone,
    bypassNLP,
    setBypassNLP
  } = useChat();

  // On mobile: use 'open' class when sidebar is visible
  // On desktop: use 'collapsed' when hidden (width-based)
  const isMobile = window.innerWidth <= 768;
  const sidebarClass = isMobile
    ? (sidebarOpen ? 'open' : 'collapsed')
    : (sidebarOpen ? '' : 'collapsed');

  const [availableModels, setAvailableModels] = React.useState([
    { id: 'google/gemini-2.5-flash:free',          name: '🤖 Gemini 2.5 Flash (Free)' },
    { id: 'google/gemini-2.5-pro:free',            name: '🧠 Gemini 2.5 Pro (Free)' },
    { id: 'deepseek/deepseek-r1:free',             name: '💭 DeepSeek R1 Reasoning (Free)' },
    { id: 'meta-llama/llama-3.3-70b-instruct:free',name: '🦙 Llama 3.3 70B (Free)' },
    { id: 'google/gemma-2-9b-it:free',             name: '💎 Gemma 2 9B (Free)' },
    { id: 'meta-llama/llama-3.2-3b-instruct:free', name: '🍃 Llama 3.2 3B (Free)' },
    { id: 'mistralai/mistral-7b-instruct:free',    name: '⚡ Mistral 7B (Free)' },
    { id: 'microsoft/phi-4:free',                  name: '🔬 Microsoft Phi-4 (Free)' },
  ]);

  React.useEffect(() => {
    fetch(`${API_BASE}/models`)
      .then(res => res.json())
      .then(data => {
        if (data.models && data.models.length > 0) {
          // Only show FREE models — filter out anything that requires paid credits
          const freeModels = data.models
            .filter(m => m.id.endsWith(':free'))
            .map(m => ({ id: m.id, name: m.name + ' (Free)' }));
          if (freeModels.length > 0) {
            setAvailableModels(freeModels);
          }
        }
      })
      .catch(err => console.error('Failed to fetch models:', err));
  }, []);

  const formatTime = (iso) => {
    const date = new Date(iso);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <aside className={`sidebar ${sidebarClass}`} aria-label="Chat sidebar">
      {/* Header section with Logo & New Chat */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🤖</div>
          <div className="sidebar-logo-text">NeuralChat</div>
        </div>
        <button id="new-chat-sidebar-btn" className="new-chat-btn" onClick={newChat}>
          <span>✏️</span>
          <span>New Conversation</span>
        </button>
      </div>

      {/* Control Panel Settings */}
      <div className="sidebar-section">Settings & Control</div>
      <div className="sidebar-settings">
        {/* Model Selector */}
        <div className="setting-group">
          <label htmlFor="model-select">AI Model</label>
          <select
            id="model-select"
            className="setting-select"
            value={activeModel}
            onChange={(e) => setActiveModel(e.target.value)}
          >
            {availableModels.map(model => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
        </div>

        {/* Response Tone buttons */}
        <div className="setting-group">
          <label>Response Style</label>
          <div className="tone-buttons">
            {['concise', 'detailed', 'creative'].map((tone) => (
              <button
                key={tone}
                className={`tone-btn ${responseTone === tone ? 'active' : ''}`}
                onClick={() => setResponseTone(tone)}
                title={`${tone.charAt(0).toUpperCase() + tone.slice(1)} response tone`}
              >
                {tone.charAt(0).toUpperCase() + tone.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Bypass Local NLP Checkbox */}
        <div className="setting-group-toggle">
          <label className="toggle-label" title="By default, NeuralChat runs a fast local NLP classifier first. Enable this to bypass it and send all messages directly to the LLM.">
            <input
              type="checkbox"
              checked={bypassNLP}
              onChange={(e) => setBypassNLP(e.target.checked)}
            />
            <span>Bypass Local NLP Engine</span>
          </label>
        </div>
      </div>

      {/* Chat History section */}
      <div className="sidebar-section">Recent Chats</div>

      <div className="sidebar-chat-list">
        {chatSessions.length === 0 ? (
          <div style={{ padding: '16px 12px', color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center' }}>
            No conversations yet.<br />Start chatting!
          </div>
        ) : (
          chatSessions.map((session, idx) => (
            <div
              key={`${session.id}-${idx}`}
              id={`session-${session.id?.slice(0, 8)}`}
              className={`sidebar-chat-item ${session.id === sessionId ? 'active' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => selectSession(session.id)}
              onKeyDown={(e) => e.key === 'Enter' && selectSession(session.id)}
            >
              <span style={{ fontSize: '16px' }}>💬</span>
              <div style={{ overflow: 'hidden' }}>
                <div className="sidebar-chat-item-text">{session.title}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatTime(session.timestamp)}</div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-tech-badge">
          <div>Powered by</div>
          <div><span></span> · <span></span></div>
          <div><span>OpenRouter AI</span></div>
          <div style={{ marginTop: '4px', fontSize: '10px' }}></div>
        </div>
      </div>
    </aside>
  );
}
