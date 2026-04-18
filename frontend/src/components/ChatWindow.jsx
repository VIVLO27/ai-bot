import { useEffect, useRef } from 'react';
import { useChat } from '../context/ChatContext';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import WelcomeScreen from './WelcomeScreen';

export default function ChatWindow() {
  const { messages, isTyping } = useChat();
  const bottomRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  return (
    <div className="chat-window" id="chat-window" role="log" aria-live="polite" aria-label="Chat messages">
      {messages.length === 0 ? (
        <WelcomeScreen />
      ) : (
        <>
          {messages.map((msg, idx) => {
            const showDivider = idx === 0 || (
              new Date(messages[idx - 1]?.timestamp).toDateString() !== new Date(msg.timestamp).toDateString()
            );
            return (
              <div key={`msg-${msg.id}`}>
                {showDivider && (
                  <div className="date-divider">
                    <div className="date-divider-line" />
                    <div className="date-divider-text">
                      {new Date(msg.timestamp).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </div>
                    <div className="date-divider-line" />
                  </div>
                )}
                <MessageBubble message={msg} />
              </div>
            );
          })}
          {isTyping && <TypingIndicator />}
          <div ref={bottomRef} />
        </>
      )}
    </div>
  );
}
