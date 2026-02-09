import React, { useState } from 'react';
import VulnerabilityPanel from '../components/VulnerabilityPanel/VulnerabilityPanel';
import ChatPanel from '../components/Chat/ChatPanel';
import DiffViewer from '../components/DiffViewer/DiffViewer';

type Tab = 'vulnerabilities' | 'chat' | 'diff';

const MainView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('vulnerabilities');

  return (
    <div className="panel">
      {/* Tab Navigation */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'vulnerabilities' ? 'active' : ''}`}
          onClick={() => setActiveTab('vulnerabilities')}
        >
          Vulnerabilities
        </button>
        <button
          className={`tab ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          AI Chat
        </button>
        <button
          className={`tab ${activeTab === 'diff' ? 'active' : ''}`}
          onClick={() => setActiveTab('diff')}
        >
          Fixes
        </button>
      </div>

      {/* Tab Content */}
      <div className="panel-content">
        {activeTab === 'vulnerabilities' && <VulnerabilityPanel />}
        {activeTab === 'chat' && <ChatPanel />}
        {activeTab === 'diff' && <DiffViewer />}
      </div>
    </div>
  );
};

export default MainView;
