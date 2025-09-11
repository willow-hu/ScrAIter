import React, { useState, useMemo, useEffect } from 'react';
import { Button, Select, Space, Progress, Alert, Divider, message, Modal, List, Tag } from 'antd';
import { DatabaseOutlined, PlayCircleOutlined, StopOutlined, DeleteOutlined } from '@ant-design/icons';
import { KNOWLEDGE_BASE_CONFIG, getFlattenedConfig } from '../../config/knowledgeBaseConfig';
import {
  calculateSelectedStats,
  canBuildKnowledgeBase,
  fetchKnowledgeBases,
  isKnowledgeBaseNameExists,
  startKnowledgeBaseBuild,
  fetchBuildProgress,
  deleteKnowledgeBase,
  formatDate,
  getBuildStatusColor
} from '../../utils/archive_manager';

const { Option } = Select;

function KnowledgeBaseBuilder({ categories, files, onRefresh }) {
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [building, setBuilding] = useState(false);
  const [buildProgress, setBuildProgress] = useState(0);
  const [buildStatus, setBuildStatus] = useState('idle'); // idle, building, completed, error
  const [buildMessage, setBuildMessage] = useState('');
  const [existingKBs, setExistingKBs] = useState([]);
  const [showKBListModal, setShowKBListModal] = useState(false);
  const [loadingKBs, setLoadingKBs] = useState(false);

  // 构建参数配置
  const buildConfig = getFlattenedConfig(KNOWLEDGE_BASE_CONFIG);

  // 加载知识库列表
  const loadKnowledgeBases = async () => {
    setLoadingKBs(true);
    try {
      const kbList = await fetchKnowledgeBases();
      setExistingKBs(kbList);
    } catch (error) {
      console.error('获取知识库列表失败:', error);
      setExistingKBs([]);
    } finally {
      setLoadingKBs(false);
    }
  };

  // 组件挂载时加载知识库列表
  useEffect(() => {
    loadKnowledgeBases();
  }, []);

  // 当模态框打开时刷新知识库列表
  useEffect(() => {
    if (showKBListModal) {
      loadKnowledgeBases();
    }
  }, [showKBListModal]);

  // 计算选中类目的文件统计
  const selectedStats = useMemo(() => {
    return calculateSelectedStats(selectedCategories, files);
  }, [selectedCategories, files]);

  // 检查是否可以构建知识库
  const canBuild = useMemo(() => {
    return canBuildKnowledgeBase(selectedCategories, selectedStats);
  }, [selectedCategories, selectedStats]);

  // 开始构建知识库
  const handleBuild = async () => {
    if (!canBuild) {
      message.error('请确保所选类目中的所有文件都已标记标签');
      return;
    }

    // 首先获取已有知识库列表来检查名称冲突
    await loadKnowledgeBases();

    // 让用户输入知识库名称
    Modal.confirm({
      title: '构建知识库',
      content: (
        <div>
          <p>将使用以下类目构建知识库：</p>
          <ul>
            {selectedCategories.map(cat => (
              <li key={cat}>{cat} ({files.filter(f => f.category === cat).length} 个文件)</li>
            ))}
          </ul>
          <p style={{ marginTop: 16 }}>请输入知识库名称（英文）：</p>
          <input 
            id="kb-name-input" 
            placeholder="例：twin_pagoda" 
            style={{ width: '100%', padding: '8px' }}
          />
          {/* {existingKBs.length > 0 && (
            <div style={{ marginTop: 8, fontSize: '12px', color: '#666' }}>
              已存在的知识库：{existingKBs.map(kb => kb.name).join(', ')}
            </div>
          )} */}
          <div style={{ marginTop: 12, padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px', fontSize: '12px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>构建配置：</div>
            <div>分块大小: {buildConfig.chunk_size} | 重叠: {buildConfig.chunk_overlap}</div>
            <div>嵌入模型: {buildConfig.embedding_model} | 索引类型: {buildConfig.index_type}</div>
            <div>相似度算法: {buildConfig.similarity_metric} | 批次大小: {buildConfig.batch_size}</div>
          </div>
        </div>
      ),
      okText: '开始构建',
      cancelText: '取消',
      onOk: async () => {
        const kbName = document.getElementById('kb-name-input')?.value?.trim();
        if (!kbName) {
          message.error('请输入知识库名称');
          return Promise.reject();
        }
        
        // 检查知识库名称是否已存在
        const nameExists = isKnowledgeBaseNameExists(kbName, existingKBs);
        if (nameExists) {
          message.error(`知识库 "${kbName}" 已存在，请使用其他名称`);
          return Promise.reject();
        }
        
        await startBuild(kbName);
      }
    });
  };

  // 执行构建
  const startBuild = async (kbName) => {
    setBuilding(true);
    setBuildStatus('building');
    setBuildProgress(0);
    setBuildMessage('正在初始化...');

    try {
      const result = await startKnowledgeBaseBuild(kbName, selectedCategories, buildConfig);
      
      // 开始轮询构建进度
      pollBuildProgress(result.task_id);
    } catch (error) {
      console.error('构建知识库失败:', error);
      message.error(`构建失败: ${error.message}`);
      setBuildStatus('error');
      setBuildMessage(`构建失败: ${error.message}`);
      setBuilding(false);
    }
  };

  // 轮询构建进度
  const pollBuildProgress = async (taskId) => {
    const pollInterval = setInterval(async () => {
      try {
        const status = await fetchBuildProgress(taskId);
        setBuildProgress(status.progress);
        setBuildMessage(status.current_file || '处理中...');
        
        if (status.status === 'completed') {
          clearInterval(pollInterval);
          setBuildStatus('completed');
          setBuildMessage('知识库构建完成！');
          setBuilding(false);
          message.success('知识库构建完成');
          onRefresh();
          // 刷新知识库列表
          loadKnowledgeBases();
        } else if (status.status === 'error') {
          clearInterval(pollInterval);
          setBuildStatus('error');
          setBuildMessage(status.error_message || '构建过程中发生错误');
          setBuilding(false);
          message.error('知识库构建失败');
        }
      } catch (error) {
        console.error('获取构建进度失败:', error);
        clearInterval(pollInterval);
        setBuildStatus('error');
        setBuildMessage('网络错误');
        setBuilding(false);
      }
    }, 2000); // 每2秒检查一次
  };

  // 删除知识库
  const handleDeleteKB = async (kbName) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除知识库 "${kbName}" 吗？此操作不可恢复。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteKnowledgeBase(kbName);
          message.success(`知识库 "${kbName}" 删除成功`);
          // 刷新知识库列表
          loadKnowledgeBases();
        } catch (error) {
          console.error('删除知识库失败:', error);
          message.error(`删除失败: ${error.message}`);
        }
      }
    });
  };

  // 停止构建
  const handleStopBuild = () => {
    Modal.confirm({
      title: '确认停止',
      content: '确定要停止当前的知识库构建吗？已构建的进度将丢失。',
      okText: '停止',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        setBuilding(false);
        setBuildStatus('idle');
        setBuildProgress(0);
        setBuildMessage('');
        message.info('已停止构建');
      }
    });
  };

  // 获取状态颜色
  const getStatusColor = () => {
    return getBuildStatusColor(buildStatus);
  };

  return (
    <div className="kb-builder">
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {/* 类目选择 */}
        <div>
          <label style={{ display: 'block', marginBottom: 8 }}>选择类目：</label>
          <Select
            mode="multiple"
            value={selectedCategories}
            onChange={setSelectedCategories}
            placeholder="选择一个或多个类目"
            style={{ width: '100%' }}
            maxTagCount={3}
          >
            {categories.map(category => {
              const categoryFiles = files.filter(f => f.category === category);
              const untaggedCount = categoryFiles.filter(f => !f.source_tag).length;
              
              return (
                <Option key={category} value={category}>
                  {category}
                  {untaggedCount > 0 && <span style={{ color: 'red' }}> - {untaggedCount}个未标记</span>}
                </Option>
              );
            })}
          </Select>
        </div>

        {/* 选中文件统计 */}
        {selectedCategories.length > 0 && (
          <Alert
            message={
              <div>
                <p>已选择 {selectedStats.total} 个文件</p>
                <p>
                  已标记: {selectedStats.withTags} | 
                  未标记: <span style={{ color: selectedStats.withoutTags > 0 ? 'red' : 'inherit' }}>
                    {selectedStats.withoutTags}
                  </span>
                </p>
              </div>
            }
            type={selectedStats.withoutTags > 0 ? 'warning' : 'info'}
            showIcon
          />
        )}

        <Divider />

        {/* 构建控制 */}
        <div>
          {!building ? (
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={handleBuild}
              disabled={!canBuild}
              size="large"
              style={{ width: '100%' }}
            >
              构建知识库
            </Button>
          ) : (
            <Button
              danger
              icon={<StopOutlined />}
              onClick={handleStopBuild}
              size="large"
              style={{ width: '100%' }}
            >
              停止构建
            </Button>
          )}

          {!canBuild && selectedCategories.length > 0 && selectedStats.withoutTags > 0 && (
            <div style={{ marginTop: 8, fontSize: '12px', color: '#ff4d4f' }}>
              请先为所有文件标记标签后再构建知识库
            </div>
          )}
        </div>

        {/* 构建进度 */}
        {building && (
          <div>
            <Progress 
              percent={Math.round(buildProgress)} 
              status={buildStatus === 'error' ? 'exception' : 'active'}
            />
            <div style={{ marginTop: 8, fontSize: '12px', color: '#666' }}>
              {buildMessage}
            </div>
          </div>
        )}

        {/* 构建状态 */}
        {buildStatus !== 'idle' && !building && (
          <Alert
            message={buildMessage}
            type={buildStatus === 'completed' ? 'success' : 'error'}
            showIcon
          />
        )}

        <Divider />

        {/* 已有知识库管理 */}
        <div>
          <Space>
            <Button
              icon={<DatabaseOutlined />}
              onClick={() => setShowKBListModal(true)}
              loading={loadingKBs}
            >
              管理知识库 {existingKBs.length > 0 && `(${existingKBs.length})`}
            </Button>
          </Space>
        </div>
      </Space>

      {/* 知识库列表弹窗 */}
      <Modal
        title="知识库管理"
        open={showKBListModal}
        onCancel={() => setShowKBListModal(false)}
        footer={null}
        width={700}
      >
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span>已构建的知识库：</span>
            <Button 
              size="small" 
              onClick={loadKnowledgeBases}
              loading={loadingKBs}
            >
              刷新
            </Button>
          </div>
          
          <List
            dataSource={existingKBs}
            loading={loadingKBs}
            locale={{ emptyText: '暂无知识库' }}
            renderItem={item => (
              <List.Item
                actions={[
                  <Button 
                    size="small" 
                    danger 
                    icon={<DeleteOutlined />}
                    onClick={() => handleDeleteKB(item.name)}
                  >
                    删除
                  </Button>
                ]}
              >
                <List.Item.Meta
                  title={
                    <Space>
                      <span style={{ fontWeight: 'bold' }}>{item.name}</span>
                      {!item.exists && <Tag color="red">文件缺失</Tag>}
                    </Space>
                  }
                  description={
                    <div>
                      <div>创建时间: {formatDate(item.created_time)}</div>
                      <div>文件数量: {item.file_count || 0} 个</div>
                      <div>切片数量: {item.document_count || 0} 个</div>
                      <div>类目: {(item.categories || []).join(', ')}</div>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        </div>
      </Modal>
    </div>
  );
}

export default KnowledgeBaseBuilder;
