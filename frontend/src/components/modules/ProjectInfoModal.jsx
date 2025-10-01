import React, { useState, useEffect } from 'react';
import { Modal, Space, Typography, Input, Button, List, Card, message, Popconfirm, Divider } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';

const { TextArea } = Input;
const { Text } = Typography;

function ProjectInfoModal({ 
  visible, 
  projectInfo, 
  onSave, 
  onCancel,
  projectName // 新增：项目名称，用于调用角色管理API
}) {
  const [form, setForm] = useState({});
  const [characters, setCharacters] = useState([]);
  const [editingCharacter, setEditingCharacter] = useState(null);
  const [characterForm, setCharacterForm] = useState({ name: '', description: '', tone: '' });
  const [showCharacterForm, setShowCharacterForm] = useState(false);

  // 当modal打开时，初始化表单数据和角色列表
  useEffect(() => {
    if (visible && projectInfo) {
      setForm({ ...projectInfo });
      // 从projectInfo中获取角色列表，如果没有则为空数组
      const characterList = projectInfo.character_list || [];
      setCharacters(characterList);
    }
  }, [visible, projectInfo]);

  // 处理保存
  const handleSave = () => {
    // 将角色列表添加到表单数据中
    const saveData = {
      ...form,
      character_list: characters
    };
    onSave(saveData);
  };

  // 处理取消
  const handleCancel = () => {
    setForm({});
    setCharacters([]);
    setEditingCharacter(null);
    setCharacterForm({ name: '', description: '', tone: '' });
    setShowCharacterForm(false);
    onCancel();
  };

  // 处理表单字段变化
  const handleFieldChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // 角色管理函数
  const handleAddCharacter = () => {
    setEditingCharacter(null);
    setCharacterForm({ name: '', description: '', tone: '' });
    setShowCharacterForm(true);
  };

  const handleEditCharacter = (character, index) => {
    setEditingCharacter(index);
    setCharacterForm({ ...character });
    setShowCharacterForm(true);
  };

  const handleDeleteCharacter = (index) => {
    const newCharacters = characters.filter((_, i) => i !== index);
    setCharacters(newCharacters);
    message.success('角色删除成功');
  };

  const handleSaveCharacter = () => {
    // 验证表单
    if (!characterForm.name.trim()) {
      message.error('请输入角色名称');
      return;
    }
    if (!characterForm.description.trim()) {
      message.error('请输入角色描述');
      return;
    }
    if (!characterForm.tone.trim()) {
      message.error('请输入角色口吻');
      return;
    }

    // 检查角色名称是否重复（编辑时排除自己）
    const existingNames = characters
      .filter((_, i) => i !== editingCharacter)
      .map(char => char.name);
    
    if (existingNames.includes(characterForm.name.trim())) {
      message.error('角色名称已存在');
      return;
    }

    const newCharacter = {
      name: characterForm.name.trim(),
      description: characterForm.description.trim(),
      tone: characterForm.tone.trim(),
      avatar: ''
    };

    let newCharacters;
    if (editingCharacter !== null) {
      // 编辑现有角色
      newCharacters = [...characters];
      newCharacters[editingCharacter] = newCharacter;
      message.success('角色更新成功');
    } else {
      // 添加新角色
      newCharacters = [...characters, newCharacter];
      message.success('角色添加成功');
    }

    setCharacters(newCharacters);
    setShowCharacterForm(false);
    setEditingCharacter(null);
    setCharacterForm({ name: '', description: '', tone: '' });
  };

  const handleCancelCharacter = () => {
    setShowCharacterForm(false);
    setEditingCharacter(null);
    setCharacterForm({ name: '', description: '', tone: '' });
  };

  return (
    <Modal
      title="项目信息"
      open={visible}
      onOk={handleSave}
      onCancel={handleCancel}
      okText="保存"
      cancelText="取消"
      width={800}
      destroyOnHidden={true}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* 基本信息 */}
        <div>
          <Typography.Text strong>景点名称</Typography.Text>
          <Input
            value={form.site_name || ''}
            onChange={(e) => handleFieldChange('site_name', e.target.value)}
            placeholder="输入景点名称"
          />
        </div>
        
        {/* <div>
          <Typography.Text strong>其他要求</Typography.Text>
          <TextArea
            value={form.other_requirements || ''}
            onChange={(e) => handleFieldChange('other_requirements', e.target.value)}
            placeholder="（非必填）可添加您对大纲的要求，这些要求将添加进系统预设的提示词中。"
            rows={3}
          />
        </div> */}

        <Divider />

        {/* 角色管理 */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Typography.Text strong>角色管理</Typography.Text>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={handleAddCharacter}
              size="small"
            >
              添加角色
            </Button>
          </div>

          {characters.length > 0 ? (
            <List
              dataSource={characters}
              renderItem={(character, index) => (
                <List.Item
                  actions={[
                    <Button 
                      type="text" 
                      icon={<EditOutlined />} 
                      onClick={() => handleEditCharacter(character, index)}
                      size="small"
                    >
                      编辑
                    </Button>,
                    <Popconfirm
                      title="确定要删除这个角色吗？"
                      onConfirm={() => handleDeleteCharacter(index)}
                      okText="确定"
                      cancelText="取消"
                    >
                      <Button 
                        type="text" 
                        danger 
                        icon={<DeleteOutlined />}
                        size="small"
                      >
                        删除
                      </Button>
                    </Popconfirm>
                  ]}
                >
                  <List.Item.Meta
                    title={character.name}
                    description={
                      <div>
                        <div><Text type="secondary">描述：</Text>{character.description}</div>
                        <div><Text type="secondary">口吻：</Text>{character.tone}</div>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          ) : (
            <div style={{ textAlign: 'center', color: '#999', fontSize: '14px' }}>
              暂无角色，点击"添加角色"创建第一个角色
            </div>
          )}
        </div>

        {/* 角色编辑表单 */}
        {showCharacterForm && (
          <Card title={editingCharacter !== null ? "编辑角色" : "添加角色"} size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>角色名称 *</Text>
                <Input
                  value={characterForm.name}
                  onChange={(e) => setCharacterForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="输入角色名称"
                />
              </div>
              <div>
                <Text strong>角色描述 *</Text>
                <TextArea
                  value={characterForm.description}
                  onChange={(e) => setCharacterForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="输入角色描述"
                  rows={2}
                />
              </div>
              <div>
                <Text strong>角色口吻 *</Text>
                <Input
                  value={characterForm.tone}
                  onChange={(e) => setCharacterForm(prev => ({ ...prev, tone: e.target.value }))}
                  placeholder="输入角色口吻，如：庄重、亲切、幽默等"
                />
              </div>
              <div style={{ textAlign: 'right' }}>
                <Space>
                  <Button onClick={handleCancelCharacter}>取消</Button>
                  <Button type="primary" onClick={handleSaveCharacter}>
                    {editingCharacter !== null ? "更新" : "添加"}
                  </Button>
                </Space>
              </div>
            </Space>
          </Card>
        )}
      </Space>
    </Modal>
  );
}

export default ProjectInfoModal;