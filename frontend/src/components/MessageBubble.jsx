/**
 * MessageBubble — renders a chat message with markdown formatting support
 */

function formatContent(content) {
  if (!content) return '';

  return content
    // Bold: **text**
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic: *text*
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Inline code: `code`
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Code blocks: ```code```
    .replace(/```([\s\S]*?)```/g, '<pre>$1</pre>')
    // Links: [text](url)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    // Line breaks
    .replace(/\n/g, '<br/>');
}

function formatTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function getConfidenceClass(score) {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

export default function MessageBubble({ message }) {
  const { role, content, timestamp, metadata } = message;
  const isBot = role === 'bot';

  return (
    <div className={`message-container ${role}`} role="article" aria-label={`${role} message`}>
      <div className={`message-avatar ${role}`} aria-hidden="true">
        {isBot ? '🤖' : '👤'}
      </div>

      <div className="message-bubble-wrap">
        <div
          className={`message-bubble ${role}`}
          dangerouslySetInnerHTML={{ __html: formatContent(content) }}
        />

        <div className="message-meta">
          <span>{formatTime(timestamp)}</span>

          {isBot && metadata && metadata.intent && metadata.intent !== 'default' && (
            <>
              <span>·</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: 'var(--accent-cyan)', opacity: 0.7 }}>
                #{metadata.intent}
              </span>
            </>
          )}

          {isBot && metadata && typeof metadata.confidence === 'number' && metadata.confidence > 0 && (
            <span className={`confidence-badge ${getConfidenceClass(metadata.confidence)}`}>
              {metadata.confidence.toFixed(0)}%
            </span>
          )}

          {isBot && metadata && metadata.processingTime && (
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              {metadata.processingTime}ms
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
