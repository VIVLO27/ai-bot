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
        {/* Model Display */}
        <div className="setting-group">
          <label>AI Model</label>
          <select 
            value={activeModel} 
            onChange={(e) => setActiveModel(e.target.value)}
            className="setting-select"
            style={{ width: '100%', padding: '12px', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', cursor: 'pointer' }}
          >
            <option value="google/gemini-2.5-flash:free">🤖 Gemini 2.5 Flash</option>
            <option value="google/gemini-2.5-pro:free">🧠 Gemini 2.5 Pro</option>
            <option value="meta-llama/llama-3.3-70b-instruct:free">🦙 Llama 3.3 70B</option>
            <option value="deepseek/deepseek-r1:free">🐳 DeepSeek R1</option>
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
