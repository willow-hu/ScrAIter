import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  message, 
  Space, 
  Typography, 
  Tag, 
  Modal, 
  Spin,
  Row,
  Col
} from 'antd';
import { 
  UploadOutlined,
  SyncOutlined
} from '../../utils/icons';
import FilesList from './FilesList';
import FileUploader from './FileUploader';
import KnowledgeBaseBuilder from './KnowledgeBaseBuilder';

const { Text } = Typography;

function KnowledgeBaseModifier({ onClose }) {
  const [files, setFiles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [kbStatus, setKbStatus] = useState(null);
  const [currentKnowledgeBase, setCurrentKnowledgeBase] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // 弹窗状态
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showRebuildModal, setShowRebuildModal] = useState(false);

  // 初始化加载数据
  useEffect(() => {
    loadFiles();
    loadCategories();
    loadKnowledgeBaseStatus();
    loadKnowledgeBases();
  }, [refreshTrigger]);

  // 加载文件列表
  const loadFiles = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/v1/files');
      if (!response.ok) {
        throw new Error('获取文件列表失败');
      }
      const result = await response.json();
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

  // 加载知识库状态
  const loadKnowledgeBaseStatus = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/knowledge-base/status');
      if (!response.ok) {
        throw new Error('获取知识库状态失败');
      }
      const result = await response.json();
      setKbStatus(result);
    } catch (error) {
      console.error('获取知识库状态失败:', error);
    }
  };

  // 加载知识库列表
  const loadKnowledgeBases = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/knowledge-base/list');
      if (!response.ok) {
        throw new Error('获取知识库列表失败');
      }
      const result = await response.json();
      
      // 获取第一个知识库作为当前知识库
      if (result.knowledge_bases && Object.keys(result.knowledge_bases).length > 0) {
        const kbName = Object.keys(result.knowledge_bases)[0];
        setCurrentKnowledgeBase({
          name: kbName,
          ...result.knowledge_bases[kbName]
        });
      }
    } catch (error) {
      console.error('获取知识库列表失败:', error);
    }
  };

  // 刷新数据
  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // 文件上传成功回调
  const handleUploadSuccess = () => {
    message.success('文件上传成功');
    setShowUploadModal(false); // 关闭弹窗
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

  // 格式化时间
  const formatTime = (timeStr) => {
    if (!timeStr) return '未知';
    return new Date(timeStr).toLocaleString('zh-CN');
  };

  return (
    <div className="kb-manager">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 当前知识库卡片 */}
        <Card 
          title="当前知识库" 
          size="small"
          extra={
            currentKnowledgeBase && (
              <Button
                type="primary"
                icon={<SyncOutlined />}
                size="small"
                onClick={() => setShowRebuildModal(true)}
              >
                重建知识库
              </Button>
            )
          }
        >
          {kbStatus && currentKnowledgeBase ? (
            <Space direction="vertical" style={{ width: '100%' }}>
              <Row>
                <Col span={8}>
                  <Text strong>名称：</Text>
                  <Text>{currentKnowledgeBase.name}</Text>
                </Col>
                <Col span={8}>
                  <Text strong>文件数量：</Text>
                  <Text>{kbStatus.file_count || 0}</Text>
                </Col>
                <Col span={8}>
                  <Text strong>文档切片：</Text>
                  <Text>{currentKnowledgeBase.document_count || 0}</Text>
                </Col>
              </Row>
              <Row>
                <Col span={12}>
                  <Text strong>包含类目：</Text>
                  <div style={{ marginTop: 4 }}>
                    {currentKnowledgeBase.categories && currentKnowledgeBase.categories.map(cat => (
                      <Tag key={cat} color="blue" size="small">{cat}</Tag>
                    ))}
                  </div>
                </Col>
                <Col span={12}>
                  <Text strong>创建时间：</Text>
                  <div>{formatTime(currentKnowledgeBase.created_time)}</div>
                </Col>
              </Row>
            </Space>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <Spin />
              <div style={{ marginTop: 8, color: '#666' }}>加载知识库信息...</div>
            </div>
          )}
        </Card>

        {/* 文件列表卡片 */}
        <Card 
          title="文件列表" 
          size="small"
          extra={
            <Button
              type="primary"
              icon={<UploadOutlined />}
              size="small"
              onClick={() => setShowUploadModal(true)}
            >
              添加文件
            </Button>
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
      </Space>

      {/* 文件上传弹窗 */}
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

      {/* 知识库重建弹窗 */}
      <Modal
        title="重建知识库"
        open={showRebuildModal}
        onCancel={() => setShowRebuildModal(false)}
        footer={null}
        width={500}
        destroyOnHidden
      >
        <KnowledgeBaseBuilder
          categories={categories}
          files={files}
          onRefresh={() => {
            handleRefresh();
            setShowRebuildModal(false); // 重建完成后关闭弹窗
          }}
          isRebuild={true}
          existingKnowledgeBase={currentKnowledgeBase}
        />
      </Modal>
    </div>
  );
}

export default KnowledgeBaseModifier;