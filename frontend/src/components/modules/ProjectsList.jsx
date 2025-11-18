/**
 * 项目列表组件
 * 
 * 功能说明：
 * - 以表格形式展示所有剧本项目
 * - 每个项目显示：名称、关联知识库、编辑按钮、操作菜单
 * - 操作菜单包含：重命名、复制、删除
 * 
 * Props:
 * - projects: 项目列表数据
 * - loading: 加载状态
 * - onDeleteSuccess: 删除成功回调
 * - onRenameSuccess: 重命名成功回调
 * - onDuplicateSuccess: 复制成功回调
 * - onRefresh: 刷新列表回调
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Empty, Space, Dropdown, Modal, Input, message } from 'antd';
import { EditOutlined, MoreOutlined, DatabaseOutlined } from '../../utils/icons';
import { deleteProject, updateProject, duplicateProject } from '../../utils/project_manager';

function ProjectsList({ projects, knowledgeBases = [], loading, onDeleteSuccess, onRenameSuccess, onDuplicateSuccess, onRefresh }) {
  const navigate = useNavigate();
  const [actionLoading, setActionLoading] = useState({});

  // 根据知识库ID获取主题名称
  const getKnowledgeBaseTheme = (kbId) => {
    if (!kbId) return null;
    const kb = knowledgeBases.find(kb => kb.name === kbId);
    return kb?.theme || kbId;
  };

  // 处理编辑按钮点击
  const handleEdit = (project) => {
    navigate(`/projects/${project.id}/edit`);
  };

  // 处理重命名
  const handleRename = (project) => {
    let newName = '';
    Modal.confirm({
      title: '重命名项目',
      content: (
        <div style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 8 }}>当前名称: {project.name}</div>
          <Input
            placeholder="请输入新名称"
            defaultValue={project.name}
            onChange={(e) => { newName = e.target.value; }}
          />
        </div>
      ),
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        if (!newName || newName === project.name) {
          message.warning('请输入不同的名称');
          return Promise.reject();
        }
        
        setActionLoading(prev => ({ ...prev, [project.id]: true }));
        try {
          await updateProject(project.id, { name: newName });
          onRenameSuccess && onRenameSuccess();
        } catch (error) {
          console.error('重命名失败:', error);
          message.error(`重命名失败: ${error.message}`);
          throw error;
        } finally {
          setActionLoading(prev => {
            const newState = { ...prev };
            delete newState[project.id];
            return newState;
          });
        }
      }
    });
  };

  // 处理复制
  const handleDuplicate = (project) => {
    let newName = '';
    Modal.confirm({
      title: '复制项目',
      content: (
        <div style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 8 }}>原项目: {project.name}</div>
          <Input
            placeholder="请输入新项目名称"
            defaultValue={`${project.name}_副本`}
            onChange={(e) => { newName = e.target.value; }}
          />
        </div>
      ),
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        if (!newName) {
          message.warning('请输入项目名称');
          return Promise.reject();
        }
        
        setActionLoading(prev => ({ ...prev, [project.id]: true }));
        try {
          await duplicateProject(project.id, newName);
          onDuplicateSuccess && onDuplicateSuccess();
        } catch (error) {
          console.error('复制失败:', error);
          message.error(`复制失败: ${error.message}`);
          throw error;
        } finally {
          setActionLoading(prev => {
            const newState = { ...prev };
            delete newState[project.id];
            return newState;
          });
        }
      }
    });
  };

  // 处理删除
  const handleDelete = (project) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除项目"${project.name}"吗？此操作不可恢复。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        setActionLoading(prev => ({ ...prev, [project.id]: true }));
        try {
          await deleteProject(project.id);
          onDeleteSuccess && onDeleteSuccess();
        } catch (error) {
          console.error('删除失败:', error);
          message.error(`删除失败: ${error.message}`);
          throw error;
        } finally {
          setActionLoading(prev => {
            const newState = { ...prev };
            delete newState[project.id];
            return newState;
          });
        }
      }
    });
  };

  // 获取下拉菜单项
  const getMenuItems = (project) => [
    {
      key: 'rename',
      label: '重命名',
      onClick: () => handleRename(project),
    },
    {
      key: 'duplicate',
      label: '复制',
      onClick: () => handleDuplicate(project),
    },
    {
      type: 'divider',
    },
    {
      key: 'delete',
      label: '删除',
      danger: true,
      onClick: () => handleDelete(project),
    },
  ];

  // 表格列定义
  const columns = [
    {
      title: '剧本名称',
      dataIndex: 'name',
      key: 'name',
      width: '30%',
      render: (text) => (
        <Space>
          <span style={{ fontWeight: 'bold' }}>{text}</span>
        </Space>
      ),
    },
    {
      title: '知识库',
      dataIndex: 'knowledgeBaseId',
      key: 'knowledgeBaseId',
      width: '25%',
      render: (text, record) => {
        const kbId = text || record.kb_id;
        if (!kbId || kbId === '-') {
          return <span style={{ color: '#999' }}>未关联</span>;
        }
        const kbTheme = getKnowledgeBaseTheme(kbId);
        return <span>{kbTheme}</span>;
      },
    },
    {
      title: '开始编辑',
      key: 'edit',
      width: '15%',
      render: (_, record) => (
        <Button
          type="primary"
          size="small"
          icon={<EditOutlined />}
          onClick={() => handleEdit(record)}
          loading={actionLoading[record.id]}
        >
          编辑
        </Button>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: '10%',
      align: 'center',
      render: (_, record) => (
        <Dropdown
          menu={{ items: getMenuItems(record) }}
          placement="bottomRight"
          trigger={['click']}
        >
          <Button
            type="text"
            icon={<MoreOutlined style={{ fontSize: '18px' }} />}
            loading={actionLoading[record.id]}
          />
        </Dropdown>
      ),
    },
  ];

  // 如果没有项目
  if (projects.length === 0) {
    return (
      <Empty
        description="暂无项目"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        style={{ marginTop: 40 }}
      />
    );
  }

  return (
    <div className="projects-list">
      {/* 统计信息 */}
      <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 6 }}>
        <Space size="large">
          <span>项目总数: <strong>{projects.length}</strong></span>
        </Space>
      </div>

      {/* 项目列表 */}
      <Table
        columns={columns}
        dataSource={projects}
        rowKey="id"
        pagination={{
          pageSize: 10,
          showSizeChanger: false
        }}
        size="middle"
        loading={loading}
      />
    </div>
  );
}

export default ProjectsList;
