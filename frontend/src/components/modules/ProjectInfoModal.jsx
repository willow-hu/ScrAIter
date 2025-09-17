import React, { useState, useEffect } from 'react';
import { Modal, Space, Typography, Input, Select, message } from 'antd';

const { TextArea } = Input;

function ProjectInfoModal({ 
  visible, 
  projectInfo, 
  onSave, 
  onCancel 
}) {
  const [form, setForm] = useState({});
  const [knowledgeBases, setKnowledgeBases] = useState([]);
  const [loading, setLoading] = useState(false);

  // 当modal打开时，初始化表单数据
  useEffect(() => {
    if (visible && projectInfo) {
      setForm({ ...projectInfo });
    }
  }, [visible, projectInfo]);

  // 加载知识库列表
  useEffect(() => {
    if (visible) {
      loadKnowledgeBases();
    }
  }, [visible]);

  // 加载知识库列表
  const loadKnowledgeBases = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/v1/knowledge-base/list');
      if (!response.ok) {
        throw new Error('获取知识库列表失败');
      }
      const result = await response.json();
      
      // 转换为数组格式
      const kbArray = Object.keys(result.knowledge_bases || {}).map(name => ({
        name,
        ...result.knowledge_bases[name]
      }));
      
      setKnowledgeBases(kbArray);
    } catch (error) {
      console.error('加载知识库列表失败:', error);
      message.error('加载知识库列表失败');
      setKnowledgeBases([]);
    } finally {
      setLoading(false);
    }
  };

  // 处理保存
  const handleSave = () => {
    onSave(form);
  };

  // 处理取消
  const handleCancel = () => {
    setForm({});
    onCancel();
  };

  // 处理表单字段变化
  const handleFieldChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Modal
      title="项目信息"
      open={visible}
      onOk={handleSave}
      onCancel={handleCancel}
      okText="保存"
      cancelText="取消"
      width={600}
      destroyOnHidden={true}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <div>
          <Typography.Text strong>知识库</Typography.Text>
          <Select
            style={{ width: '100%' }}
            placeholder="选择一个知识库"
            value={form.knowledge_base_name || form.knowledge_base}
            onChange={(value) => handleFieldChange('knowledge_base_name', value)}
            loading={loading}
            allowClear
          >
            {knowledgeBases.map(kb => (
              <Select.Option key={kb.name} value={kb.name}>
                {kb.name}
              </Select.Option>
            ))}
          </Select>
        </div>
        <div>
          <Typography.Text strong>景点名称</Typography.Text>
          <Input
            value={form.site_name || ''}
            onChange={(e) => handleFieldChange('site_name', e.target.value)}
            placeholder="输入景点名称"
          />
        </div>
        <div>
          <Typography.Text strong>讲述者角色</Typography.Text>
          <Input
            value={form.narrator_role || ''}
            onChange={(e) => handleFieldChange('narrator_role', e.target.value)}
            placeholder="输入讲述者角色"
          />
        </div>
        <div>
          <Typography.Text strong>角色设定</Typography.Text>
          <TextArea
            value={form.character_setting || ''}
            onChange={(e) => handleFieldChange('character_setting', e.target.value)}
            placeholder="输入角色设定"
            rows={3}
          />
        </div>
        <div>
          <Typography.Text strong>其他要求</Typography.Text>
          <TextArea
            value={form.other_requirements || ''}
            onChange={(e) => handleFieldChange('other_requirements', e.target.value)}
            placeholder="（非必填）可添加您对大纲的要求，这些要求将添加进系统预设的提示词中。"
            rows={3}
          />
        </div>
      </Space>
    </Modal>
  );
}

export default ProjectInfoModal;