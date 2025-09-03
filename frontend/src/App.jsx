import React, { act, useState } from 'react';
import TreeEditor from './components/tree_editor/TreeEditor';
import ContentGenerator from './components/content_generator/ContentGenerator';
import ArchiveManager from './components/archive_manager/ArchiveManager';
import StructureGenerator from './components/structure_generator/StructureGenerator';
import ScriptEditor from './components/script_editor/ScriptEditor';

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
        {activeTab === 'archive' && <ArchiveManager />}
        {activeTab === 'generator' && <StructureGenerator />}
        {activeTab === 'script' && <ScriptEditor />}
        {activeTab === 'editor' && <TreeEditor />}
        {activeTab === 'content' && <ContentGenerator />}
        {activeTab === 'review' && (
          <div className="placeholder">
            <h2>内容校对</h2>
            <p>内容校对功能待开发</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
