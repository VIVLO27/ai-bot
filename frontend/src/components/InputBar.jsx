import { useState, useRef, useCallback } from 'react';
import { useChat } from '../context/ChatContext';

export default function InputBar() {
  const [input, setInput] = useState('');
  const { sendMessage, isTyping } = useChat();
  const textareaRef = useRef(null);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isTyping) return;
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    await sendMessage(trimmed);
  }, [input, isTyping, sendMessage]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleInput = (e) => {
    setInput(e.target.value);
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  };

  return (
    <div className="input-bar">
      <div className="input-bar-inner">
        <div className="input-wrapper">
          <textarea
            ref={textareaRef}
            id="chat-input"
            className="input-textarea"
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything..."
            rows={1}
            disabled={isTyping}
            aria-label="Chat message input"
            autoFocus
          />
          <span className="input-hint" aria-hidden="true">
            {input.length > 0 ? `${input.length} chars` : 'Enter ↵'}
          </span>
        </div>

        <button
          id="send-btn"
          className="send-btn"
          onClick={handleSend}
          disabled={!input.trim() || isTyping}
          aria-label="Send message"
          title="Send message"
        >
          {isTyping ? '⏳' : '➤'}
        </button>
      </div>

      {/* Footer — hidden on mobile via CSS */}
      <div className="input-footer" aria-hidden="true">
        TF-IDF · Cosine Similarity · OpenRouter AI &nbsp;|&nbsp; Developed by <strong style={{ color: 'var(--text-accent)' }}>Vivek Padhiyar</strong>
      </div>
    </div>
  );
}
