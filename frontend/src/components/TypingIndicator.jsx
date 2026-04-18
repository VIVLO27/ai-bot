export default function TypingIndicator() {
  return (
    <div className="typing-container" aria-label="Bot is typing">
      <div className="message-avatar bot" aria-hidden="true">🤖</div>
      <div className="typing-bubble">
        <div className="typing-dot" />
        <div className="typing-dot" />
        <div className="typing-dot" />
      </div>
    </div>
  );
}
