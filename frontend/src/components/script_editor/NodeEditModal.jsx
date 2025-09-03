import React, { useState, useEffect } from 'react';
import { Modal, Row, Col, Card, Button, Input, Typography, Space, message } from 'antd';
import { SaveOutlined, RobotOutlined } from '@ant-design/icons';
import ReferencePanel from '../content_generator/ReferencePanel';

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
      // 清空参考资料
      setRagSources([]);
      setLastGenerationId(null);
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
      await loadReferences(result.generation_id);
      
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
    if (!generationId) return;
    
    try {
      const response = await fetch(`http://localhost:8000/api/v1/rag/sources/${generationId}`);
      if (!response.ok) {
        throw new Error('获取参考资料失败');
      }
      
      const result = await response.json();
      const sources = result.sources || [];
      setRagSources(sources);
    } catch (error) {
      console.error('获取参考资料失败:', error);
      message.error('获取参考资料失败');
    }
  };

  // 保存节点
  const handleSave = () => {
    if (!node) return;
    
    // 更新节点数据
    const updatedNode = { ...node, ...nodeForm };
    onSave(node.id, nodeForm);
    
    message.success('节点保存成功');
    onClose();
  };

  // 取消编辑
  const handleCancel = () => {
    onClose();
  };

  if (!node) return null;

  return (
    <Modal
      title={`编辑节点 #${node.id}: ${node.name || '未命名'}`}
      open={visible}
      onCancel={handleCancel}
      width={1200}
      style={{ top: 20 }}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          取消
        </Button>,
        <Button 
          key="save" 
          type="primary" 
          icon={<SaveOutlined />}
          onClick={handleSave}
        >
          保存
        </Button>
      ]}
    >
      <Row gutter={16}>
        {/* 左侧：节点编辑区域 */}
        <Col span={14}>
          <Card 
            title="节点编辑"
            style={{ height: '600px', overflow: 'auto' }}
          >
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              {/* 节点信息编辑 */}
              <div>
                <Text strong>关键词</Text>
                <Input
                  value={nodeForm.name}
                  onChange={(e) => setNodeForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="输入节点关键词"
                  style={{ marginTop: 8 }}
                />
              </div>

              <div>
                <Text strong>用户选项</Text>
                <Input
                  value={nodeForm.user}
                  onChange={(e) => setNodeForm(prev => ({ ...prev, user: e.target.value }))}
                  placeholder="输入用户选项/问题"
                  style={{ marginTop: 8 }}
                />
              </div>

              <div>
                <Text strong>摘要</Text>
                <TextArea
                  value={nodeForm.abstract}
                  onChange={(e) => setNodeForm(prev => ({ ...prev, abstract: e.target.value }))}
                  placeholder="输入节点摘要"
                  rows={2}
                  style={{ marginTop: 8 }}
                />
              </div>

              <div>
                <Text strong>内容</Text>
                <TextArea
                  value={nodeForm.content}
                  onChange={(e) => setNodeForm(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="生成的内容将显示在这里，您也可以手动编辑"
                  rows={8}
                  style={{ marginTop: 8 }}
                />
              </div>

              {/* 操作按钮 */}
              <div>
                <Button 
                  type="primary"
                  icon={<RobotOutlined />}
                  onClick={generateContent}
                  loading={generating}
                  style={{ marginRight: 8 }}
                >
                  生成内容
                </Button>
              </div>
            </Space>
          </Card>
        </Col>

        {/* 右侧：参考资料面板 */}
        <Col span={10}>
          <ReferencePanel 
            sources={ragSources} 
            loading={generating}
            style={{ height: '600px' }}
          />
        </Col>
      </Row>
    </Modal>
  );
}

export default NodeEditModal;