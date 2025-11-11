import React, { useState, useEffect } from 'react';
import { Modal, Upload, Button, List, Card, Image, message, Popconfirm, Space, Empty } from 'antd';
import { UploadOutlined, DeleteOutlined, CheckOutlined } from '../../utils/icons';

function BackgroundImageModal({ 
  visible, 
  projectId,
  currentBackground,
  onClose, 
  onSelect 
}) {
  const [backgroundList, setBackgroundList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedBg, setSelectedBg] = useState(currentBackground || null);

  // 加载背景图列表
  const loadBackgrounds = async () => {
    if (!projectId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/api/v1/projects/${projectId}/assets/bg/list`);
      if (response.ok) {
        const data = await response.json();
        setBackgroundList(data.images || []);
      } else {
        message.error('加载背景图列表失败');
      }
    } catch (error) {
      console.error('加载背景图列表失败:', error);
      message.error('加载背景图列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible && projectId) {
      loadBackgrounds();
      setSelectedBg(currentBackground || null);
    }
  }, [visible, projectId, currentBackground]);

  // 上传背景图
  const handleUpload = async (file) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(
        `http://localhost:8000/api/v1/projects/${projectId}/assets/bg/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          message.success('背景图上传成功');
          loadBackgrounds();
        } else {
          message.error(result.message || '上传失败');
        }
      } else {
        message.error('上传失败');
      }
    } catch (error) {
      console.error('上传背景图失败:', error);
      message.error('上传失败');
    } finally {
      setUploading(false);
    }

    return false; // 阻止默认上传行为
  };

  // 删除背景图
  const handleDelete = async (filename) => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/v1/projects/${projectId}/assets/bg/${filename}`,
        {
          method: 'DELETE',
        }
      );

      if (response.ok) {
        message.success('背景图删除成功');
        loadBackgrounds();
        
        // 如果删除的是当前选中的背景图，清空选择
        if (selectedBg === filename) {
          setSelectedBg(null);
        }
      } else {
        message.error('删除失败');
      }
    } catch (error) {
      console.error('删除背景图失败:', error);
      message.error('删除失败');
    }
  };

  // 选择背景图
  const handleSelectBg = (filename) => {
    setSelectedBg(filename);
  };

  // 确认选择
  const handleConfirm = () => {
    onSelect(selectedBg);
    onClose();
  };

  return (
    <Modal
      title="选择背景图"
      open={visible}
      onCancel={onClose}
      width={800}
      footer={[
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button key="clear" onClick={() => {
          setSelectedBg(null);
          onSelect(null);
          onClose();
        }}>
          清除背景
        </Button>,
        <Button key="confirm" type="primary" onClick={handleConfirm}>
          确定
        </Button>,
      ]}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* 上传区域 */}
        <Upload
          beforeUpload={handleUpload}
          accept="image/*"
          showUploadList={false}
          disabled={uploading}
        >
          <Button icon={<UploadOutlined />} loading={uploading}>
            上传背景图
          </Button>
        </Upload>

        {/* 背景图列表 */}
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>加载中...</div>
          ) : backgroundList.length === 0 ? (
            <Empty description="暂无背景图" />
          ) : (
            <List
              grid={{ gutter: 16, column: 3 }}
              dataSource={backgroundList}
              renderItem={(bg) => (
                <List.Item>
                  <Card
                    hoverable
                    style={{
                      border: selectedBg === bg.filename ? '2px solid #1890ff' : '1px solid #d9d9d9',
                      position: 'relative'
                    }}
                    cover={
                      <div style={{ 
                        height: '150px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        overflow: 'hidden',
                        backgroundColor: '#f0f0f0'
                      }}>
                        <Image
                          src={`http://localhost:8000/api/v1/projects/${projectId}/assets/bg/${bg.filename}`}
                          alt={bg.original_name}
                          preview={true}
                          style={{ 
                            maxWidth: '100%', 
                            maxHeight: '100%',
                            objectFit: 'contain'
                          }}
                        />
                      </div>
                    }
                    actions={[
                      <Button
                        type={selectedBg === bg.filename ? 'primary' : 'default'}
                        icon={<CheckOutlined />}
                        size="small"
                        onClick={() => handleSelectBg(bg.filename)}
                      >
                        {selectedBg === bg.filename ? '已选中' : '选择'}
                      </Button>,
                      <Popconfirm
                        title="确定要删除这张背景图吗？"
                        onConfirm={() => handleDelete(bg.filename)}
                        okText="确定"
                        cancelText="取消"
                      >
                        <Button
                          danger
                          icon={<DeleteOutlined />}
                          size="small"
                        >
                          删除
                        </Button>
                      </Popconfirm>
                    ]}
                  >
                    <Card.Meta
                      title={bg.original_name}
                      description={
                        <div style={{ fontSize: '12px', color: '#999' }}>
                          {bg.dimensions && `${bg.dimensions.width} × ${bg.dimensions.height}`}
                        </div>
                      }
                    />
                  </Card>
                </List.Item>
              )}
            />
          )}
        </div>
      </Space>
    </Modal>
  );
}

export default BackgroundImageModal;
