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
            结构生成
          </button>
          <button 
            className={`nav-tab ${activeTab === 'editor' ? 'active' : ''}`}
            onClick={() => setActiveTab('editor')}
          >
            结构编辑
          </button>
          <button 
            className={`nav-tab ${activeTab === 'content' ? 'active' : ''}`}
            onClick={() => setActiveTab('content')}
          >
            内容生成
          </button>
          <button 
            className={`nav-tab ${activeTab === 'review' ? 'active' : ''}`}
            onClick={() => setActiveTab('review')}
          >
            内容校对
          </button>
        </div>
      </nav>
      
      <div className="main-content">
        {activeTab === 'generator' && (
          <div className="placeholder">
            <h2>结构生成</h2>
            <p>这里将显示结构生成功能</p>
          </div>
        )}
        {activeTab === 'editor' && <TreeEditor />}
        {activeTab === 'content' && (
          <div className="placeholder">
            <h2>内容生成</h2>
            <p>这里将显示内容生成功能</p>
          </div>
        )}
        {activeTab === 'review' && (
          <div className="placeholder">
            <h2>内容校对</h2>
            <p>这里将显示内容校对功能</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
