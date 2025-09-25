import React, { useState, useEffect } from 'react';
import { Modal, Upload, Button, Row, Col, Card, Image, message, Empty, Spin } from 'antd';
import { UploadOutlined, DeleteOutlined, EyeOutlined } from '../../utils/icons';

const { Dragger } = Upload;

function BackgroundImageModal({ 
  visible, 
  onClose, 
  onSelect, 
  knowledgeBaseName,
  currentBackgroundImage = null 
}) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(currentBackgroundImage);

  // 加载图片列表
  const loadImages = async () => {
    if (!knowledgeBaseName) return;
    
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/api/v1/images/list/${knowledgeBaseName}`);
      if (response.ok) {
        const result = await response.json();
        setImages(result.images || []);
      } else {
        message.error('获取图片列表失败');
      }
    } catch (error) {
      console.error('获取图片列表失败:', error);
      message.error('网络错误');
    } finally {
      setLoading(false);
    }
  };

  // 组件显示时加载图片列表
  useEffect(() => {
    if (visible) {
      loadImages();
      setSelectedImage(currentBackgroundImage);
    }
  }, [visible, knowledgeBaseName, currentBackgroundImage]);

  // 上传配置
  const uploadProps = {
    name: 'file',
    multiple: false,
    accept: '.jpg,.jpeg,.png',
    showUploadList: false,
    customRequest: async ({ file, onSuccess, onError }) => {
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch(`http://localhost:8000/api/v1/images/upload?kb_name=${knowledgeBaseName}`, {
          method: 'POST',
          body: formData,
        });
        
        if (response.ok) {
          const result = await response.json();
          onSuccess();
          // 重新加载图片列表
          await loadImages();
        } else {
          const errorData = await response.json();
          message.error(errorData.detail || '上传失败');
          onError(new Error(errorData.detail || '上传失败'));
        }
      } catch (error) {
        console.error('上传失败:', error);
        message.error('上传失败');
        onError(error);
      } finally {
        setUploading(false);
      }
    },
  };

  // 删除图片
  const handleDeleteImage = async (filename) => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/images/${knowledgeBaseName}/${filename}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        // 如果删除的是当前选中的图片，清空选择
        if (selectedImage === filename) {
          setSelectedImage(null);
        }
        // 重新加载图片列表
        await loadImages();
      } else {
        const errorData = await response.json();
        message.error(errorData.detail || '删除失败');
      }
    } catch (error) {
      console.error('删除失败:', error);
      message.error('删除失败');
    }
  };

  // 确认选择
  const handleConfirm = () => {
    onSelect(selectedImage);
    onClose();
  };

  // 取消选择（即不设置背景）
  const handleClear = () => {
    onSelect(null);
    onClose();
  };

  return (
    <Modal
      title="设置背景图"
      open={visible}
      onCancel={onClose}
      width={800}
      footer={[
        <Button key="clear" onClick={handleClear}>
          取消
        </Button>,
        <Button key="confirm" type="primary" onClick={handleConfirm}>
          确认
        </Button>,
      ]}
    >
      <div style={{ minHeight: '400px' }}>
        {/* 上传区域 */}
        <div style={{ marginBottom: '20px' }}>
          <Dragger {...uploadProps} disabled={uploading}>
            <p className="ant-upload-drag-icon">
              <UploadOutlined />
            </p>
            <p className="ant-upload-text">
              {uploading ? '上传中...' : '点击或拖拽图片到此区域上传'}
            </p>
            <p className="ant-upload-hint">
              支持 JPG、PNG 格式，文件大小不超过 5MB
            </p>
          </Dragger>
        </div>

        {/* 图片列表 */}
        <div>
          <h4 style={{ marginBottom: '16px' }}>选择背景图片</h4>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Spin size="large" />
            </div>
          ) : images.length === 0 ? (
            <Empty 
              description="暂无图片，请先上传" 
              style={{ padding: '40px' }}
            />
          ) : (
            <Row gutter={[16, 16]}>
              {images.map((image) => (
                <Col key={image.filename} xs={12} sm={8} md={6}>
                  <Card
                    hoverable
                    style={{
                      position: 'relative',
                      border: selectedImage === image.filename ? '2px solid #1890ff' : '1px solid #d9d9d9'
                    }}
                    cover={
                      <div style={{ height: '120px', overflow: 'hidden', position: 'relative' }}>
                        <Image
                          src={`http://localhost:8000/api/v1/images/${knowledgeBaseName}/${image.filename}`}
                          alt={image.original_name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                          preview={{
                            mask: <EyeOutlined />
                          }}
                        />
                      </div>
                    }
                    actions={[
                      <Button
                        key="select"
                        type={selectedImage === image.filename ? "primary" : "default"}
                        size="small"
                        onClick={() => setSelectedImage(
                          selectedImage === image.filename ? null : image.filename
                        )}
                      >
                        {selectedImage === image.filename ? '已选择' : '选择'}
                      </Button>,
                      <Button
                        key="delete"
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => handleDeleteImage(image.filename)}
                      />
                    ]}
                  >
                    <Card.Meta
                      title={
                        <div style={{ 
                          fontSize: '12px', 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {image.original_name}
                        </div>
                      }
                      description={
                        <div style={{ fontSize: '11px', color: '#999' }}>
                          {image.dimensions && `${image.dimensions.width}×${image.dimensions.height}`}
                          <br />
                          {(image.file_size / 1024).toFixed(1)}KB
                        </div>
                      }
                    />
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default BackgroundImageModal;
