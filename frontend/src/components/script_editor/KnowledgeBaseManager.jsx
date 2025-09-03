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
  Select,
  Input
} from 'antd';
import { 
  UploadOutlined, 
  DeleteOutlined, 
  ExclamationCircleOutlined,
  FileTextOutlined,
  InboxOutlined,
  PlusOutlined,
  PlayCircleOutlined
} from '@ant-design/icons';
import { KNOWLEDGE_BASE_CONFIG, getFlattenedConfig } from '../../config/knowledgeBaseConfig.js';

const { Title, Text } = Typography;
const { Dragger } = Upload;

// 文件类型常量
const FILE_TYPES = {
  STRUCTURED: 'structured',
  UNSTRUCTURED: 'unstructured'
};

// 支持的文件格式
const SUPPORTED_FORMATS = {
  [FILE_TYPES.STRUCTURED]: ['.xlsx', '.csv'],
  [FILE_TYPES.UNSTRUCTURED]: ['.pdf', '.docx', '.txt']
};

function KnowledgeBaseManager({ onClose }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [building, setBuilding] = useState(false);
  const [kbStatus, setKbStatus] = useState(null);
  const [buildProgress, setBuildProgress] = useState(null);
  const [fileType, setFileType] = useState(FILE_TYPES.UNSTRUCTURED);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [availableCategories, setAvailableCategories] = useState([]);
  const [currentKnowledgeBase, setCurrentKnowledgeBase] = useState(null);
  const [fileList, setFileList] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [selectedCategoriesForBuild, setSelectedCategoriesForBuild] = useState([]);

  // 初始化加载数据
  useEffect(() => {
    loadFiles();
    loadKnowledgeBaseStatus();
    loadCategories();
    loadKnowledgeBases();
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

  // 加载类目列表
  const loadCategories = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/categories');
      if (!response.ok) {
        throw new Error('获取类目列表失败');
      }
      const result = await response.json();
      setAvailableCategories(result.categories || []);
      
      // 设置默认类目
      if (result.categories && result.categories.length > 0 && !selectedCategory) {
        setSelectedCategory(result.categories[0]);
      }
    } catch (error) {
      console.error('获取类目列表失败:', error);
      // 使用默认类目
      if (!selectedCategory) {
        setSelectedCategory('twin_pagoda');
      }
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

  // 文件上传配置
  const uploadProps = {
    name: 'files',
    multiple: true,
    fileList,
    beforeUpload: (file) => {
      // 检查文件格式
      const allowedFormats = SUPPORTED_FORMATS[fileType];
      const fileExt = '.' + file.name.split('.').pop().toLowerCase();
      
      if (!allowedFormats.includes(fileExt)) {
        message.error(`${fileType === FILE_TYPES.STRUCTURED ? '结构化' : '非结构化'}文件只支持${allowedFormats.join(', ')}格式`);
        return Upload.LIST_IGNORE;
      }

      // 检查文件大小 (200MB)
      const isLt200M = file.size / 1024 / 1024 < 200;
      if (!isLt200M) {
        message.error('文件大小不能超过200MB');
        return Upload.LIST_IGNORE;
      }

      return false; // 阻止自动上传
    },
    onChange: (info) => {
      setFileList(info.fileList);
    },
    onDrop: (e) => {
      console.log('Dropped files', e.dataTransfer.files);
    },
  };

  // 创建新类目
  const handleCreateCategory = () => {
    if (!newCategoryName.trim()) {
      message.error('请输入类目名称');
      return;
    }

    if (availableCategories.includes(newCategoryName.trim())) {
      message.error('类目已存在');
      return;
    }

    // 这里暂时直接添加到本地状态，后续需要调用API
    setSelectedCategory(newCategoryName.trim());
    setShowNewCategoryModal(false);
    setNewCategoryName('');
    message.success('类目创建成功');
    
    // 刷新类目列表
    loadCategories();
  };

  // 处理文件上传
  const handleUpload = async () => {
    if (!selectedCategory) {
      message.error('请选择或创建类目');
      return;
    }

    if (fileList.length === 0) {
      message.error('请选择要上传的文件');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      
      // 添加文件
      fileList.forEach(file => {
        formData.append('files', file.originFileObj);
      });
      
      // 添加分类和类型
      formData.append('category', selectedCategory);
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

      // 清空表单
      setFileList([]);
      setSelectedCategory('');

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
    if (!currentKnowledgeBase) {
      message.error('没有找到当前知识库信息');
      return;
    }

    if (selectedCategoriesForBuild.length === 0) {
      message.error('请选择至少一个类目');
      return;
    }

    Modal.confirm({
      title: '重建知识库',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>将重建知识库"{currentKnowledgeBase.name}"，使用以下类目：</p>
          <ul>
            {selectedCategoriesForBuild.map(cat => (
              <li key={cat}>{cat} ({files.filter(f => f.category === cat).length} 个文件)</li>
            ))}
          </ul>
          <p style={{ color: '#ff4d4f' }}>注意：这将覆盖现有知识库。</p>
        </div>
      ),
      okText: '开始重建',
      cancelText: '取消',
      onOk: async () => {
        setBuilding(true);
        try {
          // 使用选择的类目和配置
          const buildRequest = {
            name: currentKnowledgeBase.name,
            categories: selectedCategoriesForBuild,
            ...getFlattenedConfig(KNOWLEDGE_BASE_CONFIG)
          };

          const response = await fetch('http://localhost:8000/api/v1/knowledge-base/build', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(buildRequest),
          });

          if (!response.ok) {
            throw new Error('启动知识库构建失败');
          }

          const result = await response.json();
          message.success('知识库重建已启动');
          
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
          await loadKnowledgeBases();
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
    <div className="kb-manager">
      <Space direction="vertical" className="kb-main-space" size="large">
        {/* 知识库状态 */}
        <Card title="知识库状态" size="small">
          {kbStatus && currentKnowledgeBase ? (
            <Space direction="vertical" className="kb-status-space">
              <div className="kb-status-item">
                <Text strong>知识库名称：</Text>
                <Text>{currentKnowledgeBase.name}</Text>
              </div>
              <div className="kb-status-item">
                <Text strong>包含类目：</Text>
                <Space size="small">
                  {currentKnowledgeBase.categories && currentKnowledgeBase.categories.map(cat => (
                    <Tag key={cat} color="blue">{cat}</Tag>
                  ))}
                </Space>
              </div>
              <div className="kb-status-item">
                <Text strong>文件数量：</Text>
                <Text>{kbStatus.file_count || 0}</Text>
              </div>
              <div className="kb-status-item">
                <Text strong>文档数量：</Text>
                <Text>{currentKnowledgeBase.document_count || 0}</Text>
              </div>
              <div className="kb-status-item">
                <Text strong>创建时间：</Text>
                <Text>{formatTime(currentKnowledgeBase.created_time)}</Text>
              </div>
            </Space>
          ) : (
            <Spin />
          )}
        </Card>

        {/* 构建进度 */}
        {building && buildProgress && (
          <Card title="构建进度" size="small">
            <Space direction="vertical" className="kb-progress-space">
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
        <Card title="上传文件" size="small">
          <Space direction="vertical" className="kb-upload-space">
            {/* 文件类型选择 */}
            <div>
              <Text strong style={{ marginRight: 8 }}>文件类型：</Text>
              <Select
                value={fileType}
                onChange={setFileType}
                style={{ width: 150 }}
              >
                <Select.Option value={FILE_TYPES.UNSTRUCTURED}>非结构化</Select.Option>
                <Select.Option value={FILE_TYPES.STRUCTURED}>结构化</Select.Option>
              </Select>
              <Text style={{ marginLeft: 8, color: '#666', fontSize: '12px' }}>
                {fileType === FILE_TYPES.STRUCTURED 
                  ? '支持：Excel(.xlsx), CSV(.csv)' 
                  : '支持：PDF(.pdf), Word(.docx), 文本(.txt)'
                }
              </Text>
            </div>

            {/* 类目选择 */}
            <div>
              <Text strong style={{ marginRight: 8 }}>选择类目：</Text>
              <Space>
                <Select
                  value={selectedCategory}
                  onChange={setSelectedCategory}
                  placeholder="选择现有类目"
                  style={{ width: 200 }}
                  allowClear
                >
                  {availableCategories.map(category => (
                    <Select.Option key={category} value={category}>{category}</Select.Option>
                  ))}
                </Select>
                <Button 
                  icon={<PlusOutlined />} 
                  onClick={() => setShowNewCategoryModal(true)}
                >
                  新建类目
                </Button>
              </Space>
            </div>

            {/* 文件上传区域 */}
            <Dragger {...uploadProps} style={{ padding: '20px' }}>
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
              <p className="ant-upload-hint">
                支持单个或批量上传。所有文件将归类到选定的类目中。
              </p>
            </Dragger>

            {/* 上传按钮 */}
            {fileList.length > 0 && (
              <div style={{ textAlign: 'center' }}>
                <Button 
                  type="primary" 
                  icon={<UploadOutlined />}
                  onClick={handleUpload}
                  loading={uploading}
                  size="large"
                >
                  上传 {fileList.length} 个文件到「{selectedCategory}」
                </Button>
              </div>
            )}
          </Space>
        </Card>

        {/* 知识库重建 */}
        <Card title="知识库重建" size="small">
          <Space direction="vertical" className="kb-upload-space">
            {/* 类目选择 */}
            <div>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>选择类目：</Text>
              <Select
                mode="multiple"
                value={selectedCategoriesForBuild}
                onChange={setSelectedCategoriesForBuild}
                placeholder="选择一个或多个类目"
                style={{ width: '100%' }}
                maxTagCount={3}
              >
                {availableCategories.map(category => {
                  const categoryFiles = files.filter(f => f.category === category);
                  const untaggedCount = categoryFiles.filter(f => !f.source_tag).length;
                  
                  return (
                    <Select.Option key={category} value={category}>
                      {category}
                      {untaggedCount > 0 && <span style={{ color: 'red' }}> - {untaggedCount}个未标记</span>}
                    </Select.Option>
                  );
                })}
              </Select>
            </div>

            {/* 选中文件统计 */}
            {selectedCategoriesForBuild.length > 0 && (
              <Alert
                message={
                  <div>
                    <p>已选择 {selectedCategoriesForBuild.reduce((total, cat) => {
                      return total + files.filter(f => f.category === cat).length;
                    }, 0)} 个文件</p>
                  </div>
                }
                type="info"
                showIcon
              />
            )}

            {/* 重建按钮 */}
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={rebuildKnowledgeBase}
              disabled={selectedCategoriesForBuild.length === 0}
              loading={building}
              size="large"
              style={{ width: '100%' }}
            >
              重建知识库
            </Button>
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
                    avatar={<FileTextOutlined className="kb-file-icon" />}
                    title={
                      <Space>
                        <Text>{file.filename}</Text>
                        <Tag size="small" color="default">{file.file_type}</Tag>
                        <Tag size="small" color="blue">{file.source_tag || '未标记'}</Tag>
                      </Space>
                    }
                    description={
                      <Space size="small">
                        <Text type="secondary">类目: {file.category}</Text>
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
              <p>1. 上传新文件：选择文件类型和类目，然后拖拽或点击上传文件</p>
              <p>2. 删除文件：点击文件列表中的删除按钮</p>
              <p>3. 重建知识库：选择类目后点击"重建知识库"按钮覆盖现有知识库</p>
              <p>4. 知识库构建完成后，就可以在内容生成中使用新的知识库了</p>
            </div>
          }
          type="info"
          showIcon
        />
      </Space>

      {/* 新建类目弹窗 */}
      <Modal
        title="新建类目"
        open={showNewCategoryModal}
        onOk={handleCreateCategory}
        onCancel={() => {
          setShowNewCategoryModal(false);
          setNewCategoryName('');
        }}
        okText="创建"
        cancelText="取消"
      >
        <div>
          <Text strong>类目名称：</Text>
          <Input
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="请输入类目名称"
            style={{ marginTop: 8 }}
            onPressEnter={handleCreateCategory}
          />
        </div>
      </Modal>
    </div>
  );
}

export default KnowledgeBaseManager;
