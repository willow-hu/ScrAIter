import React, { useState, useMemo, useEffect } from 'react';
import { Table, Tag, Button, Empty, Tooltip, Space, Modal } from 'antd';
import { DeleteOutlined, NodeIndexOutlined, DatabaseOutlined, LoadingOutlined } from '../../utils/icons';
import { 
  fetchKnowledgeBases,
  deleteKnowledgeBase,
  formatDate
} from '../../utils/archive_manager';

function KnowledgeBasesList({ onDeleteSuccess, onRefresh, loading }) {
  const [knowledgeBases, setKnowledgeBases] = useState([]);
  const [loadingKBs, setLoadingKBs] = useState(false);
  const [deleting, setDeleting] = useState({});

  // 加载知识库列表
  const loadKnowledgeBases = async () => {
    setLoadingKBs(true);
    try {
      const kbList = await fetchKnowledgeBases();
      setKnowledgeBases(kbList);
    } catch (error) {
      console.error('获取知识库列表失败:', error);
      setKnowledgeBases([]);
    } finally {
      setLoadingKBs(false);
    }
  };

  // 组件挂载时和刷新时加载数据
  useEffect(() => {
    loadKnowledgeBases();
  }, [onRefresh]);

  // 统计信息
  const stats = useMemo(() => {
    const total = knowledgeBases.length;
    const totalFiles = knowledgeBases.reduce((sum, kb) => sum + (kb.file_count || 0), 0);
    const totalDocuments = knowledgeBases.reduce((sum, kb) => sum + (kb.document_count || 0), 0);
    const allCategories = new Set();
    knowledgeBases.forEach(kb => {
      (kb.categories || []).forEach(cat => allCategories.add(cat));
    });
    
    return { total, totalFiles, totalDocuments, categories: allCategories.size };
  }, [knowledgeBases]);

  // 删除知识库
  const handleDelete = async (kb) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除知识库"${kb.name}"吗？此操作不可恢复。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        setDeleting(prev => ({ ...prev, [kb.name]: true }));
        try {
          await deleteKnowledgeBase(kb.name);
          onDeleteSuccess && onDeleteSuccess();
          loadKnowledgeBases(); // 重新加载列表
        } catch (error) {
          console.error('删除知识库失败:', error);
        } finally {
          setDeleting(prev => {
            const newState = { ...prev };
            delete newState[kb.name];
            return newState;
          });
        }
      }
    });
  };

  // 构建知识图谱状态
  const [buildingGraph, setBuildingGraph] = useState({});

  // 获取图谱按钮类型
  const getGraphButtonType = (record) => {
    if (record.has_graph) return 'default';
    return 'primary';
  };

  // 获取图谱按钮图标
  const getGraphButtonIcon = (record) => {
    if (buildingGraph[record.name]) return <LoadingOutlined />;
    return <NodeIndexOutlined />;
  };

  // 获取图谱按钮文本
  const getGraphButtonText = (record) => {
    if (buildingGraph[record.name]) return '构建中';
    if (record.has_graph) return '重构';
    return '图谱';
  };

  // 获取图谱按钮提示
  const getGraphButtonTooltip = (record) => {
    if (buildingGraph[record.name]) return '正在构建知识图谱...';
    if (record.has_graph) return '重新构建知识图谱';
    return '提取知识图谱';
  };
  const [graphProgress, setGraphProgress] = useState({});

  // 构建知识图谱
  const handleExtractGraph = async (kb) => {
    Modal.confirm({
      title: '构建知识图谱',
      content: `确定要为知识库"${kb.name}"构建知识图谱吗？这将分析文档内容并提取实体关系。`,
      okText: '开始构建',
      cancelText: '取消',
      onOk: async () => {
        setBuildingGraph(prev => ({ ...prev, [kb.name]: true }));
        setGraphProgress(prev => ({ ...prev, [kb.name]: { progress: 0, message: '准备构建...' } }));
        
        try {
          // 调用后端API开始构建图谱
          const response = await fetch(`http://localhost:8000/api/v1/knowledge-base/${kb.name}/build-graph`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            }
          });
          
          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || '构建失败');
          }
          
          const result = await response.json();
          
          // 开始轮询构建进度
          pollGraphBuildProgress(kb.name, result.task_id);
          
        } catch (error) {
          console.error('构建知识图谱失败:', error);
          message.error(`构建失败: ${error.message}`);
          setBuildingGraph(prev => ({ ...prev, [kb.name]: false }));
          setGraphProgress(prev => {
            const newState = { ...prev };
            delete newState[kb.name];
            return newState;
          });
        }
      }
    });
  };

  // 轮询图谱构建进度
  const pollGraphBuildProgress = async (kbName, taskId) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/v1/knowledge-base/${kbName}/graph-status/${taskId}`);
        
        if (!response.ok) {
          throw new Error('无法获取构建进度');
        }
        
        const status = await response.json();
        
        setGraphProgress(prev => ({
          ...prev,
          [kbName]: {
            progress: status.progress,
            message: status.current_file || '处理中...'
          }
        }));
        
        if (status.status === 'completed') {
          clearInterval(pollInterval);
          setBuildingGraph(prev => ({ ...prev, [kbName]: false }));
          setGraphProgress(prev => {
            const newState = { ...prev };
            delete newState[kbName];
            return newState;
          });
          message.success(`知识库"${kbName}"的知识图谱构建完成`);
          loadKnowledgeBases(); // 重新加载列表以更新图谱信息
        } else if (status.status === 'error') {
          clearInterval(pollInterval);
          setBuildingGraph(prev => ({ ...prev, [kbName]: false }));
          setGraphProgress(prev => {
            const newState = { ...prev };
            delete newState[kbName];
            return newState;
          });
          message.error(`知识图谱构建失败: ${status.error_message || '未知错误'}`);
        }
      } catch (error) {
        console.error('获取图谱构建进度失败:', error);
        clearInterval(pollInterval);
        setBuildingGraph(prev => ({ ...prev, [kbName]: false }));
        setGraphProgress(prev => {
          const newState = { ...prev };
          delete newState[kbName];
          return newState;
        });
        message.error('网络错误');
      }
    }, 2000); // 每2秒检查一次
  };

  // 表格列定义
  const columns = [
    {
      title: '知识库名称',
      dataIndex: 'name',
      key: 'name',
      width: '25%',
      render: (text, record) => (
        <Space>
          <DatabaseOutlined style={{ color: '#1890ff' }} />
          <span style={{ fontWeight: 'bold' }}>{text}</span>
          {!record.exists && <Tag color="red" size="small">文件缺失</Tag>}
        </Space>
      ),
    },
    {
      title: '类目',
      dataIndex: 'categories',
      key: 'categories',
      width: '20%',
      render: (categories) => (
        <Space wrap>
          {(categories || []).map(category => (
            <Tag key={category} color="blue" size="small">
              {category}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '文件数',
      dataIndex: 'file_count',
      key: 'file_count',
      width: '10%',
      render: (count) => (
        <Tag color="green">{count || 0}</Tag>
      ),
    },
    {
      title: '切片数',
      dataIndex: 'document_count',
      key: 'document_count',
      width: '10%',
      render: (count) => (
        <Tag color="orange">{count || 0}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: '20%',
      render: (_, record) => (
        <Space>
          <Tooltip title={getGraphButtonTooltip(record)}>
            <Button
              type={getGraphButtonType(record)}
              size="small"
              icon={getGraphButtonIcon(record)}
              onClick={() => handleExtractGraph(record)}
              disabled={!record.exists || buildingGraph[record.name]}
              loading={buildingGraph[record.name]}
            >
              {getGraphButtonText(record)}
            </Button>
          </Tooltip>
          <Tooltip title="删除知识库">
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
              loading={deleting[record.name]}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // 如果没有知识库
  if (knowledgeBases.length === 0) {
    return (
      <Empty
        description="暂无知识库"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  return (
    <div className="knowledge-bases-list">
      {/* 统计信息 */}
      <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 6 }}>
        <Space size="large">
          <span>知识库数: <strong>{stats.total}</strong></span>
        </Space>
      </div>

      {/* 知识库列表 */}
      <Table
        columns={columns}
        dataSource={knowledgeBases}
        rowKey="name"
        pagination={false}
        size="small"
        loading={loadingKBs || loading}
      />
    </div>
  );
}

export default KnowledgeBasesList;
