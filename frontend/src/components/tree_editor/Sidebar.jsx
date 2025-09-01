import React, { useState } from 'react';
import { Button, Space, Card, Typography, Input, Divider, message, Modal } from 'antd';
import { SaveOutlined, DownloadOutlined, EditOutlined, DeleteOutlined, ExclamationCircleOutlined, UndoOutlined, RedoOutlined, ReloadOutlined } from '@ant-design/icons';
import { isValidTree } from '../../utils/tree_editor/treeValidator';

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
  onStartEdit,
  onUndo,
  onRedo,
  onReset,
  canUndo = false,
  canRedo = false
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

  // 处理重置脚本
  const handleReset = () => {
    Modal.confirm({
      title: '重置脚本',
      icon: <ExclamationCircleOutlined />,
      content: '确定要重置脚本吗？这将放弃所有未保存的更改，回到初始状态。',
      okText: '确定重置',
      cancelText: '取消',
      okType: 'danger',
      onOk() {
        onReset();
      },
    });
  };

  // 处理导出点击
  const handleExport = () => {
    if (isValidTree(treeData)) {
      // 如果是有效树结构，直接导出
      onExport();
    } else {
      // 如果不是有效树结构，显示警告对话框
      Modal.warning({
        title: '无法导出',
        icon: <ExclamationCircleOutlined />,
        content: (
          <div>
            <p>当前图结构不是有效的有向树结构，无法导出。</p>
            <p>请检查以下问题：</p>
            <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
              <li>是否有且仅有一个根节点（没有父节点的节点）</li>
              <li>除根节点外，每个节点是否都有且仅有一个父节点</li>
              <li>是否存在环形引用</li>
              <li>是否所有节点都连通</li>
            </ul>
          </div>
        ),
        okText: '知道了',
        width: 480,
      });
    }
  };

  return (
    <div className="sidebar" style={{ width: `${width}px` }}>
      <Title level={4} style={{ marginBottom: '16px', color: '#333' }}>🛠️ 操作面板</Title>
      
      <Space direction="vertical" style={{ width: '100%' }}>
        {/* 操作按钮 */}
        <Space direction="vertical" style={{ width: '100%' }}>
        <Button 
            type="primary" 
            icon={<SaveOutlined />} 
            onClick={onSave}
            block
        >
            保存修改
        </Button>
        
        {/* 撤销和回做按钮并排 */}
        <Space.Compact style={{ width: '100%' }}>
          <Button 
              icon={<UndoOutlined />} 
              onClick={onUndo}
              disabled={!canUndo}
              style={{ width: '50%' }}
          >
              撤销
          </Button>
          <Button 
              icon={<RedoOutlined />} 
              onClick={onRedo}
              disabled={!canRedo}
              style={{ width: '50%' }}
          >
              重做
          </Button>
        </Space.Compact>
        
        <Button 
            icon={<ReloadOutlined />} 
            onClick={handleReset}
            block
        >
            重置脚本
        </Button>
        
        <Button 
            icon={<DownloadOutlined />} 
            onClick={handleExport}
            block
        >
            导出脚本
        </Button>
        </Space>

        {/* 节点信息 */}
        {selectedNode && !isEditing && (
          <Card size="small" title={`📄 #${selectedNode.id} 节点信息`}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>关键词：</Text>
                <Text>{selectedNode.name || '未设置'}</Text>
              </div>
              <div>
                <Text strong>用户选项：</Text>
                <Text style={{ fontSize: '14px', color: '#666' }}>
                  {selectedNode.user || '未设置'}
                </Text>
              </div>
              <div>
                <Text strong>摘要：</Text>
                <Text style={{ fontSize: '14px', color: '#666' }}>
                  {selectedNode.abstract || '未设置'}
                </Text>
              </div>
              <Button 
                type="primary"
                icon={<EditOutlined />}
                onClick={() => onStartEdit(selectedNode)}
                block
              >
                编辑节点内容
              </Button>
            </Space>
          </Card>
        )}

        {/* 节点编辑 */}
        {selectedNode && isEditing && (
          <Card size="small" title={`✏️ #${selectedNode.id} 编辑节点`}>
            <Space direction="vertical" style={{ width: '100%' }}>
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
                type="primary"
                icon={<EditOutlined />}
                onClick={startEditingGlobal}
                block
              >
                编辑项目信息
              </Button>
            </Space>
          )}
        </Card>

        {(
          <Card size="small" title="使用说明">
            <Text type="secondary" style={{ fontSize: '14px' }}>
              1. 双击节点以编辑内容<br/>
              2. 空白处右击以添加节点<br/>
              3. 右击节点以获取更多操作选项<br/>
            </Text>
          </Card>
        )}
      </Space>
    </div>
  );
}

export default Sidebar;
