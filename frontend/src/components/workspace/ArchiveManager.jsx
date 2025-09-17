import React, { useState, useEffect } from 'react';
import { Layout, Typography, Button, Modal, message, Space, Divider } from 'antd';
import { UploadOutlined, PlusOutlined } from '../../utils/icons';
import FileUploader from '../modules/FileUploader';
import FilesList from '../modules/FilesList';
import KnowledgeBaseBuilder from '../modules/KnowledgeBaseBuilder';
import KnowledgeBasesList from '../modules/KnowledgeBasesList';
import { fetchFiles, fetchCategories } from '../../utils/archive_manager';

const { Content } = Layout;
const { Title } = Typography;

function ArchiveManager() {
  // 状态管理
  const [files, setFiles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // 弹窗状态
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showKBBuildModal, setShowKBBuildModal] = useState(false);

  // 防止拖拽文件到页面其他区域导致的警告
  useEffect(() => {
    const handleDragOver = (e) => {
      if (!e.target.closest('.ant-upload-dragger') && !e.target.closest('.file-uploader')) {
        e.preventDefault();
        e.dataTransfer.effectAllowed = 'none';
        e.dataTransfer.dropEffect = 'none';
      }
    };

    const handleDrop = (e) => {
      if (!e.target.closest('.ant-upload-dragger') && !e.target.closest('.file-uploader')) {
        e.preventDefault();
      }
    };

    document.addEventListener('dragover', handleDragOver, { capture: true });
    document.addEventListener('drop', handleDrop, { capture: true });

    return () => {
      document.removeEventListener('dragover', handleDragOver, { capture: true });
      document.removeEventListener('drop', handleDrop, { capture: true });
    };
  }, []);

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
      // 从文件列表中提取类目作为fallback
      const uniqueCategories = [...new Set(files.map(file => file.category).filter(Boolean))];
      setCategories(uniqueCategories);
    }
  };

  // 刷新数据
  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // 文件上传成功回调
  const handleUploadSuccess = () => {
    message.success('文件上传成功');
    setShowUploadModal(false);
    handleRefresh();
  };

  // 文件删除成功回调
  const handleDeleteSuccess = () => {
    message.success('文件删除成功');
    handleRefresh();
  };

  // 文件标签更新成功回调
  const handleTagUpdateSuccess = () => {
    handleRefresh();
  };

  // 知识库删除成功回调
  const handleKBDeleteSuccess = () => {
    message.success('知识库删除成功');
    handleRefresh();
  };

  return (
    <Layout className="archive-manager" style={{ height: '100vh', background: '#fff' }}>
      <Content 
        className="archive-content"
        style={{ 
          padding: '24px',
          overflowY: 'auto',
          height: '100%'
        }}
      >
        {/* 页面标题 */}
        {/* <Title level={3} style={{ margin: '0 0 24px 0' }}>资料管理</Title> */}

        {/* 知识库管理区域 */}
        <div className="archive-section">
          <div className="archive-section-header">
            <Title level={4} style={{ margin: 0 }}>知识库管理</Title>
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
        </div>

        {/* 分割线 */}
        <Divider />

        {/* 文件管理区域 */}
        <div className="archive-section">
          <div className="archive-section-header">
            <Title level={4} style={{ margin: 0 }}>文件管理</Title>
            <Button
              type="primary"
              icon={<UploadOutlined />}
              onClick={() => setShowUploadModal(true)}
            >
              上传文件
            </Button>
          </div>

          <FilesList
            files={files}
            loading={loading}
            onDeleteSuccess={handleDeleteSuccess}
            onTagUpdateSuccess={handleTagUpdateSuccess}
            onRefresh={handleRefresh}
          />
        </div>

        {/* 上传文件弹窗 */}
        <Modal
          title="上传文件"
          open={showUploadModal}
          onCancel={() => setShowUploadModal(false)}
          footer={null}
          width={500}
          destroyOnHidden
        >
          <FileUploader
            categories={categories}
            onUploadSuccess={handleUploadSuccess}
            onRefresh={handleRefresh}
          />
        </Modal>

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

export default ArchiveManager;