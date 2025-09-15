import React, { useState, useEffect } from 'react';
import { Layout, Typography, Button, Modal, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import KnowledgeBaseBuilder from '../modules/KnowledgeBaseBuilder';
import KnowledgeBasesList from '../modules/KnowledgeBasesList';
import { fetchFiles, fetchCategories } from '../../utils/archive_manager';

const { Content } = Layout;
const { Title } = Typography;

function KnowledgeBaseManager() {
  // 状态管理
  const [files, setFiles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showKBBuildModal, setShowKBBuildModal] = useState(false);

  // 初始化加载数据
  useEffect(() => {
    loadFiles();
    loadCategories();
  }, [refreshTrigger]);

  // 加载文件列表
  const loadFiles = async () => {
    setLoading(true);
    try {
      const result = await fetchFiles();
      setFiles(result.files || []);
    } catch (error) {
      console.error('加载文件列表失败:', error);
      message.error('加载文件列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载类目列表
  const loadCategories = async () => {
    try {
      const result = await fetchCategories();
      setCategories(result.categories || []);
    } catch (error) {
      console.error('加载类目列表失败:', error);
      const uniqueCategories = [...new Set(files.map(file => file.category).filter(Boolean))];
      setCategories(uniqueCategories);
    }
  };

  // 刷新数据
  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // 知识库删除成功回调
  const handleKBDeleteSuccess = () => {
    message.success('知识库删除成功');
    handleRefresh();
  };

  return (
    <Layout style={{ height: '100vh', background: '#fff' }}>
      <Content style={{ padding: '24px' }}>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={3} style={{ margin: 0 }}>知识库管理</Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setShowKBBuildModal(true)}
          >
            新建知识库
          </Button>
        </div>

        <KnowledgeBasesList
          onDeleteSuccess={handleKBDeleteSuccess}
          onRefresh={refreshTrigger}
          loading={loading}
        />

        {/* 知识库构建弹窗 */}
        <Modal
          title="知识库构建"
          open={showKBBuildModal}
          onCancel={() => setShowKBBuildModal(false)}
          footer={null}
          width={500}
          destroyOnHidden
        >
          <KnowledgeBaseBuilder
            categories={categories}
            files={files}
            onRefresh={() => {
              handleRefresh();
              setShowKBBuildModal(false);
            }}
          />
        </Modal>
      </Content>
    </Layout>
  );
}

export default KnowledgeBaseManager;