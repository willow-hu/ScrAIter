import React, { useState, useEffect } from 'react';
import { Layout, Card, Row, Col, message } from 'antd';
import FileUploader from './modules/FileUploader';
import FilesList from './modules/FilesList';
import KnowledgeBaseBuilder from './modules/KnowledgeBaseBuilder';
import { fetchFiles, fetchCategories } from '../utils/archive_manager';

const { Content } = Layout;

function ArchiveManager() {
  // 状态管理
  const [files, setFiles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // 防止拖拽文件到页面其他区域导致的警告
  useEffect(() => {
    const handleDragOver = (e) => {
      // 如果不是在上传区域内，阻止默认行为
      if (!e.target.closest('.ant-upload-dragger') && !e.target.closest('.file-uploader')) {
        e.preventDefault();
        e.dataTransfer.effectAllowed = 'none';
        e.dataTransfer.dropEffect = 'none';
      }
    };

    const handleDrop = (e) => {
      // 如果不是在上传区域内，阻止默认行为
      if (!e.target.closest('.ant-upload-dragger') && !e.target.closest('.file-uploader')) {
        e.preventDefault();
      }
    };

    // 使用capture阶段处理，这样可以在事件冒泡之前处理
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

  return (
    <Layout className="archive-manager">
      <Content className="archive-content">
        <div className="archive-container">
          {/* 上方区域：上传文件和知识库构建并排 */}
          <Row gutter={24} style={{ marginBottom: 24 }}>
            <Col span={12}>
              <Card 
                title="上传文件" 
                className="upload-section"
              >
                <FileUploader
                  categories={categories}
                  onUploadSuccess={handleUploadSuccess}
                  onRefresh={handleRefresh}
                />
              </Card>
            </Col>
            
            <Col span={12}>
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

          {/* 下方区域：文件列表和使用说明 */}
          <Row gutter={24}>
            <Col span={12}>
              <Card 
                title="文件管理" 
                className="files-section"
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

            {/* 使用说明区域 */}
            {/* <Col span={12}>
              <Card 
                title="使用说明" 
                className="instruction-section"
              >
                <div className="instruction-content">
                  <h4>文件管理流程</h4>
                  <ol style={{ paddingLeft: '20px', lineHeight: '1.8' }}>
                    <li>选择文件类型（结构化/非结构化）</li>
                    <li>选择或创建类目</li>
                    <li>拖拽/点击上传文件</li>
                    <li>在文件管理区为每个文件标记标签</li>
                  </ol>

                  <h4 style={{ marginTop: '24px' }}>知识库构建</h4>
                  <ol style={{ paddingLeft: '20px', lineHeight: '1.8' }}>
                    <li>确保所有文件已标记标签</li>
                    <li>选择要构建知识库的类目</li>
                    <li>输入知识库名称并开始构建</li>
                    <li>等待构建完成</li>
                  </ol>
                </div>
              </Card>
            </Col> */}
          </Row>
        </div>
      </Content>
    </Layout>
  );
}

export default ArchiveManager;
