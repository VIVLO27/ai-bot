import { useState, useRef, useCallback } from 'react';
import { useChat } from '../context/ChatContext';

export default function InputBar() {
  const [input, setInput] = useState('');
  const {
    sendMessage,
    isTyping,
    searchEnabled,
    setSearchEnabled,
    activeImage,
    setActiveImage
  } = useChat();

  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if ((!trimmed && !activeImage) || isTyping) return;
    
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    
    await sendMessage(trimmed);
  }, [input, activeImage, isTyping, sendMessage]);

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

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setActiveImage(event.target.result);
      };
      reader.readAsDataURL(file);
    }
    // Reset file input value so same file can be selected again
    e.target.value = '';
  };

  const handlePaste = useCallback((e) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            const reader = new FileReader();
            reader.onload = (event) => {
              setActiveImage(event.target.result);
            };
            reader.readAsDataURL(file);
            break;
          }
        }
      }
    }
  }, [setActiveImage]);

  return (
    <div className="input-bar">
      <div className="input-bar-inner" style={{ flexDirection: 'column', gap: '0' }}>
        
        {/* Image Attachment Preview */}
        {activeImage && (
          <div className="image-preview-container" style={{ width: '100%' }}>
            <div className="preview-thumb-wrap">
              <img src={activeImage} alt="Upload preview" className="preview-thumb" />
              <button
                className="preview-remove-btn"
                onClick={() => setActiveImage(null)}
                aria-label="Remove image"
                title="Remove image"
              >
                ✕
              </button>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Image attached (will be analyzed by Gemini)
            </span>
          </div>
        )}

        <div style={{ display: 'flex', width: '100%', gap: '10px', alignItems: 'flex-end', marginTop: activeImage ? '8px' : '0' }}>
          {/* Main Input Wrapper */}
          <div className="input-wrapper" style={{ borderTopLeftRadius: activeImage ? '0' : '20px', borderTopRightRadius: activeImage ? '0' : '20px' }}>
            
            {/* Input Controls Panel (Attach File & Web Search) */}
            <div className="input-controls">
              {/* File input clicker */}
              <button
                type="button"
                className="icon-btn-control"
                onClick={() => fileInputRef.current?.click()}
                title="Attach image (multimodal)"
                aria-label="Attach image file"
              >
                📎
              </button>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                onChange={handleFileChange}
              />

              {/* Web Search Toggle */}
              <button
                type="button"
                className={`icon-btn-control ${searchEnabled ? 'active' : ''}`}
                onClick={() => setSearchEnabled(!searchEnabled)}
                title={searchEnabled ? "Disable Web Search" : "Enable Web Search"}
                aria-label="Toggle web search grounding"
              >
                🌐
              </button>
            </div>

            {/* Chat Textarea */}
            <textarea
              ref={textareaRef}
              id="chat-input"
              className="input-textarea"
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder="Ask me anything, paste an image, or search..."
              rows={1}
              disabled={isTyping}
              aria-label="Chat message input"
              autoFocus
            />

            <span className="input-hint" aria-hidden="true">
              {input.length > 0 ? `${input.length} chars` : 'Enter ↵'}
            </span>
          </div>

          {/* Send Button */}
          <button
            id="send-btn"
            className="send-btn"
            onClick={handleSend}
            disabled={(!input.trim() && !activeImage) || isTyping}
            aria-label="Send message"
            title="Send message"
          >
            {isTyping ? '⏳' : '➤'}
          </button>
        </div>
      </div>

      {/* Footer Info */}
      <div className="input-footer" aria-hidden="true">
        Gemini 2.5 Flash · Web Search Grounds · Cosine Similarity
      </div>
    </div>
  );
}
