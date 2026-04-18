import { useChat } from '../context/ChatContext';

export default function SidePanel() {
  const { sidebarOpen, newChat, chatSessions } = useChat();

  // On mobile: use 'open' class when sidebar is visible
  // On desktop: use 'collapsed' when hidden (width-based)
  const isMobile = window.innerWidth <= 768;
  const sidebarClass = isMobile
    ? sidebarOpen ? 'open' : 'collapsed'
    : sidebarOpen ? '' : 'collapsed';

  const formatTime = (iso) => {
    const date = new Date(iso);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <aside className={`sidebar ${sidebarClass}`} aria-label="Chat sidebar">
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
              className="sidebar-chat-item"
              role="button"
              tabIndex={0}
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
          <div><span>TF-IDF</span> · <span>Cosine Sim</span></div>
          <div><span>OpenRouter AI</span></div>
          <div style={{ marginTop: '4px', fontSize: '10px' }}>NLP Research Project</div>
        </div>

        {/* Developer Credit */}
        <div className="developer-credit">
          <span>👨‍💻</span>
          <span>Developed by <strong>Vivek Padhiyar</strong></span>
        </div>
      </div>
    </aside>
  );
}
