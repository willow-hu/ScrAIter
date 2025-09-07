import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
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
  ExclamationCircleOutlined,
  PlayCircleOutlined
} from '@ant-design/icons';
import { KNOWLEDGE_BASE_CONFIG, getFlattenedConfig } from '../../config/knowledgeBaseConfig.js';
import FilesList from './FilesList';
import FileUploader from './FileUploader';

const { Text } = Typography;

function KnowledgeBaseManager({ onClose }) {
  const [files, setFiles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [building, setBuilding] = useState(false);
  const [kbStatus, setKbStatus] = useState(null);
  const [buildProgress, setBuildProgress] = useState(null);
  const [currentKnowledgeBase, setCurrentKnowledgeBase] = useState(null);
  const [selectedCategoriesForBuild, setSelectedCategoriesForBuild] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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

  // 格式化时间
  const formatTime = (timeStr) => {
    if (!timeStr) return '未知';
    return new Date(timeStr).toLocaleString('zh-CN');
  };

  return (
    <div className="kb-manager">
      <Space direction="vertical" className="kb-main-space" size="large">
        {/* 显示当前知识库信息 */}
        <Card title="当前知识库" size="small">
          {kbStatus && currentKnowledgeBase ? (
            <Space direction="vertical" className="kb-status-space">
              <div className="kb-status-item">
                <Text strong>名称：</Text>
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
                <Text strong>文档切片数量：</Text>
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
          <FileUploader
            categories={categories}
            onUploadSuccess={handleUploadSuccess}
            onRefresh={handleRefresh}
          />
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
                {categories.map(category => {
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
          <FilesList
            files={files}
            loading={loading}
            onDeleteSuccess={handleDeleteSuccess}
            onTagUpdateSuccess={handleTagUpdateSuccess}
            onRefresh={handleRefresh}
          />
        </Card>
      </Space>
    </div>
  );
}

export default KnowledgeBaseManager;
