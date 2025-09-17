import React, { useState } from 'react';
import { Layout } from 'antd';
import Navigation from './components/workspace/Navigation';
import ArchiveManager from './components/workspace/ArchiveManager';
import ScriptEditor from './components/workspace/ScriptEditor';

const { Content } = Layout;

function App() {
  const [activeView, setActiveView] = useState('data');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(250);

  const renderContent = () => {
    switch (activeView) {
      case 'data':
        return <ArchiveManager />;
      case 'script':
        return <ScriptEditor />;
      default:
        return <ArchiveManager />;
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
