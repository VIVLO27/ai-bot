import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Stateful CodeBlock component with copy to clipboard functionality
 */
function CodeBlock({ language, code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-block-wrapper">
      <div className="code-block-header">
        <span>{language ? language.toLowerCase() : 'code'}</span>
        <button className="code-copy-btn" onClick={handleCopy}>
          {copied ? 'Copied! ✓' : 'Copy'}
        </button>
      </div>
      <pre>
        <code>{code.trim()}</code>
      </pre>
    </div>
  );
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
        
        {/* User image attachment preview */}
        {!isBot && metadata && metadata.image && (
          <div className="message-attachment">
            <img 
              src={metadata.image} 
              alt="Uploaded context" 
              onClick={() => window.open(metadata.image, '_blank')}
              title="Click to view full image"
            />
          </div>
        )}

        {/* Message Content Bubble */}
        <div className={`message-bubble ${role}`}>
          {content ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code(props) {
                  const {children, className, node, ...rest} = props
                  const match = /language-(\w+)/.exec(className || '')
                  return match ? (
                    <CodeBlock language={match[1]} code={String(children)} />
                  ) : (
                    <code {...rest} className={className}>
                      {children}
                    </code>
                  )
                }
              }}
            >
              {content}
            </ReactMarkdown>
          ) : (
            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Analyzing image context...</span>
          )}

          {/* Web Search Grounding Citations */}
          {isBot && metadata && metadata.searchResults && metadata.searchResults.length > 0 && (
            <div className="search-citations">
              <div className="citations-title">
                <span>🌐</span> Sources & Citations
              </div>
              <div className="citations-list">
                {metadata.searchResults.map((result, idx) => (
                  <a
                    key={idx}
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="citation-card"
                    id={`citation-${idx + 1}`}
                    title={result.snippet}
                  >
                    <span className="citation-number">{idx + 1}</span>
                    <span>{result.title.length > 30 ? `${result.title.slice(0, 30)}…` : result.title}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Message Metadata footer */}
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
