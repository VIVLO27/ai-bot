import { useState } from 'react';

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

/**
 * Format inline elements like bold, italic, links, citations, and inline code
 */
function formatInline(text) {
  if (!text) return '';

  return text
    // Escape HTML characters
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Bold: **text**
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic: *text*
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Inline code: `code`
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Citations [1], [2] -> clickable reference scroll links
    .replace(/\[(\d+)\]/g, '<a href="#citation-$1" class="citation-ref"><span class="citation-number">$1</span></a>')
    // Links: [text](url)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    // Line breaks
    .replace(/\n/g, '<br/>');
}

/**
 * Custom block-level parser for Headers, Lists, Tables, and Paragraphs
 */
function parseBlocks(text, blockKey) {
  const trimmed = text.trim();
  if (!trimmed) return null;

  // 1. Parse Tables
  if (trimmed.startsWith('|') && trimmed.includes('\n')) {
    const lines = trimmed.split('\n');
    if (lines.length >= 2) {
      const parseCells = (line) => line.split('|').map(c => c.trim()).filter((c, i, arr) => i > 0 && i < arr.length - 1);
      
      const headers = parseCells(lines[0]);
      // Skip the separator line (lines[1], e.g. |---|---|)
      const rows = lines.slice(2).map(parseCells).filter(row => row.length > 0);

      return (
        <table key={`table-${blockKey}`}>
          <thead>
            <tr>
              {headers.map((h, idx) => <th key={idx} dangerouslySetInnerHTML={{ __html: formatInline(h) }} />)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr key={rowIdx}>
                {row.map((cell, cellIdx) => <td key={cellIdx} dangerouslySetInnerHTML={{ __html: formatInline(cell) }} />)}
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
  }

  // 2. Parse Lists (Ordered & Unordered)
  const lines = trimmed.split('\n');
  const isUnordered = lines.every(l => l.trim().startsWith('- ') || l.trim().startsWith('* '));
  const isOrdered = lines.every(l => /^\d+\.\s/.test(l.trim()));

  if (isUnordered && lines.length > 0) {
    return (
      <ul key={`ul-${blockKey}`}>
        {lines.map((l, idx) => {
          const content = l.trim().replace(/^[-*]\s+/, '');
          return <li key={idx} dangerouslySetInnerHTML={{ __html: formatInline(content) }} />;
        })}
      </ul>
    );
  }

  if (isOrdered && lines.length > 0) {
    return (
      <ol key={`ol-${blockKey}`}>
        {lines.map((l, idx) => {
          const content = l.trim().replace(/^\d+\.\s+/, '');
          return <li key={idx} dangerouslySetInnerHTML={{ __html: formatInline(content) }} />;
        })}
      </ol>
    );
  }

  // 3. Parse Headers
  if (trimmed.startsWith('#')) {
    const headerMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const content = headerMatch[2];
      const Tag = `h${level}`;
      return <Tag key={`h-${blockKey}`} dangerouslySetInnerHTML={{ __html: formatInline(content) }} />;
    }
  }

  // 4. Default Paragraph
  return (
    <p
      key={`p-${blockKey}`}
      style={{ marginBottom: '10px' }}
      dangerouslySetInnerHTML={{ __html: formatInline(trimmed) }}
    />
  );
}

/**
 * Custom Markdown-to-JSX Parser
 */
function renderMarkdown(content) {
  if (!content) return '';

  // Split by code blocks
  const parts = content.split(/(```[\s\S]*?```)/g);

  return parts.map((part, index) => {
    if (part.startsWith('```')) {
      const match = part.match(/```(\w*)\n?([\s\S]*?)```/);
      const language = match ? match[1] : '';
      const codeText = match ? match[2] : '';
      return <CodeBlock key={`code-${index}`} language={language} code={codeText} />;
    } else {
      // Split remaining text into double-newline paragraphs/blocks
      const blocks = part.split(/\n\s*\n/);
      return blocks.map((block, bIdx) => parseBlocks(block, `${index}-${bIdx}`));
    }
  });
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
          {content ? renderMarkdown(content) : (
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
