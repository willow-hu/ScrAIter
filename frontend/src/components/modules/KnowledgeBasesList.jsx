import React, { useState, useMemo, useEffect } from 'react';
import { Table, Tag, Button, Empty, Tooltip, Space, Modal } from 'antd';
import { DeleteOutlined, NodeIndexOutlined, DatabaseOutlined } from '../../utils/icons';
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

  // 提取知识图谱 (暂时只是占位功能)
  const handleExtractGraph = async (kb) => {
    Modal.info({
      title: '知识图谱提取',
      content: `知识图谱提取功能正在开发中，将从知识库"${kb.name}"中提取结构化知识图谱。`,
      okText: '知道了'
    });
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
          <Tooltip title="提取知识图谱">
            <Button
              type="primary"
              size="small"
              icon={<NodeIndexOutlined />}
              onClick={() => handleExtractGraph(record)}
              disabled={!record.exists}
            >
              图谱
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
