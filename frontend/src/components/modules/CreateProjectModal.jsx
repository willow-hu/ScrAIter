/**
 * 创建项目对话框组件
 * 
 * 功能说明：
 * - 输入新项目名称
 * - 选择关联的知识库
 * - 表单验证与提交
 * 
 * Props:
 * - knowledgeBases: 可用的知识库列表
 * - onCreateSuccess: 创建成功回调
 * - onCancel: 取消创建回调
 */

import React, { useState } from 'react';
import { Form, Input, Select, Button, Space, message } from 'antd';
import { createProject } from '../../utils/project_manager';

const { Option } = Select;

function CreateProjectModal({ knowledgeBases, onCreateSuccess, onCancel }) {
  const [form] = Form.useForm();
  const [creating, setCreating] = useState(false);

  // 处理表单提交
  const handleSubmit = async (values) => {
    setCreating(true);
    try {
      await createProject({
        name: values.name,
        kb_id: values.kb_id,
      });
      
      message.success('项目创建成功');
      onCreateSuccess && onCreateSuccess();
      form.resetFields();
      
    } catch (error) {
      console.error('创建项目失败:', error);
      message.error(`创建失败: ${error.message}`);
    } finally {
      setCreating(false);
    }
  };

  // 处理取消
  const handleCancel = () => {
    form.resetFields();
    onCancel && onCancel();
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      autoComplete="off"
    >
      <Form.Item
        label="剧本名称"
        name="name"
        rules={[
          { required: true, message: '请输入剧本名称' },
          { max: 50, message: '剧本名称不能超过50个字符' },
        ]}
      >
        <Input 
          placeholder="请输入剧本名称" 
          maxLength={50}
        />
      </Form.Item>

      <Form.Item
        label="选择知识库"
        name="kb_id"
        rules={[
          { required: true, message: '请选择知识库' },
        ]}
      >
        <Select
          placeholder="请选择知识库"
          showSearch
          optionFilterProp="children"
          filterOption={(input, option) =>
            (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
          }
        >
          {knowledgeBases.map(kb => (
            <Option key={kb.id} value={kb.id}>
              {kb.theme || kb.name || kb.id}
            </Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
          <Button onClick={handleCancel}>
            取消
          </Button>
          <Button 
            type="primary" 
            htmlType="submit" 
            loading={creating}
          >
            创建
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
}

export default CreateProjectModal;
