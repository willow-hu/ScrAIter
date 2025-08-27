import React, { useState } from 'react';
import TreeEditor from './components/tree_editor/TreeEditor';

function App() {
  const [activeTab, setActiveTab] = useState('editor');

  return (
    <div className="app">
      <nav className="navbar">
        <div className="nav-tabs">
          <button 
            className={`nav-tab ${activeTab === 'generator' ? 'active' : ''}`}
            onClick={() => setActiveTab('generator')}
          >
            剧本结构生成器
          </button>
          <button 
            className={`nav-tab ${activeTab === 'editor' ? 'active' : ''}`}
            onClick={() => setActiveTab('editor')}
          >
            剧本结构编辑器
          </button>
        </div>
      </nav>
      
      <div className="main-content">
        {activeTab === 'editor' ? (
          <TreeEditor />
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: '#666' }}>
            剧本结构生成器功能待开发
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
