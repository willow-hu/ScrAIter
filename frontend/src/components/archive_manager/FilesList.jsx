import React, { useState, useMemo, useEffect } from 'react';
import { Table, Tag, Button, Select, message, Collapse, Empty, Tooltip, Space, Modal } from 'antd';
import { DeleteOutlined, FolderOutlined, FileTextOutlined, FileExcelOutlined } from '@ant-design/icons';

const { Option } = Select;

function FilesList({ files, loading, onDeleteSuccess, onTagUpdateSuccess, onRefresh }) {
  const [updating, setUpdating] = useState({});
  const [sourceTags, setSourceTags] = useState([
    { value: 'literature', label: '文献资料', color: 'blue' },
    { value: 'encyclopedia', label: '百科知识', color: 'green' },
    { value: 'blog', label: '博客文章', color: 'orange' },
    { value: 'news', label: '新闻报道', color: 'purple' },
    { value: 'official', label: '官方资料', color: 'red' },
    { value: 'other', label: '其他来源', color: 'default' }
  ]);

  // 获取标签配置
  useEffect(() => {
    const loadSourceTags = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/v1/source-tags');
        if (response.ok) {
          const config = await response.json();
          setSourceTags(config.tags || sourceTags);
        }
      } catch (error) {
        console.warn('获取标签配置失败，使用默认配置:', error);
      }
    };
    
    loadSourceTags();
  }, []);

  // 获取标签配置
  const getSourceTagConfig = (value) => {
    return sourceTags.find(tag => tag.value === value) || { label: value, color: 'default' };
  };

  // 获取文件类型图标
  const getFileIcon = (filename, fileType) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    
    if (fileType === 'structured' || ['xlsx', 'csv'].includes(ext)) {
      return <FileExcelOutlined style={{ color: '#52c41a' }} />;
    }
    return <FileTextOutlined style={{ color: '#1890ff' }} />;
  };

  // 按类目分组文件
  const groupedFiles = useMemo(() => {
    const groups = {};
    files.forEach(file => {
      const category = file.category || '未分类';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(file);
    });
    return groups;
  }, [files]);

  // 统计信息
  const stats = useMemo(() => {
    const total = files.length;
    const withTags = files.filter(file => file.source_tag).length;
    const withoutTags = total - withTags;
    const categories = Object.keys(groupedFiles).length;
    
    return { total, withTags, withoutTags, categories };
  }, [files, groupedFiles]);

  // 删除文件
  const handleDelete = async (file) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除文件"${file.filename}"吗？此操作不可恢复。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          const response = await fetch(`http://localhost:8000/api/v1/files/${file.relative_path}`, {
            method: 'DELETE'
          });

          if (response.ok) {
            onDeleteSuccess();
          } else {
            const error = await response.json();
            throw new Error(error.detail || '删除失败');
          }
        } catch (error) {
          console.error('删除文件失败:', error);
          message.error(`删除失败: ${error.message}`);
        }
      }
    });
  };

  // 直接更新文件标签
  const handleTagChange = async (file, newTag) => {
    // 设置当前文件为更新状态
    setUpdating(prev => ({ ...prev, [file.relative_path]: true }));

    try {
      const response = await fetch(`http://localhost:8000/api/v1/files/${file.relative_path}/tags`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source_tag: newTag
        })
      });

      if (response.ok) {
        onTagUpdateSuccess();
      } else {
        const error = await response.json();
        throw new Error(error.detail || '更新标签失败');
      }
    } catch (error) {
      console.error('更新标签失败:', error);
      message.error(`更新失败: ${error.message}`);
    } finally {
      // 移除更新状态
      setUpdating(prev => {
        const newState = { ...prev };
        delete newState[file.relative_path];
        return newState;
      });
    }
  };

  // 表格列定义
  const columns = [
    {
      title: '文件名',
      dataIndex: 'filename',
      key: 'filename',
      width: '50%',
      render: (text, record) => (
        <Space>
          {getFileIcon(text, record.file_type)}
          <span>{text}</span>
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'file_type',
      key: 'file_type',
      // width: '15%',
      render: (type) => (
        <Tag color='default'>
          {type === 'structured' ? '结构化' : '非结构化'}
        </Tag>
      ),
    },
    {
      title: '来源',
      dataIndex: 'source_tag',
      key: 'source_tag',
      // width: '15%',
      render: (tag, record) => {
        const isUpdating = updating[record.relative_path];
        
        return (
          <Select
            value={tag || undefined}
            placeholder="选择来源"
            style={{ width: '100%' }}
            size="small"
            loading={isUpdating}
            disabled={isUpdating}
            onChange={(newTag) => handleTagChange(record, newTag)}
            popupMatchSelectWidth={false}
          >
            {sourceTags.map(tagOption => (
              <Option key={tagOption.value} value={tagOption.value}>
                <Tag color={tagOption.color} style={{ margin: 0 }}>
                  {tagOption.label}
                </Tag>
              </Option>
            ))}
          </Select>
        );
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: '10%',
      render: (_, record) => (
        <Tooltip title="删除文件">
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          />
        </Tooltip>
      ),
    },
  ];

  // 如果没有文件
  if (files.length === 0) {
    return (
      <Empty
        description="暂无文件"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  return (
    <div className="files-list">
      {/* 统计信息 */}
      <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 6 }}>
        <Space size="large">
          <span>总文件数: <strong>{stats.total}</strong></span>
          <span>已标记: <strong style={{ color: '#52c41a' }}>{stats.withTags}</strong></span>
          <span>未标记: <strong style={{ color: '#ff4d4f' }}>{stats.withoutTags}</strong></span>
          <span>类目数: <strong>{stats.categories}</strong></span>
        </Space>
      </div>

      {/* 按类目分组显示 */}
      <Collapse 
        defaultActiveKey={Object.keys(groupedFiles)} 
        ghost
        items={Object.entries(groupedFiles).map(([category, categoryFiles]) => ({
          key: category,
          label: (
            <Space>
              <FolderOutlined />
              <strong>{category}</strong>
              <Tag>{categoryFiles.length} 个文件</Tag>
              {categoryFiles.some(f => !f.source_tag) && (
                <Tag color="red">有未标记文件</Tag>
              )}
            </Space>
          ),
          children: (
            <Table
              columns={columns}
              dataSource={categoryFiles}
              rowKey="relative_path"
              pagination={false}
              size="small"
              loading={loading}
            />
          )
        }))}
      />
    </div>
  );
}

export default FilesList;
