import React, { useState } from 'react';
import { Layout } from 'antd';
import Navigation from './components/workspace/Navigation';
import FileManager from './components/workspace/FileManager';
import KnowledgeBaseManager from './components/workspace/KnowledgeBaseManager';
import OutlineGenerator from './components/workspace/OutlineGenerator';
import ScriptEditor from './components/workspace/ScriptEditor';

const { Content } = Layout;

function App() {
  const [activeView, setActiveView] = useState('files');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(250);

  const renderContent = () => {
    switch (activeView) {
      case 'files':
        return <FileManager />;
      case 'knowledge-base':
        return <KnowledgeBaseManager />;
      case 'outline':
        return <OutlineGenerator />;
      case 'script':
        return <ScriptEditor />;
      default:
        return <FileManager />;
    }
  };

  return (
    <Layout className="app">
      <Navigation
        activeView={activeView}
        onViewChange={setActiveView}
        collapsed={sidebarCollapsed}
        onCollapse={setSidebarCollapsed}
        width={sidebarWidth}
        onWidthChange={setSidebarWidth}
      />
      <Layout style={{ marginLeft: sidebarCollapsed ? 80 : sidebarWidth }}>
        <Content className="main-content">
          {renderContent()}
        </Content>
      </Layout>
    </Layout>
  );
}

export default App;
