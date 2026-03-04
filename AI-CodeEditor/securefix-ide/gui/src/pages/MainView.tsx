import React, { useState, useEffect, useRef } from 'react';
import { useAppSelector } from '../store';
import { selectPendingDiffZones, selectFixStream } from '../store/diffSlice';
import VulnerabilityPanel from '../components/VulnerabilityPanel/VulnerabilityPanel';
import ChatPanel from '../components/Chat/ChatPanel';
import DiffViewer from '../components/DiffViewer/DiffViewer';

type Tab = 'vulnerabilities' | 'chat' | 'diff';


interface TabConfig {
  id: Tab;
  label: string;
  icon: string;
  badge?: number;
}

const tabs: TabConfig[] = [
  { id: 'vulnerabilities', label: 'Vulnerabilities', icon: '🛡️' },
  { id: 'chat', label: 'AI Chat', icon: '🤖' },
  { id: 'diff', label: 'Fixes', icon: '🔧' },
];

const MainView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('vulnerabilities');
  const pendingZones = useAppSelector(selectPendingDiffZones);
  const fixStream = useAppSelector(selectFixStream);
  const prevPendingCount = useRef(pendingZones.length);

  // Auto-switch to Fixes tab when fix generation starts or a new pending fix appears
  useEffect(() => {
    if (fixStream) {
      setActiveTab('diff');
    }
  }, [fixStream]);

  useEffect(() => {
    if (pendingZones.length > prevPendingCount.current) {
      setActiveTab('diff');
    }
    prevPendingCount.current = pendingZones.length;
  }, [pendingZones.length]);

  return (
    <div className="panel h-full flex flex-col bg-[var(--vscode-editor-background)]">
      {/* Tab Navigation */}
      <div className="flex border-b border-[var(--vscode-panel-border)] bg-[var(--vscode-editor-background)]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`
              relative px-5 py-3 text-sm cursor-pointer
              flex items-center gap-2.5 transition-all duration-200
              ${activeTab === tab.id
                ? 'text-[var(--vscode-tab-activeForeground)]'
                : 'text-[var(--vscode-tab-inactiveForeground)] hover:text-[var(--vscode-tab-activeForeground)] hover:bg-[var(--vscode-list-hoverBackground)]'
              }
            `}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="text-base leading-none">{tab.icon}</span>
            <span className="font-medium">{tab.label}</span>
            {/* Active underline indicator */}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-[var(--vscode-focusBorder)] animate-scale-in" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="panel-content flex-1 overflow-hidden">
        <div className="h-full overflow-auto">
          {activeTab === 'vulnerabilities' && (
            <div className="animate-fade-in h-full">
              <VulnerabilityPanel />
            </div>
          )}
          {activeTab === 'chat' && (
            <div className="animate-fade-in h-full">
              <ChatPanel />
            </div>
          )}
          {activeTab === 'diff' && (
            <div className="animate-fade-in h-full">
              <DiffViewer />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MainView;
