import React, { useState } from 'react';
import { Button, Space, Card, Typography, Input, Divider, message, Modal, Drawer } from 'antd';
import { DownloadOutlined, EditOutlined, DeleteOutlined, ExclamationCircleOutlined, ReloadOutlined, DatabaseOutlined } from '@ant-design/icons';
import { isValidTree } from '../../utils/script_editor/treeValidator';
import KnowledgeBaseManager from './KnowledgeBaseManager';
import NodeEditModal from './NodeEditModal';

const { Title, Text } = Typography;
const { TextArea } = Input;

function Sidebar({ 
  width, 
  treeData, 
  selectedNode,
  onExport, 
  onUpdateGlobalContext, 
  onUpdateNode, 
  onStartEdit,
  onReset,
  inDrawer = false
}) {
  const [editingGlobal, setEditingGlobal] = useState(false);
  const [globalForm, setGlobalForm] = useState({});
  const [kbDrawerVisible, setKbDrawerVisible] = useState(false);
  const [nodeEditModalVisible, setNodeEditModalVisible] = useState(false);

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

  // 打开节点编辑模态框
  const handleEditNode = () => {
    setNodeEditModalVisible(true);
  };

  // 关闭节点编辑模态框
  const handleCloseNodeEdit = () => {
    setNodeEditModalVisible(false);
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
    <div className="sidebar" style={{ 
      width: inDrawer ? '100%' : `${width}px`,
      padding: inDrawer ? '16px' : '20px',
      height: inDrawer ? 'auto' : '100vh',
      overflowY: inDrawer ? 'visible' : 'auto'
    }}>
      {!inDrawer && <Title level={4} style={{ marginBottom: '16px', color: '#333' }}>🛠️ 操作面板</Title>}
      
      <Space direction="vertical" style={{ width: '100%' }}>
        <Button 
            type='primary'
            icon={<DownloadOutlined />} 
            onClick={handleExport}
            block
        >
            导出脚本
        </Button>   

        <Button 
            icon={<DatabaseOutlined />} 
            onClick={() => setKbDrawerVisible(true)}
            block
        >
            知识库管理
        </Button>
        
        <Button 
            icon={<ReloadOutlined />} 
            onClick={handleReset}
            block
        >
            重置脚本
        </Button>

        {/* 项目信息 */}
        <Card size="small" title="📊 项目信息">{editingGlobal ? (
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
              <ol style={{lineHeight: '1.8'}}>
                <li>在侧边栏修改项目信息</li>
                <li>拖动树节点以移动</li>
                <li>单击节点以选中，右侧显示节点信息</li>
                <li>双击节点以修改节点详细信息</li>
                <li>右键节点以获取更多操作选项</li>
                <li>空白区域右击可添加新节点</li>
                <li>若您需要修改知识库，可进入知识库管理界面添加、编辑、删除知识库条目</li>
              </ol>
            </Text>
          </Card>
        )}
      </Space>

      {/* 知识库管理抽屉 */}
      <Drawer
        title="知识库管理"
        placement="left"
        size="large"
        onClose={() => setKbDrawerVisible(false)}
        open={kbDrawerVisible}
      >
        <KnowledgeBaseManager onClose={() => setKbDrawerVisible(false)} />
      </Drawer>

      {/* 节点编辑模态框 */}
      <NodeEditModal
        visible={nodeEditModalVisible}
        node={selectedNode}
        treeData={treeData}
        onClose={handleCloseNodeEdit}
        onSave={onUpdateNode}
      />
    </div>
  );
}

export default Sidebar;
