import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Layout } from 'antd';
import Navigation from './components/workspace/Navigation';
import ArchiveManager from './components/workspace/ArchiveManager';
import ProjectManager from './components/workspace/ProjectManager';
import ScriptEditor from './components/workspace/ScriptEditor';

const { Content } = Layout;

function AppContent() {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(250);

  // 根据路由确定当前激活的视图
  const getActiveView = () => {
    if (location.pathname.startsWith('/archive')) return 'archive';
    if (location.pathname.startsWith('/projects')) return 'projects';
    return 'projects';
  };

  return (
    <Layout className="app">
      <Navigation
        activeView={getActiveView()}
        collapsed={sidebarCollapsed}
        onCollapse={setSidebarCollapsed}
        width={sidebarWidth}
        onWidthChange={setSidebarWidth}
      />
      <Layout style={{ marginLeft: sidebarCollapsed ? 80 : sidebarWidth }}>
        <Content className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/projects" replace />} />
            <Route path="/archive" element={<ArchiveManager />} />
            <Route path="/projects" element={<ProjectManager />} />
            <Route path="/projects/:projectId/edit" element={<ScriptEditor />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
