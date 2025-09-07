import React, { act, useState } from 'react';
import ArchiveManager from './components/ArchiveManager';
import ScriptEditor from './components/ScriptEditor';

function App() {
  const [activeTab, setActiveTab] = useState('archive');

  return (
    <div className="app">
      <nav className="navbar">
        <div className="nav-tabs">
          <button
            className={`nav-tab ${activeTab === 'archive' ? 'active' : ''}`}
            onClick={() => setActiveTab('archive')}
          >
            资料管理
          </button>
          <button 
            className={`nav-tab ${activeTab === 'generator' ? 'active' : ''}`}
            onClick={() => setActiveTab('generator')}
          >
            结构生成
          </button>
          <button 
            className={`nav-tab ${activeTab === 'script' ? 'active' : ''}`}
            onClick={() => setActiveTab('script')}
          >
            脚本创作
          </button>
          {/* <button 
            className={`nav-tab ${activeTab === 'review' ? 'active' : ''}`}
            onClick={() => setActiveTab('review')}
          >
            内容校对
          </button> */}
        </div>
      </nav>
      
      <div className="main-content">
        {activeTab === 'archive' && <ArchiveManager />}
        {activeTab === 'generator' && (
          <div className="placeholder">
            <h2>结构生成</h2>
            <p>结构生成功能尚需规划</p>
          </div>
        )}
        {activeTab === 'script' && <ScriptEditor />}
        {/* {activeTab === 'review' && (
          <div className="placeholder">
            <h2>内容校对</h2>
            <p>内容校对功能待开发</p>
          </div>
        )} */}
      </div>
    </div>
  );
}

export default App;
