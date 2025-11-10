/**
 * 项目管理页面
 * 
 * 功能说明：
 * - 展示所有剧本项目列表
 * - 创建新的剧本项目
 * - 管理项目（编辑、重命名、复制、删除）
 * 
 * 组件结构：
 * - ProjectsList: 项目列表展示组件
 * - CreateProjectModal: 创建项目对话框
 */

import React, { useState, useEffect } from 'react';
import { Layout, Typography, Button, Modal, message } from 'antd';
import { PlusOutlined } from '../../utils/icons';
import ProjectsList from '../modules/ProjectsList';
import CreateProjectModal from '../modules/CreateProjectModal';
import { fetchProjects, fetchKnowledgeBases } from '../../utils/project_manager';

const { Content } = Layout;
const { Title } = Typography;

function ProjectManager() {
  // 状态管理
  const [projects, setProjects] = useState([]);
  const [knowledgeBases, setKnowledgeBases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // 弹窗状态
  const [showCreateModal, setShowCreateModal] = useState(false);

  // 初始化加载数据
  useEffect(() => {
    loadProjects();
    loadKnowledgeBases();
  }, [refreshTrigger]);

  // 加载项目列表
  const loadProjects = async () => {
    setLoading(true);
    try {
      const result = await fetchProjects();
      setProjects(result.projects || []);
    } catch (error) {
      console.error('加载项目列表失败:', error);
      message.error('加载项目列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载知识库列表
  const loadKnowledgeBases = async () => {
    try {
      const result = await fetchKnowledgeBases();
      setKnowledgeBases(result.knowledge_bases || []);
    } catch (error) {
      console.error('加载知识库列表失败:', error);
      message.error('加载知识库列表失败');
    }
  };

  // 刷新数据
  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // 项目创建成功回调
  const handleCreateSuccess = () => {
    message.success('项目创建成功');
    setShowCreateModal(false);
    handleRefresh();
  };

  // 项目删除成功回调
  const handleDeleteSuccess = () => {
    message.success('项目删除成功');
    handleRefresh();
  };

  // 项目重命名成功回调
  const handleRenameSuccess = () => {
    message.success('项目重命名成功');
    handleRefresh();
  };

  // 项目复制成功回调
  const handleDuplicateSuccess = () => {
    message.success('项目复制成功');
    handleRefresh();
  };

  return (
    <Layout className="project-manager" style={{ height: '100vh', background: '#fff' }}>
      <Content 
        className="project-content"
        style={{ 
          padding: '24px',
          overflowY: 'auto',
          height: '100%'
        }}
      >
        {/* 项目管理区域 */}
        <div className="project-section">
          <div className="project-section-header">
            <Title level={4} style={{ margin: 0 }}>剧本项目</Title>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setShowCreateModal(true)}
            >
              新建剧本项目
            </Button>
          </div>

          <ProjectsList
            projects={projects}
            loading={loading}
            onDeleteSuccess={handleDeleteSuccess}
            onRenameSuccess={handleRenameSuccess}
            onDuplicateSuccess={handleDuplicateSuccess}
            onRefresh={handleRefresh}
          />
        </div>

        {/* 创建项目弹窗 */}
        <Modal
          title="新建剧本项目"
          open={showCreateModal}
          onCancel={() => setShowCreateModal(false)}
          footer={null}
          width={500}
          destroyOnClose
        >
          <CreateProjectModal
            knowledgeBases={knowledgeBases}
            onCreateSuccess={handleCreateSuccess}
            onCancel={() => setShowCreateModal(false)}
          />
        </Modal>
      </Content>
    </Layout>
  );
}

export default ProjectManager;
