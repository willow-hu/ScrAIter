import React, { useState, useMemo } from 'react';
import { Button, Select, Space, Progress, Alert, Divider, message, Modal, List, Tag } from 'antd';
import { DatabaseOutlined, PlayCircleOutlined, StopOutlined, DeleteOutlined } from '@ant-design/icons';

const { Option } = Select;

function KnowledgeBaseBuilder({ categories, files, onRefresh }) {
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [building, setBuilding] = useState(false);
  const [buildProgress, setBuildProgress] = useState(0);
  const [buildStatus, setBuildStatus] = useState('idle'); // idle, building, completed, error
  const [buildMessage, setBuildMessage] = useState('');
  const [existingKBs, setExistingKBs] = useState([]);
  const [showKBListModal, setShowKBListModal] = useState(false);

  // 计算选中类目的文件统计
  const selectedStats = useMemo(() => {
    if (selectedCategories.length === 0) return { total: 0, withTags: 0, withoutTags: 0 };
    
    const selectedFiles = files.filter(file => selectedCategories.includes(file.category));
    const total = selectedFiles.length;
    const withTags = selectedFiles.filter(file => file.source_tag).length;
    const withoutTags = total - withTags;
    
    return { total, withTags, withoutTags };
  }, [selectedCategories, files]);

  // 检查是否可以构建知识库
  const canBuild = useMemo(() => {
    return selectedCategories.length > 0 && selectedStats.withoutTags === 0 && selectedStats.total > 0;
  }, [selectedCategories, selectedStats]);

  // 开始构建知识库
  const handleBuild = async () => {
    if (!canBuild) {
      message.error('请确保所选类目中的所有文件都已设置标签');
      return;
    }

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
          <p style={{ marginTop: 16 }}>请输入知识库名称：</p>
          <input 
            id="kb-name-input" 
            placeholder="例如：twin_pagoda_kb" 
            style={{ width: '100%', padding: '8px' }}
          />
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
      const response = await fetch('http://localhost:8000/api/v1/knowledge-base/build', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: kbName,
          categories: selectedCategories,
          file_type: 'mixed' // 混合类型
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        // 开始轮询构建进度
        pollBuildProgress(result.task_id);
      } else {
        const error = await response.json();
        throw new Error(error.detail || '构建失败');
      }
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
        const response = await fetch(`http://localhost:8000/api/v1/knowledge-base/build-status/${taskId}`);
        
        if (response.ok) {
          const status = await response.json();
          setBuildProgress(status.progress);
          setBuildMessage(status.current_file || '处理中...');
          
          if (status.status === 'completed') {
            clearInterval(pollInterval);
            setBuildStatus('completed');
            setBuildMessage('知识库构建完成！');
            setBuilding(false);
            message.success('知识库构建完成');
            onRefresh();
          } else if (status.status === 'error') {
            clearInterval(pollInterval);
            setBuildStatus('error');
            setBuildMessage(status.error_message || '构建过程中发生错误');
            setBuilding(false);
            message.error('知识库构建失败');
          }
        } else {
          clearInterval(pollInterval);
          setBuildStatus('error');
          setBuildMessage('无法获取构建进度');
          setBuilding(false);
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
    switch (buildStatus) {
      case 'building': return 'blue';
      case 'completed': return 'green';
      case 'error': return 'red';
      default: return 'default';
    }
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
                  {category} ({categoryFiles.length} 个文件)
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
              请先为所有文件设置标签后再构建知识库
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
            >
              管理知识库
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
        width={600}
      >
        <div>
          <p>已构建的知识库：</p>
          {/* 这里后续会显示已有的知识库列表 */}
          <List
            dataSource={existingKBs}
            locale={{ emptyText: '暂无知识库' }}
            renderItem={item => (
              <List.Item
                actions={[
                  <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
                ]}
              >
                <List.Item.Meta
                  title={item.name}
                  description={`创建时间: ${item.created_time} | 文件数: ${item.file_count}`}
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
