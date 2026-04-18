import { ChatProvider, useChat } from './context/ChatContext';
import SidePanel from './components/SidePanel';
import Header from './components/Header';
import ChatWindow from './components/ChatWindow';
import InputBar from './components/InputBar';

function ChatLayout() {
  const { sidebarOpen, toggleSidebar } = useChat();

  return (
    <div className="app">
      {/* Dark overlay behind sidebar on mobile — tap to close */}
      <div
        className={`sidebar-overlay${sidebarOpen ? ' visible' : ''}`}
        onClick={toggleSidebar}
        aria-hidden="true"
      />

      <SidePanel />

      <div className="main">
        <Header />
        <ChatWindow />
        <InputBar />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ChatProvider>
      {/* Animated background orbs */}
      <div className="bg-orbs" aria-hidden="true">
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
        <div className="bg-orb bg-orb-3" />
      </div>

      <ChatLayout />
    </ChatProvider>
  );
}
