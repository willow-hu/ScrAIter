import React, { useState, useEffect } from 'react';
import { Layout, Card, Row, Col, message } from 'antd';
import FileUploader from './FileUploader';
import FilesList from './FilesList';
import KnowledgeBaseBuilder from './KnowledgeBaseBuilder';

const { Content } = Layout;

function ArchiveManager() {
  // 状态管理
  const [files, setFiles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // 初始化加载数据
  useEffect(() => {
    loadFiles();
    loadCategories();
  }, [refreshTrigger]);

  // 加载文件列表
  const loadFiles = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/v1/files');
      if (response.ok) {
        const result = await response.json();
        setFiles(result.files || []);
      } else {
        throw new Error('获取文件列表失败');
      }
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
      const response = await fetch('http://localhost:8000/api/v1/categories');
      if (response.ok) {
        const result = await response.json();
        setCategories(result.categories || []);
      } else {
        // 如果接口不存在，从文件列表中提取类目
        const uniqueCategories = [...new Set(files.map(file => file.category).filter(Boolean))];
        setCategories(uniqueCategories);
      }
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
    handleRefresh();
  };

  // 文件删除成功回调
  const handleDeleteSuccess = () => {
    message.success('文件删除成功');
    handleRefresh();
  };

  // 文件标签更新成功回调
  const handleTagUpdateSuccess = () => {
    message.success('标签更新成功');
    handleRefresh();
  };

  return (
    <Layout className="archive-manager">
      <Content className="archive-content">
        <div className="archive-container">
          {/* 上传文件区域 */}
          <Card 
            title="上传文件" 
            className="upload-section"
            style={{ marginBottom: 24 }}
          >
            <FileUploader
              categories={categories}
              onUploadSuccess={handleUploadSuccess}
              onRefresh={handleRefresh}
            />
          </Card>

          {/* 文件列表区域 */}
          <Row gutter={24}>
            <Col span={16}>
              <Card 
                title="文件管理" 
                className="files-section"
                extra={
                  <span style={{ fontSize: '14px', color: '#666' }}>
                    共 {files.length} 个文件
                  </span>
                }
              >
                <FilesList
                  files={files}
                  loading={loading}
                  onDeleteSuccess={handleDeleteSuccess}
                  onTagUpdateSuccess={handleTagUpdateSuccess}
                  onRefresh={handleRefresh}
                />
              </Card>
            </Col>

            {/* 知识库构建区域 */}
            <Col span={8}>
              <Card 
                title="知识库构建" 
                className="kb-section"
              >
                <KnowledgeBaseBuilder
                  categories={categories}
                  files={files}
                  onRefresh={handleRefresh}
                />
              </Card>
            </Col>
          </Row>
        </div>
      </Content>
    </Layout>
  );
}

export default ArchiveManager;
