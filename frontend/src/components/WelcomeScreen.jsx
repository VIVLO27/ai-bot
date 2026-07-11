import { useChat } from '../context/ChatContext';

const QUICK_CHIPS = [
  { icon: '👋', text: 'Hello! Who are you?' },
  { icon: '🌤️', text: 'Weather in Mumbai' },
  { icon: '🧠', text: 'What is NLP?' },
  { icon: '😄', text: 'Tell me a joke' },
  { icon: '🌍', text: 'Tell me about AI' },
  { icon: '🧮', text: 'Calculate 25 × 48' },
  { icon: '💡', text: 'Motivate me' },
  { icon: '📚', text: 'What is Machine Learning?' },
];

export default function WelcomeScreen() {
  const { sendMessage } = useChat();

  return (
    <div className="welcome-screen">
      <div className="welcome-bot-icon">🤖</div>

      <div>
        <h1 className="welcome-title">NeuralChat AI</h1>
        <p className="welcome-subtitle">
          An intelligent chatbot. Ask me anything!
        </p>
      </div>

      <div className="welcome-guide-box">
        <h3>💡 How to use NeuralChat AI</h3>
        <ul className="welcome-guide-list">
          <li><strong>Models:</strong> Switch between AI models (Gemini, Llama, DeepSeek) using the left sidebar.</li>
          <li><strong>Web Search:</strong> Toggle the 🌐 icon in the input bar to enable live web search grounding.</li>
          <li><strong>Images:</strong> Click the 📎 icon or paste an image for multimodal analysis (supported by Gemini).</li>
          <li><strong>Response Tone:</strong> Change response style (Concise, Detailed, Creative) in settings.</li>
          <li><strong>Quick Start:</strong> Click any of the chips below to try out some examples!</li>
        </ul>
      </div>

      <div className="welcome-nlp-badges">
        <span className="nlp-badge tfidf">TF-IDF Vectors</span>
        <span className="nlp-badge cosine">Cosine Similarity</span>
        <span className="nlp-badge intent">Intent Classification</span>
        <span className="nlp-badge entity">Entity Extraction</span>
      </div>

      <div className="welcome-chips">
        {QUICK_CHIPS.map((chip, i) => (
          <button
            key={i}
            id={`quick-chip-${i}`}
            className="welcome-chip"
            onClick={() => sendMessage(chip.text)}
            aria-label={`Quick action: ${chip.text}`}
          >
            <span>{chip.icon}</span>
            <span>{chip.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
