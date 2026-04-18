import { useChat } from '../context/ChatContext';

export default function Header() {
  const { isOnline, sidebarOpen, toggleSidebar, newChat } = useChat();

  return (
    <header className="header">
      <div className="header-left">
        <button
          id="sidebar-toggle-btn"
          className="header-toggle-btn"
          onClick={toggleSidebar}
          title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          aria-label="Toggle sidebar"
        >
          {sidebarOpen ? '✕' : '☰'}
        </button>
        <div>
          <div className="header-title">NeuralChat <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>by Vivek Padhiyar</span></div>
          <div className="header-subtitle">TF-IDF · Cosine Similarity · NLP</div>
        </div>
      </div>

      <div className="header-right">
        <div
          className="status-badge"
          style={!isOnline ? { background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.2)', color: '#f87171' } : {}}
        >
          <div
            className="status-dot"
            style={!isOnline ? { background: '#f87171', animationDuration: '1s' } : {}}
          />
          <span>{isOnline ? 'AI Online' : 'Offline'}</span>
        </div>
        <button
          id="new-chat-btn-header"
          className="header-icon-btn"
          onClick={newChat}
          title="New chat"
          aria-label="Start new chat"
        >
          ✏️
        </button>
      </div>
    </header>
  );
}
