import React, { useState } from 'react';
import { Button, Space, Card, Typography, Input, Divider, message } from 'antd';
import { SaveOutlined, DownloadOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { TextArea } = Input;

function Sidebar({ 
  width, 
  treeData, 
  selectedNode, 
  isEditing, 
  onSave, 
  onExport, 
  onUpdateGlobalContext, 
  onUpdateNode, 
  onCloseEdit,
  onStartEdit
}) {
  const [editingGlobal, setEditingGlobal] = useState(false);
  const [globalForm, setGlobalForm] = useState({});
  const [nodeForm, setNodeForm] = useState({});

  // 开始编辑全局信息
  const startEditingGlobal = () => {
    setGlobalForm({ ...treeData.global_context });
    setEditingGlobal(true);
  };

  // 保存全局信息
  const saveGlobalContext = () => {
    onUpdateGlobalContext(globalForm);
    setEditingGlobal(false);
    setGlobalForm({});
  };

  // 取消编辑全局信息
  const cancelEditingGlobal = () => {
    setEditingGlobal(false);
    setGlobalForm({});
  };

  // 开始编辑节点时初始化表单
  React.useEffect(() => {
    if (isEditing && selectedNode) {
      setNodeForm({
        name: selectedNode.name || '',
        abstract: selectedNode.abstract || '',
        user: selectedNode.user || ''
      });
    }
  }, [isEditing, selectedNode]);

  // 保存节点信息
  const saveNode = () => {
    if (selectedNode) {
      onUpdateNode(selectedNode.id, nodeForm);
      onCloseEdit();
      setNodeForm({});
    }
  };

  // 取消编辑节点
  const cancelEditingNode = () => {
    onCloseEdit();
    setNodeForm({});
  };

  const isValidTree = () => {
    if (!treeData || !treeData.structure) return false;
    
    const nodes = treeData.structure;
    const nodeIds = new Set(nodes.map(n => n.id));
    
    // 检查所有child_ids是否都存在
    for (const node of nodes) {
      for (const childId of node.child_ids || []) {
        if (!nodeIds.has(childId)) return false;
      }
    }
    
    // 检查是否有环
    const visited = new Set();
    const visiting = new Set();
    
    const hasCircle = (nodeId) => {
      if (visiting.has(nodeId)) return true;
      if (visited.has(nodeId)) return false;
      
      visiting.add(nodeId);
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        for (const childId of node.child_ids || []) {
          if (hasCircle(childId)) return true;
        }
      }
      visiting.delete(nodeId);
      visited.add(nodeId);
      return false;
    };
    
    for (const node of nodes) {
      if (hasCircle(node.id)) return false;
    }
    
    return true;
  };

  return (
    <div className="sidebar" style={{ width: `${width}px` }}>
      <Title level={4} style={{ marginBottom: '16px', color: '#333' }}>🛠️ 操作面板</Title>
      
      <Space direction="vertical" style={{ width: '100%' }}>
        {/* 操作按钮 */}
        {/* <Card size="small" title="🛠️ 操作面板"> */}
        <Space direction="vertical" style={{ width: '100%' }}>
        <Button 
            type="primary" 
            icon={<SaveOutlined />} 
            onClick={onSave}
            block
        >
            保存修改
        </Button>
        <Button 
            icon={<DownloadOutlined />} 
            onClick={onExport}
            disabled={!isValidTree()}
            title={!isValidTree() ? "当前图结构不是有效的树结构" : ""}
            block
        >
            导出脚本
        </Button>
        {!isValidTree() && (
            <Text type="danger" style={{ fontSize: '12px' }}>
            当前图结构不是有效的树结构，存在环或未连通的节点
            </Text>
        )}
        </Space>
        {/* </Card> */}

        {/* 项目信息 */}
        <Card size="small" title="📊 项目信息">
          {editingGlobal ? (
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>景点名称</Text>
                <Input
                  value={globalForm.site_name || ''}
                  onChange={(e) => setGlobalForm(prev => ({ ...prev, site_name: e.target.value }))}
                  placeholder="输入景点名称"
                />
              </div>
              <div>
                <Text strong>讲述者角色</Text>
                <Input
                  value={globalForm.narrator_role || ''}
                  onChange={(e) => setGlobalForm(prev => ({ ...prev, narrator_role: e.target.value }))}
                  placeholder="输入讲述者角色"
                />
              </div>
              <div>
                <Text strong>角色设定</Text>
                <TextArea
                  value={globalForm.character_setting || ''}
                  onChange={(e) => setGlobalForm(prev => ({ ...prev, character_setting: e.target.value }))}
                  placeholder="输入角色设定"
                  rows={3}
                />
              </div>
              <div>
                <Text strong>成就</Text>
                <Input
                  value={globalForm.achievement || ''}
                  onChange={(e) => setGlobalForm(prev => ({ ...prev, achievement: e.target.value }))}
                  placeholder="输入成就"
                />
              </div>
              <Space>
                <Button type="primary" onClick={saveGlobalContext}>
                  保存
                </Button>
                <Button onClick={cancelEditingGlobal}>
                  取消
                </Button>
              </Space>
            </Space>
          ) : (
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>景点名称：</Text>
                <Text>{treeData.global_context?.site_name || '未设置'}</Text>
              </div>
              <div>
                <Text strong>讲述者角色：</Text>
                <Text>{treeData.global_context?.narrator_role || '未设置'}</Text>
              </div>
              <div>
                <Text strong>角色设定：</Text>
                <Text style={{ fontSize: '14px', color: '#666' }}>
                  {treeData.global_context?.character_setting || '未设置'}
                </Text>
              </div>
              <div>
                <Text strong>成就：</Text>
                <Text>{treeData.global_context?.achievement || '未设置'}</Text>
              </div>
              <Button 
                size="small" 
                onClick={editingGlobal ? cancelEditingGlobal : startEditingGlobal}
                block
              >
                {editingGlobal ? '取消' : '编辑项目信息'}
              </Button>
            </Space>
          )}
        </Card>

        {/* 节点编辑 */}
        {isEditing && selectedNode && (
          <Card size="small" title={`✏️ 编辑节点 ${selectedNode.id}`}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>节点ID</Text>
                <Text>#{selectedNode.id}</Text>
              </div>
              <div>
                <Text strong>关键词</Text>
                <Input
                  value={nodeForm.name || ''}
                  onChange={(e) => setNodeForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="输入节点关键词"
                />
              </div>
              <div>
                <Text strong>用户选项</Text>
                <TextArea
                  value={nodeForm.user || ''}
                  onChange={(e) => setNodeForm(prev => ({ ...prev, user: e.target.value }))}
                  placeholder="输入用户选项"
                  rows={2}
                />
              </div>
              <div>
                <Text strong>摘要</Text>
                <TextArea
                  value={nodeForm.abstract || ''}
                  onChange={(e) => setNodeForm(prev => ({ ...prev, abstract: e.target.value }))}
                  placeholder="输入节点摘要"
                  rows={3}
                />
              </div>
              <Space>
                <Button type="primary" onClick={saveNode}>
                  保存
                </Button>
                <Button onClick={cancelEditingNode}>
                  取消
                </Button>
              </Space>
            </Space>
          </Card>
        )}

        {(
          <Card size="small" title="使用说明">
            <Text type="secondary" style={{ fontSize: '14px' }}>
              1. 双击节点以编辑内容；
              2. 空白处右击以添加节点；
              3. 右击节点以获取更多操作选项；
            </Text>
          </Card>
        )}
      </Space>
    </div>
  );
}

export default Sidebar;
