import React, { useState, useEffect } from 'react';
import { Upload, Button, Input, Select, Space, message, Modal, Divider } from 'antd';
import { InboxOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';

const { Dragger } = Upload;
const { Option } = Select;

// 文件类型常量
const FILE_TYPES = {
  STRUCTURED: 'structured',
  UNSTRUCTURED: 'unstructured'
};

// 支持的文件格式
const SUPPORTED_FORMATS = {
  [FILE_TYPES.STRUCTURED]: ['.xlsx', '.csv'],
  [FILE_TYPES.UNSTRUCTURED]: ['.pdf', '.docx', '.txt']
};

function FileUploader({ categories, onUploadSuccess, onRefresh }) {
  const [fileList, setFileList] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [fileType, setFileType] = useState(FILE_TYPES.UNSTRUCTURED);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [uploading, setUploading] = useState(false);

  // 文件上传配置
  const uploadProps = {
    name: 'files',
    multiple: true,
    fileList,
    beforeUpload: (file) => {
      // 检查文件格式
      const allowedFormats = SUPPORTED_FORMATS[fileType];
      const fileExt = '.' + file.name.split('.').pop().toLowerCase();
      
      if (!allowedFormats.includes(fileExt)) {
        message.error(`${fileType === FILE_TYPES.STRUCTURED ? '结构化' : '非结构化'}文件只支持${allowedFormats.join(', ')}格式`);
        return Upload.LIST_IGNORE;
      }

      // 检查文件大小 (200MB)
      const isLt200M = file.size / 1024 / 1024 < 200;
      if (!isLt200M) {
        message.error('文件大小不能超过200MB');
        return Upload.LIST_IGNORE;
      }

      return false; // 阻止自动上传
    },
    onChange: (info) => {
      setFileList(info.fileList);
    },
  };

  // 创建新类目
  const handleCreateCategory = () => {
    if (!newCategoryName.trim()) {
      message.error('请输入类目名称');
      return;
    }

    if (categories.includes(newCategoryName.trim())) {
      message.error('类目已存在');
      return;
    }

    // 这里暂时直接添加到本地状态，后续需要调用API
    setSelectedCategory(newCategoryName.trim());
    setShowNewCategoryModal(false);
    setNewCategoryName('');
    message.success('类目创建成功');
    
    // 刷新类目列表
    onRefresh();
  };

  // 执行上传
  const handleUpload = async () => {
    if (!selectedCategory) {
      message.error('请选择或创建类目');
      return;
    }

    if (fileList.length === 0) {
      message.error('请选择要上传的文件');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      
      // 添加文件
      fileList.forEach(file => {
        formData.append('files', file.originFileObj);
      });
      
      // 添加元数据
      formData.append('category', selectedCategory);
      formData.append('file_type', fileType);

      const response = await fetch('http://localhost:8000/api/v1/files/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        
        if (result.failed_files && result.failed_files.length > 0) {
          message.warning(`部分文件上传失败: ${result.failed_files.join(', ')}`);
        } else {
          message.success('所有文件上传成功');
        }

        // 清空表单
        setFileList([]);
        setSelectedCategory(null);
        
        // 回调通知父组件
        onUploadSuccess();
      } else {
        const error = await response.json();
        throw new Error(error.detail || '上传失败');
      }
    } catch (error) {
      console.error('上传失败:', error);
      message.error(`上传失败: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="file-uploader">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 文件类型选择 */}
        <div>
          <label style={{ marginRight: 8 }}>文件类型：</label>
          <Select
            value={fileType}
            onChange={setFileType}
            style={{ width: 150 }}
          >
            <Option value={FILE_TYPES.UNSTRUCTURED}>非结构化</Option>
            <Option value={FILE_TYPES.STRUCTURED}>结构化</Option>
          </Select>
          <span style={{ marginLeft: 8, color: '#666', fontSize: '12px' }}>
            {fileType === FILE_TYPES.STRUCTURED 
              ? '支持：Excel(.xlsx), CSV(.csv)' 
              : '支持：PDF(.pdf), Word(.docx), 文本(.txt)'
            }
          </span>
        </div>

        {/* 类目选择 */}
        <div>
          <label style={{ marginRight: 8 }}>选择类目：</label>
          <Space>
            <Select
              value={selectedCategory}
              onChange={setSelectedCategory}
              placeholder="选择现有类目"
              style={{ width: 200 }}
              allowClear
            >
              {categories.map(category => (
                <Option key={category} value={category}>{category}</Option>
              ))}
            </Select>
            <Button 
              icon={<PlusOutlined />} 
              onClick={() => setShowNewCategoryModal(true)}
            >
              新建类目
            </Button>
          </Space>
        </div>

        {/* 文件上传区域 */}
        <Dragger {...uploadProps} style={{ padding: '20px' }}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
          <p className="ant-upload-hint">
            支持单个或批量上传。所有文件将归类到选定的类目中。
          </p>
        </Dragger>

        {/* 上传按钮 */}
        {fileList.length > 0 && (
          <div style={{ textAlign: 'center' }}>
            <Button 
              type="primary" 
              icon={<UploadOutlined />}
              onClick={handleUpload}
              loading={uploading}
              size="large"
            >
              上传 {fileList.length} 个文件到「{selectedCategory}」
            </Button>
          </div>
        )}
      </Space>

      {/* 新建类目弹窗 */}
      <Modal
        title="新建类目"
        open={showNewCategoryModal}
        onOk={handleCreateCategory}
        onCancel={() => {
          setShowNewCategoryModal(false);
          setNewCategoryName('');
        }}
        okText="创建"
        cancelText="取消"
      >
        <div>
          <label>类目名称：</label>
          <Input
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="请输入类目名称"
            style={{ marginTop: 8 }}
            onPressEnter={handleCreateCategory}
          />
        </div>
      </Modal>
    </div>
  );
}

export default FileUploader;
