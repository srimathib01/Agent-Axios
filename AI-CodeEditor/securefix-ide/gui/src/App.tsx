import { useEffect } from 'react';
import { useMessaging } from './hooks/useMessaging';
import MainView from './pages/MainView';

function App() {
  const { sendMessage, isReady } = useMessaging();

  useEffect(() => {
    // Send gui_ready message when component mounts
    if (isReady) {
      sendMessage({
        type: 'gui_ready',
        id: `msg-${Date.now()}`,
        timestamp: Date.now()
      });
    }
  }, [isReady, sendMessage]);

  return (
    <div className="h-screen w-full overflow-hidden">
      <MainView />
    </div>
  );
}

export default App;
