import React, { useState, useEffect } from 'react';
import { Modal, Row, Col, Card, Button, Input, Typography, Space, message, Slider, Select } from 'antd';
import { SaveOutlined, RobotOutlined, PictureOutlined, UserOutlined } from '../../utils/icons';
import ReferencePanel from './ReferencePanel';
import BackgroundImageModal from './BackgroundImageModal';
const { Title, Text } = Typography;
const { TextArea } = Input;

function NodeEditModal({ 
  visible, 
  node, 
  treeData, 
  projectInfo,
  projectId,
  onClose, 
  onSave 
}) {
  const [nodeForm, setNodeForm] = useState({
    name: '',
    abstract: '',
    user: '',
    content: '',
    role: '' // 角色名称存储在role字段
  });
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [ragSources, setRagSources] = useState([]);
  const [lastGenerationId, setLastGenerationId] = useState(null);
  const [abortController, setAbortController] = useState(null); // 用于取消请求
  const [wordCount, setWordCount] = useState(180); // 默认字数设置
  const [backgroundImage, setBackgroundImage] = useState(null); // 背景图文件名
  const [backgroundModalVisible, setBackgroundModalVisible] = useState(false); // 背景图选择弹窗

  // 当节点变化时更新表单
  useEffect(() => {
    if (node) {
      setNodeForm({
        name: node.name || '',
        abstract: node.abstract || '',
        user: node.user || '',
        content: node.content || '',
        role: node.role || ''
      });
      
      // 加载背景图
      setBackgroundImage(node.bg || null);
      
      // 加载已保存的参考资料 - 添加调试日志
      if (node.ragSources && Array.isArray(node.ragSources)) {
        console.log('加载节点的参考资料:', node.ragSources.length, '个');
        setRagSources(node.ragSources);
      } else {
        console.log('节点没有参考资料，清空状态');
        setRagSources([]);
      }
      
      // 保存生成ID（如果存在）
      if (node.lastGenerationId) {
        setLastGenerationId(node.lastGenerationId);
      } else {
        setLastGenerationId(null);
      }
    }
  }, [node]);

  // 生成内容
  const generateContent = async () => {
    if (!node || !treeData) return;
    
    setGenerating(true);
    setNodeForm(prev => ({ ...prev, content: '' })); // 清空现有内容
    setRagSources([]); // 清空现有参考资料
    
    // 创建取消控制器
    const controller = new AbortController();
    setAbortController(controller);
    
    try {
      // 构建请求数据
      const requestData = {
        node_info: {
          name: nodeForm.name,
          abstract: nodeForm.abstract,
          user: nodeForm.user,
          id: node.id,
          role: nodeForm.role // 使用role字段
        },
        global_context: {
          character_list: projectInfo?.character_list || []
        },
        word_count: wordCount // 添加字数参数
      };

      // 使用fetch进行流式接收
      const response = await fetch('http://localhost:8000/api/v1/generate/node-content-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
        signal: controller.signal // 支持取消
      });

      if (!response.ok) {
        throw new Error(`服务器错误: ${response.status} ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      let fullContent = '';
      let currentGenerationId = null;
      let currentRagSources = []; // 使用局部变量跟踪RAG源
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            break;
          }
          
          // 解码数据块
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          
          // 处理完整的事件
          const events = buffer.split('\n\n');
          buffer = events.pop() || ''; // 保留不完整的事件
          
          for (const event of events) {
            if (event.trim() === '') continue;
            
            // 解析SSE格式的数据
            const lines = event.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.substring(6));
                  
                  switch (data.type) {
                    case 'start':
                      currentGenerationId = data.generation_id;
                      setLastGenerationId(currentGenerationId);
                      break;
                      
                    case 'rag_sources':
                      currentRagSources = data.sources || [];
                      setRagSources(currentRagSources);
                      break;
                      
                    case 'content':
                      fullContent += data.chunk;
                      setNodeForm(prev => ({
                        ...prev,
                        content: fullContent
                      }));
                      break;
                      
                    case 'complete':
                      // 生成完成
                      currentGenerationId = data.generation_id;
                      fullContent = data.full_content;
                      setNodeForm(prev => ({
                        ...prev,
                        content: fullContent
                      }));
                      
                      // 自动保存节点 - 使用局部变量确保RAG源不会丢失
                      const updateData = {
                        name: nodeForm.name,
                        abstract: nodeForm.abstract,
                        user: nodeForm.user,
                        content: fullContent,
                        role: nodeForm.role || undefined, // 保存角色选择到role字段
                        bg: backgroundImage || undefined, // 保存背景图
                        ragSources: currentRagSources.length > 0 ? currentRagSources : undefined,
                        lastGenerationId: currentGenerationId
                      };
                      
                      console.log('保存节点数据，包含参考资料:', currentRagSources.length, '个');
                      onSave(node.id, updateData);
                      
                      // 确保状态也更新到最新值
                      setRagSources(currentRagSources);
                      setLastGenerationId(currentGenerationId);
                      
                      setGenerating(false);
                      setAbortController(null);
                      return;
                      
                    case 'error':
                      console.error('生成错误:', data.message);
                      message.error(`生成内容失败: ${data.message}`);
                      setGenerating(false);
                      setAbortController(null);
                      return;
                      
                    default:
                      console.log('未知事件类型:', data.type);
                  }
                } catch (parseError) {
                  console.error('解析流式数据失败:', parseError, 'Line:', line);
                }
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

    } catch (error) {
      if (error.name === 'AbortError') {
        message.info('已取消生成');
      } else {
        console.error('流式生成失败:', error);
        message.error(`生成内容失败: ${error.message}`);
      }
      setGenerating(false);
      setAbortController(null);
    }
  };

  // 取消生成
  const cancelGeneration = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setGenerating(false);
    }
  };

  // 加载参考资料
  const loadReferences = async (generationId) => {
    if (!generationId) return [];
    
    try {
      const response = await fetch(`http://localhost:8000/api/v1/rag/sources/${generationId}`);
      
      if (!response.ok) {
        throw new Error(`获取参考资料失败: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      const sources = result.sources || [];
      setRagSources(sources);
      return sources;
    } catch (error) {
      console.error('获取参考资料失败:', error);
      message.error(`获取参考资料失败: ${error.message}`);
      return [];
    }
  };

  // 保存节点（不关闭模态框）
  const handleSave = () => {
    if (!node) return;
    
    // 构建更新数据，包含参考资料和背景图
    const updateData = {
      ...nodeForm,
      role: nodeForm.role || undefined, // 保存角色选择到role字段
      bg: backgroundImage || undefined, // 保存背景图文件名到bg字段
      ragSources: ragSources.length > 0 ? ragSources : undefined, // 只在有参考资料时保存
      lastGenerationId: lastGenerationId || undefined // 只在有生成ID时保存
    };
    
    // 更新节点数据
    onSave(node.id, updateData);
    
    message.success('保存成功');
    // 注意：这里不调用 onClose()，保持模态框打开
  };

  // 取消编辑
  const handleCancel = () => {
    onClose();
  };

  // 处理背景图选择
  const handleBackgroundImageSelect = (bgId) => {
    // 只更新本地UI状态，不修改script.json
    // 实际的used_by更新已在BackgroundImageModal中完成
    setBackgroundImage(bgId);
    message.success(bgId ? '背景图已设置' : '背景图已清除');
  };

  // 获取当前知识库名称
  const getCurrentKnowledgeBaseName = () => {
    // 从treeData的全局上下文中获取，或者从其他地方获取知识库名称
    // 这里需要根据实际的数据结构来调整
    return window.location.pathname.includes('twin_pagoda') ? 'twin_pagoda' : 'default';
  };

  if (!node) return null;

  return (
    <Modal
      title={`场景 #${node.id}`}
      open={visible}
      onCancel={handleCancel}
      width={1200}
      centered
      className="node-edit-modal"
      footer={null}
    >
      <Row gutter={16}>
        {/* 左侧：节点编辑区域 */}
        <Col span={14}>
          <Card 
            title={`编辑内容`}
            size="small"
            className="panel node-edit-panel"
            styles={{
              body: { flex: 1, display: 'flex', flexDirection: 'column' }
            }}
          >
            <div className="node-edit-form">
              {/* 节点信息编辑 */}
              <div className="node-edit-form-item">
                <Text className="node-edit-form-label" strong>关键词</Text>
                <Input
                  className="node-edit-form-input"
                  value={nodeForm.name}
                  onChange={(e) => setNodeForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="输入节点关键词"
                />
              </div>

              <div className="node-edit-form-item">
                <Text className="node-edit-form-label" strong>用户选项</Text>
                <Input
                  className="node-edit-form-input"
                  value={nodeForm.user}
                  onChange={(e) => setNodeForm(prev => ({ ...prev, user: e.target.value }))}
                  placeholder="输入用户选项/问题"
                />
              </div>

              <div className="node-edit-form-item">
                <Text className="node-edit-form-label" strong>摘要</Text>
                <TextArea
                  className="node-edit-form-input"
                  value={nodeForm.abstract}
                  onChange={(e) => setNodeForm(prev => ({ ...prev, abstract: e.target.value }))}
                  placeholder="输入节点摘要"
                  rows={2}
                />
              </div>

              {/* 角色选择和字数控制 - 同一行 */}
              <div className="node-edit-form-item">
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  {/* 左侧：角色选择 */}
                  <div style={{ flex: '1', minWidth: '200px' }}>
                    <Text className="node-edit-form-label" strong>讲述者角色</Text>
                    <Select
                      value={nodeForm.role}
                      onChange={(value) => setNodeForm(prev => ({ ...prev, role: value }))}
                      placeholder="选择角色（可选）"
                      allowClear
                      style={{ width: '100%' }}
                      size="small"
                    >
                      {(projectInfo?.character_list || []).map(character => (
                        <Select.Option key={character.name} value={character.name}>
                          <span>{character.name}</span>
                        </Select.Option>
                      ))}
                    </Select>
                  </div>

                  {/* 右侧：字数控制 */}
                  <div style={{ flex: '1', minWidth: '200px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text className="node-edit-form-label" strong>字数</Text>
                      <Text style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>
                        {wordCount}±10字
                      </Text>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Text style={{ fontSize: '12px', color: '#999', minWidth: '25px' }}>50</Text>
                      <div style={{ flex: 1 }}>
                        <Slider
                          min={50}
                          max={300}
                          step={10}
                          value={wordCount}
                          onChange={setWordCount}
                          tooltip={{
                            formatter: (value) => `${value}`
                          }}
                          styles={{
                            rail: {
                              backgroundColor: '#f0f0f0',
                              height: '6px',
                              borderRadius: '3px'
                            },
                            track: {
                              backgroundColor: '#1890ff',
                              height: '6px',
                              borderRadius: '3px'
                            }
                          }}
                        />
                      </div>
                      <Text style={{ fontSize: '12px', color: '#999', minWidth: '25px', textAlign: 'right' }}>300</Text>
                    </div>
                  </div>
                </div>
              </div>

              <div className="node-edit-form-item" style={{ flex: 1 }}>
                <Text className="node-edit-form-label" strong>内容</Text>
                <TextArea
                  className="node-edit-form-input"
                  value={nodeForm.content}
                  onChange={(e) => setNodeForm(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="生成的内容将显示在这里，您也可以手动编辑"
                  rows={5}
                  style={{ height: 'calc(100% - 32px)'}}
                />
              </div>

              {/* 操作按钮 */}
              <div className="node-edit-actions">
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <Space>
                    {generating ? (
                      <Button 
                        type="default"
                        danger
                        onClick={cancelGeneration}
                        className="node-edit-cancel-btn"
                      >
                        取消生成
                      </Button>
                    ) : (
                      <Button 
                        type="primary"
                        className="node-edit-generate-btn"
                        icon={<RobotOutlined />}
                        onClick={generateContent}
                        loading={generating}
                      >
                        生成内容
                      </Button>
                    )}
                    
                    <Button 
                      icon={<SaveOutlined />}
                      onClick={handleSave}
                      disabled={generating}
                    >
                      保存
                    </Button>
                  </Space>
                  
                  <Button 
                    icon={<PictureOutlined />}
                    onClick={() => setBackgroundModalVisible(true)}
                    disabled={generating}
                    title={backgroundImage ? `当前背景：${backgroundImage}` : '设置背景图'}
                  >
                    设置背景图
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </Col>

        {/* 右侧：参考资料面板 */}
        <Col span={10}>
          <ReferencePanel 
            sources={ragSources} 
            loading={generating}
          />
        </Col>
      </Row>

      {/* 背景图选择弹窗 */}
      <BackgroundImageModal
        visible={backgroundModalVisible}
        projectId={projectId}
        nodeId={node?.id}
        currentBackground={backgroundImage}
        onClose={() => setBackgroundModalVisible(false)}
        onSelect={handleBackgroundImageSelect}
      />
    </Modal>
  );
}

export default NodeEditModal;