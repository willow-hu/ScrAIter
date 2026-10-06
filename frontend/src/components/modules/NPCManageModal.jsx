import { showcaseFetch as fetch } from '../../showcase/api.js';
import React, { useState, useEffect } from 'react';
import { Modal, Space, Typography, Input, Button, List, Card, message, Popconfirm, Divider, Upload } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons';

const { TextArea } = Input;
const { Text } = Typography;

function NPCManageModal({ 
  visible, 
  projectInfo, 
  onSave, 
  onCancel,
  projectId
}) {
  const [form, setForm] = useState({});
  const [characters, setCharacters] = useState([]);
  const [editingCharacter, setEditingCharacter] = useState(null);
  const [characterForm, setCharacterForm] = useState({ name: '', description: '', tone: '', portrait: '' });
  const [showCharacterForm, setShowCharacterForm] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // 当modal打开时，初始化表单数据和角色列表
  useEffect(() => {
    if (visible && projectInfo) {
      console.log('NPCManageModal - 初始化数据:', projectInfo);
      setForm({ ...projectInfo });
      // 从projectInfo中获取角色列表，如果没有则为空数组
      const characterList = projectInfo.character_list || [];
      console.log('NPCManageModal - 角色列表:', characterList);
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
    setCharacterForm({ name: '', description: '', tone: '', portrait: '' });
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
    setCharacterForm({ name: '', description: '', tone: '', portrait: '' });
    setShowCharacterForm(true);
  };

  const handleEditCharacter = (character, index) => {
    setEditingCharacter(index);
    setCharacterForm({ 
      name: character.name,
      description: character.description,
      tone: character.tone,
      portrait: character.portrait || ''
    });
    setShowCharacterForm(true);
  };

  const handleDeleteCharacter = (index) => {
    const newCharacters = characters.filter((_, i) => i !== index);
    setCharacters(newCharacters);
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
      portrait: characterForm.portrait || ''
    };

    let newCharacters;
    if (editingCharacter !== null) {
      // 编辑现有角色
      newCharacters = [...characters];
      newCharacters[editingCharacter] = newCharacter;
    } else {
      // 添加新角色
      newCharacters = [...characters, newCharacter];
    }

    setCharacters(newCharacters);
    setShowCharacterForm(false);
    setEditingCharacter(null);
    setCharacterForm({ name: '', description: '', tone: '', portrait: '' });
  };

  const handleCancelCharacter = () => {
    setShowCharacterForm(false);
    setEditingCharacter(null);
    setCharacterForm({ name: '', description: '', tone: '', portrait: '' });
  };

  // 处理立绘上传
  const handleAvatarUpload = async (file) => {
    if (!characterForm.name.trim()) {
      message.error('请先输入角色名称');
      return false;
    }

    setUploadingAvatar(true);
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`/api/v1/projects/${projectId}/assets/npc/upload`, {
        method: 'POST',
        body: formData
      });

      // 检查响应是否有内容
      const text = await response.text();
      if (!text) {
        throw new Error('服务器返回空响应');
      }

      let result;
      try {
        result = JSON.parse(text);
      } catch (e) {
        console.error('JSON解析失败:', text);
        throw new Error('服务器返回了无效的响应格式');
      }

      if (!response.ok || !result.success) {
        throw new Error(result.message || `上传失败 (状态码: ${response.status})`);
      }
      
      // 更新characterForm的portrait字段
      setCharacterForm(prev => ({ ...prev, portrait: result.filename }));
      
      message.success('立绘上传成功');
    } catch (error) {
      message.error(`立绘上传失败: ${error.message}`);
      console.error('Upload error:', error);
    } finally {
      setUploadingAvatar(false);
    }

    return false;
  };

  return (
    <Modal
      title="角色管理"
      open={visible}
      onOk={handleSave}
      onCancel={handleCancel}
      okText="保存"
      cancelText="取消"
      width={800}
      destroyOnHidden={true}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
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
                        {character.portrait && (
                          <div><Text type="secondary">立绘：</Text>{character.portrait}</div>
                        )}
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
              <div>
                <Text strong>上传立绘（可稍后上传）</Text>
                <div style={{ marginTop: 8 }}>
                  <Upload
                    beforeUpload={handleAvatarUpload}
                    showUploadList={false}
                    accept="image/*"
                    disabled={!characterForm.name.trim()}
                  >
                    <Button 
                      icon={<UploadOutlined />} 
                      loading={uploadingAvatar}
                      disabled={!characterForm.name.trim()}
                    >
                      {uploadingAvatar ? '上传中...' : '选择图片'}
                    </Button>
                  </Upload>
                  {!characterForm.name.trim() && (
                    <div style={{ color: '#999', fontSize: '12px', marginTop: 4 }}>
                      请先输入角色名称后再上传立绘
                    </div>
                  )}
                  {characterForm.portrait && (
                    <div style={{ color: '#52c41a', fontSize: '12px', marginTop: 4 }}>
                      已上传：{characterForm.portrait}
                    </div>
                  )}
                </div>
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

export default NPCManageModal;