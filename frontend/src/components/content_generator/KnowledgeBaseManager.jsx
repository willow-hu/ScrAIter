import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  List, 
  Upload, 
  message, 
  Space, 
  Typography, 
  Tag, 
  Modal, 
  Progress,
  Spin,
  Alert,
  Select
} from 'antd';
import { 
  UploadOutlined, 
  DeleteOutlined, 
  ReloadOutlined, 
  ExclamationCircleOutlined,
  FileTextOutlined,
  CloudUploadOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Dragger } = Upload;

function KnowledgeBaseManager({ onClose }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [building, setBuilding] = useState(false);
  const [kbStatus, setKbStatus] = useState(null);
  const [buildProgress, setBuildProgress] = useState(null);
  const [fileType, setFileType] = useState('unstructured');
  const [category, setCategory] = useState('twin_pagoda');

  // 初始化加载数据
  useEffect(() => {
    loadFiles();
    loadKnowledgeBaseStatus();
  }, []);

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

  // 上传文件配置
  const uploadProps = {
    name: 'files',
    multiple: true,
    accept: '.txt,.pdf,.doc,.docx,.md',
    beforeUpload: () => false, // 阻止自动上传
    onChange: async (info) => {
      if (info.fileList.length > 0) {
        await handleUpload(info.fileList);
      }
    },
  };

  // 处理文件上传
  const handleUpload = async (fileList) => {
    setUploading(true);
    try {
      const formData = new FormData();
      
      // 添加文件
      fileList.forEach(file => {
        formData.append('files', file.originFileObj || file);
      });
      
      // 添加分类和类型
      formData.append('category', category);
      formData.append('file_type', fileType);

      const response = await fetch('http://localhost:8000/api/v1/files/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('上传文件失败');
      }

      const result = await response.json();
      
      if (result.failed_files && result.failed_files.length > 0) {
        message.warning(`部分文件上传失败: ${result.failed_files.join(', ')}`);
      } else {
        message.success('文件上传成功');
      }

      // 重新加载文件列表
      await loadFiles();
      
    } catch (error) {
      console.error('上传文件失败:', error);
      message.error('上传文件失败');
    } finally {
      setUploading(false);
    }
  };

  // 删除文件
  const deleteFile = async (filename) => {
    Modal.confirm({
      title: '删除文件',
      icon: <ExclamationCircleOutlined />,
      content: `确定要删除文件 "${filename}" 吗？`,
      onOk: async () => {
        try {
          const response = await fetch(`http://localhost:8000/api/v1/files/${encodeURIComponent(filename)}`, {
            method: 'DELETE',
          });

          if (!response.ok) {
            throw new Error('删除文件失败');
          }

          message.success('文件删除成功');
          await loadFiles();
        } catch (error) {
          console.error('删除文件失败:', error);
          message.error('删除文件失败');
        }
      },
    });
  };

  // 重建知识库
  const rebuildKnowledgeBase = async () => {
    Modal.confirm({
      title: '重建知识库',
      icon: <ExclamationCircleOutlined />,
      content: '确定要重建知识库吗？这个过程可能需要几分钟时间。',
      onOk: async () => {
        setBuilding(true);
        try {
          const response = await fetch('http://localhost:8000/api/v1/knowledge-base/build', {
            method: 'POST',
          });

          if (!response.ok) {
            throw new Error('启动知识库构建失败');
          }

          const result = await response.json();
          message.success('知识库构建已启动');
          
          // 开始轮询构建进度
          pollBuildProgress(result.task_id);
          
        } catch (error) {
          console.error('重建知识库失败:', error);
          message.error('重建知识库失败');
          setBuilding(false);
        }
      },
    });
  };

  // 轮询构建进度
  const pollBuildProgress = async (taskId) => {
    const checkProgress = async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/v1/knowledge-base/build-status/${taskId}`);
        if (!response.ok) {
          throw new Error('获取构建进度失败');
        }

        const result = await response.json();
        setBuildProgress(result);

        if (result.status === 'completed') {
          setBuilding(false);
          setBuildProgress(null);
          message.success('知识库构建完成');
          await loadKnowledgeBaseStatus();
        } else if (result.status === 'failed') {
          setBuilding(false);
          setBuildProgress(null);
          message.error(`知识库构建失败: ${result.error || '未知错误'}`);
        } else if (result.status === 'running') {
          // 继续轮询
          setTimeout(checkProgress, 2000);
        }
      } catch (error) {
        console.error('检查构建进度失败:', error);
        setBuilding(false);
        setBuildProgress(null);
      }
    };

    checkProgress();
  };

  // 格式化文件大小
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 格式化时间
  const formatTime = (timeStr) => {
    if (!timeStr) return '未知';
    return new Date(timeStr).toLocaleString('zh-CN');
  };

  return (
    <div className="kb-manager" style={{ padding: '16px' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* 知识库状态 */}
        <Card title="知识库状态" size="small">
          {kbStatus ? (
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text strong>构建状态：</Text>
                <Tag color={kbStatus.is_built ? 'green' : 'red'}>
                  {kbStatus.is_built ? '已构建' : '未构建'}
                </Tag>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text strong>文件数量：</Text>
                <Text>{kbStatus.file_count || 0}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text strong>最后更新：</Text>
                <Text>{formatTime(kbStatus.last_updated)}</Text>
              </div>
            </Space>
          ) : (
            <Spin />
          )}
        </Card>

        {/* 构建进度 */}
        {building && buildProgress && (
          <Card title="构建进度" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Progress 
                percent={buildProgress.progress || 0} 
                status={buildProgress.status === 'failed' ? 'exception' : 'active'}
              />
              <Text type="secondary">
                {buildProgress.current_file || '正在处理...'}
              </Text>
            </Space>
          </Card>
        )}

        {/* 上传文件 */}
        <Card 
          title="上传文件" 
          size="small"
          extra={
            <Button 
              type="primary" 
              icon={<ReloadOutlined />}
              onClick={rebuildKnowledgeBase}
              loading={building}
            >
              重建知识库
            </Button>
          }
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            {/* 文件配置 */}
            <Space>
              <Text strong>分类：</Text>
              <Select
                value={category}
                onChange={setCategory}
                style={{ width: 120 }}
              >
                <Select.Option value="twin_pagoda">双塔</Select.Option>
                <Select.Option value="other">其他</Select.Option>
              </Select>
              
              <Text strong>类型：</Text>
              <Select
                value={fileType}
                onChange={setFileType}
                style={{ width: 120 }}
              >
                <Select.Option value="unstructured">非结构化</Select.Option>
                <Select.Option value="structured">结构化</Select.Option>
              </Select>
            </Space>

            {/* 上传区域 */}
            <Dragger {...uploadProps} disabled={uploading}>
              <p className="ant-upload-drag-icon">
                <CloudUploadOutlined />
              </p>
              <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
              <p className="ant-upload-hint">
                支持单个或批量上传。支持格式：.txt, .pdf, .doc, .docx, .md
              </p>
            </Dragger>
          </Space>
        </Card>

        {/* 文件列表 */}
        <Card title="文件列表" size="small">
          {loading ? (
            <Spin />
          ) : (
            <List
              dataSource={files}
              renderItem={(file) => (
                <List.Item
                  actions={[
                    <Button
                      icon={<DeleteOutlined />}
                      type="text"
                      danger
                      onClick={() => deleteFile(file.relative_path)}
                    >
                      删除
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    avatar={<FileTextOutlined style={{ fontSize: '16px' }} />}
                    title={
                      <Space>
                        <Text>{file.filename}</Text>
                        <Tag size="small">{file.file_type}</Tag>
                      </Space>
                    }
                    description={
                      <Space size="small">
                        <Text type="secondary">大小: {formatFileSize(file.size)}</Text>
                        <Text type="secondary">|</Text>
                        <Text type="secondary">上传时间: {formatTime(file.upload_time)}</Text>
                        <Text type="secondary">|</Text>
                        <Text type="secondary">分类: {file.category}</Text>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </Card>

        {/* 操作提示 */}
        <Alert
          message="使用说明"
          description={
            <div>
              <p>1. 上传新文件：选择分类和类型，然后拖拽或点击上传文件</p>
              <p>2. 删除文件：点击文件列表中的删除按钮</p>
              <p>3. 重建知识库：修改文件后，点击"重建知识库"按钮应用更改</p>
              <p>4. 知识库构建完成后，就可以在内容生成中使用新的知识库了</p>
            </div>
          }
          type="info"
          showIcon
        />

        {/* 底部按钮 */}
        <div style={{ textAlign: 'right' }}>
          <Button onClick={onClose}>
            关闭
          </Button>
        </div>
      </Space>
    </div>
  );
}

export default KnowledgeBaseManager;
