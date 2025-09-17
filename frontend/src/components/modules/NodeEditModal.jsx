import React, { useState, useEffect } from 'react';
import { Modal, Row, Col, Card, Button, Input, Typography, Space, message } from 'antd';
import { SaveOutlined, RobotOutlined } from '../../utils/icons';
import ReferencePanel from './ReferencePanel';

const { Title, Text } = Typography;
const { TextArea } = Input;

function NodeEditModal({ 
  visible, 
  node, 
  treeData, 
  onClose, 
  onSave 
}) {
  const [nodeForm, setNodeForm] = useState({
    name: '',
    abstract: '',
    user: '',
    content: ''
  });
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [ragSources, setRagSources] = useState([]);
  const [lastGenerationId, setLastGenerationId] = useState(null);

  // 当节点变化时更新表单
  useEffect(() => {
    if (node) {
      setNodeForm({
        name: node.name || '',
        abstract: node.abstract || '',
        user: node.user || '',
        content: node.content || ''
      });
      
      // 加载已保存的参考资料
      if (node.ragSources && Array.isArray(node.ragSources)) {
        setRagSources(node.ragSources);
      } else {
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
    try {
      const response = await fetch('http://localhost:8000/api/v1/generate/node-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          node_info: {
            name: nodeForm.name,
            abstract: nodeForm.abstract,
            user: nodeForm.user,
            id: node.id
          },
          global_context: treeData.global_context
        })
      });
      
      if (!response.ok) {
        throw new Error('生成内容失败');
      }
      
      const result = await response.json();
      
      // 更新内容
      setNodeForm(prev => ({
        ...prev,
        content: result.content
      }));
      
      // 保存生成ID并自动加载参考资料
      setLastGenerationId(result.generation_id);
      const sources = await loadReferences(result.generation_id);
      
      // 自动保存节点（包含新生成的内容和参考资料）
      const updateData = {
        ...nodeForm,
        content: result.content,
        ragSources: sources && sources.length > 0 ? sources : undefined,
        lastGenerationId: result.generation_id
      };
      onSave(node.id, updateData);
      
      message.success('内容生成成功');
    } catch (error) {
      console.error('生成内容失败:', error);
      message.error('生成内容失败');
    } finally {
      setGenerating(false);
    }
  };

  // 加载参考资料
  const loadReferences = async (generationId) => {
    if (!generationId) return [];
    
    try {
      const response = await fetch(`http://localhost:8000/api/v1/rag/sources/${generationId}`);
      if (!response.ok) {
        throw new Error('获取参考资料失败');
      }
      
      const result = await response.json();
      const sources = result.sources || [];
      setRagSources(sources);
      return sources; // 返回加载的参考资料
    } catch (error) {
      console.error('获取参考资料失败:', error);
      message.error('获取参考资料失败');
      return [];
    }
  };

  // 保存节点（不关闭模态框）
  const handleSave = () => {
    if (!node) return;
    
    // 构建更新数据，包含参考资料
    const updateData = {
      ...nodeForm,
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

  if (!node) return null;

  return (
    <Modal
      title={`节点 #${node.id}: ${node.name || '未命名'}`}
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
            title="节点编辑"
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
                <Space>
                  <Button 
                    type="primary"
                    className="node-edit-generate-btn"
                    icon={<RobotOutlined />}
                    onClick={generateContent}
                    loading={generating}
                  >
                    生成内容
                  </Button>
                  
                  <Button 
                    icon={<SaveOutlined />}
                    onClick={handleSave}
                  >
                    保存
                  </Button>
                </Space>
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
    </Modal>
  );
}

export default NodeEditModal;