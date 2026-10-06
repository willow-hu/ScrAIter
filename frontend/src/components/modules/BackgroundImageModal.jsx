import { showcaseFetch as fetch } from '../../showcase/api.js';
import React, { useState, useEffect } from 'react';
import { Modal, Upload, Button, List, Card, Image, message, Space, Empty, Input } from 'antd';
import { UploadOutlined, CheckOutlined, PlusOutlined } from '../../utils/icons';

function BackgroundImageModal({ 
  visible, 
  projectId,
  nodeId,
  currentBackground,
  onClose, 
  onSelect 
}) {
  const [backgroundList, setBackgroundList] = useState([]);
  const [defaultBackground, setDefaultBackground] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedBgId, setSelectedBgId] = useState(null);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [newBgId, setNewBgId] = useState('');
  const [uploadFile, setUploadFile] = useState(null);

  // 加载背景图列表（从background_pool）
  const loadBackgrounds = async () => {
    if (!projectId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/backgrounds`);
      if (response.ok) {
        const data = await response.json();
        setBackgroundList(data.backgrounds || []);
        setDefaultBackground(data.default_background);
        
        // 查找当前节点使用的背景图（确保类型匹配，转换为数字比较）
        if (nodeId !== undefined && nodeId !== null) {
          const nodeIdNum = Number(nodeId);
          const usedBg = (data.backgrounds || []).find(bg => 
            bg.used_by && bg.used_by.some(id => Number(id) === nodeIdNum)
          );
          setSelectedBgId(usedBg ? usedBg.id : null);
        }
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
    }
  }, [visible, projectId, nodeId]);

  // 上传背景图到资源池
  const handleUpload = async () => {
    if (!newBgId || !newBgId.trim()) {
      message.error('请输入背景图ID');
      return;
    }

    if (!uploadFile) {
      message.error('请选择图片文件');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('bg_id', newBgId.trim());
      formData.append('file', uploadFile);

      const response = await fetch(`/api/v1/projects/${projectId}/backgrounds/upload`, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (response.ok) {
        message.success('背景图上传成功');
        setUploadModalVisible(false);
        setNewBgId('');
        setUploadFile(null);
        loadBackgrounds();
      } else {
        message.error(result.detail || '上传失败');
      }
    } catch (error) {
      console.error('上传背景图失败:', error);
      message.error('上传失败');
    } finally {
      setUploading(false);
    }
  };

  // 选择背景图
  const handleSelectBg = (bgId) => {
    setSelectedBgId(bgId);
  };

  // 确认选择 - 将当前节点添加到背景图的used_by列表
  const handleConfirm = async () => {
    if (!nodeId) {
      message.error('节点ID不存在');
      return;
    }

    // 确保nodeId是数字类型
    const nodeIdNum = Number(nodeId);

    try {
      if (selectedBgId) {
        // 获取选中背景图的当前used_by列表
        const selectedBg = backgroundList.find(bg => bg.id === selectedBgId);
        
        if (!selectedBg) {
          message.error('背景图不存在');
          return;
        }

        // 构建新的used_by列表（转换为数字）
        let newUsedBy = [...(selectedBg.used_by || [])].map(id => Number(id)).filter(id => !Number.isNaN(id));

        // 先从所有背景图的used_by中移除当前节点（确保使用数字比较）
        for (const bg of backgroundList) {
          if (bg.id !== selectedBgId && bg.used_by && bg.used_by.some(id => Number(id) === nodeIdNum)) {
            const updatedUsedBy = bg.used_by.filter(id => Number(id) !== nodeIdNum).map(id => Number(id)).filter(id => !Number.isNaN(id));
            await fetch(`/api/v1/projects/${projectId}/backgrounds/${bg.id}/assign`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                node_ids: updatedUsedBy
              })
            });
          }
        }

        // 添加当前节点到选中背景图的used_by（确保整数）
        if (!newUsedBy.includes(nodeIdNum)) {
          newUsedBy.push(nodeIdNum);
        }

        const response = await fetch(`/api/v1/projects/${projectId}/backgrounds/${selectedBgId}/assign`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            node_ids: newUsedBy
          })
        });

        if (response.ok) {
          onSelect(selectedBgId); // 通知父组件
          onClose();
        } else {
          const errorData = await response.json();
          message.error(errorData.detail || '设置背景图失败');
        }
      } else {
        // 清除背景图 - 从所有背景图的used_by中移除当前节点（数字比较）
        for (const bg of backgroundList) {
          if (bg.used_by && bg.used_by.some(id => Number(id) === nodeIdNum)) {
            const updatedUsedBy = bg.used_by.filter(id => Number(id) !== nodeIdNum).map(id => Number(id)).filter(id => !Number.isNaN(id));
            await fetch(`/api/v1/projects/${projectId}/backgrounds/${bg.id}/assign`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                node_ids: updatedUsedBy
              })
            });
          }
        }
        message.success('背景图已清除');
        onSelect(null); // 通知父组件
        onClose();
      }
    } catch (error) {
      console.error('设置背景图失败:', error);
      message.error('设置失败');
    }
  };

  return (
    <>
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
            setSelectedBgId(null);
          }}>
            清除背景
          </Button>,
          <Button key="confirm" type="primary" onClick={handleConfirm}>
            确定
          </Button>,
        ]}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {/* 上传按钮 */}
          <Button 
            icon={<PlusOutlined />} 
            onClick={() => setUploadModalVisible(true)}
          >
            上传新背景图
          </Button>

          {/* 背景图列表 */}
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>加载中...</div>
            ) : backgroundList.length === 0 ? (
              <Empty description="暂无背景图，请先上传" />
            ) : (
              <List
                grid={{ gutter: 16, column: 3 }}
                dataSource={backgroundList}
                renderItem={(bg) => (
                  <List.Item>
                    <Card
                      hoverable
                      style={{
                        border: selectedBgId === bg.id ? '2px solid #1890ff' : '1px solid #d9d9d9',
                        position: 'relative'
                      }}
                      cover={
                        <div style={{ 
                          height: '150px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          overflow: 'hidden',
                          backgroundColor: '#f0f0f0',
                          position: 'relative'
                        }}>
                          <Image
                            src={`/api/v1/projects/${projectId}/backgrounds/${bg.id}/thumbnail`}
                            alt={bg.id}
                            preview={true}
                            style={{ 
                              maxWidth: '100%', 
                              maxHeight: '100%',
                              objectFit: 'contain'
                            }}
                            fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHANwDrkl1AuO+pmgAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAwqADAAQAAAABAAAAwwAAAAD9b/HnAAAHlklEQVR4Ae3dP3PTWBSGcbGzM6GCKqlIBRV0dHRJFarQ0eUT8LH4BnRU0NHR0UEFVdIlFRV7TzRksomPY8uykTk/zewQfKw/9znv4yvJynLv4uLiV2dBoDiBf4qP3/ARuCRABEFAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghgg0Aj8i0JO4OzsrPv69Wv+hi2qPHr0qNvf39+iI97soRIh4f3z58/u7du3SXX7Xt7Z2enevHmzfQe+oSN2apSAPj09TSrb+XKI/f379+08+A0cNRE2ANkupk+ACNPvkSPcAAEibACyXUyfABGm3yNHuAECRNgAZLuYPgEirKlHu7u7XdyytGwHAd8jjNyng4OD7vnz51dbPT8/7z58+NB9+/bt6jU/TI+AGWHEnrx48eJ/EsSmHzx40L18+fLyzxF3ZVMjEyDCiEDjMYZZS5wiPXnyZFbJaxMhQIQRGzHvWR7XCyOCXsOmiDAi1HmPMMQjDpbpEiDCiL358eNHurW/5SnWdIBbXiDCiA38/Pnzrce2YyZ4//59F3ePLNMl4PbpiL2J0L979+7yDtHDhw8vtzzvdGnEXdvUigSIsCLAWavHp/+qM0BcXMd/q25n1vF57TYBp0a3mUzilePj4+7k5KSLb6gt6ydAhPUzXnoPR0dHl79WGTNCfBnn1uvSCJdegQhLI1vvCk+fPu2ePXt2tZOYEV6/fn31dz+shwAR1sP1cqvLntbEN9MxA9xcYjsxS1jWR4AIa2Ibzx0tc44fYX/16lV6NDFLXH+YL32jwiACRBiEbf5KcXoTIsQSpzXx4N28Ja4BQoK7rgXiydbHjx/P25TaQAJEGAguWy0+2Q8PD6/Ki4R8EVl+bzBOnZY95fq9rj9zAkTI2SxdidBHqG9+skdw43borCXO/ZcJdraPWdv22uIEiLA4q7nvvCug8WTqzQveOH26fodo7g6uFe/a17W3+nFBAkRYENRdb1vkkz1CH9cPsVy/jrhr27PqMYvENYNlHAIesRiBYwRy0V+8iXP8+/fvX11Mr7L7ECueb/r48eMqm7FuI2BGWDEG8cm+7G3NEOfmdcTQw4h9/55lhm7DekRYKQPZF2ArbXTAyu4kDYB2YxUzwg0gi/41ztHnfQG26HbGel/crVrm7tNY+/1btkOEAZ2M05r4FB7r9GbAIdxaZYrHdOsgJ/wCEQY0J74TmOKnbxxT9n3FgGGWWsVdowHtjt9Nnvf7yQM2aZU/TIAIAxrw6dOnAWtZZcoEnBpNuTuObWMEiLAx1HY0ZQJEmHJ3HNvGCBBhY6jtaMoEiJB0Z29vL6ls58vxPcO8/zfrdo5qvKO+d3Fx8Wu8zf1dW4p/cPzLly/dtv9Ts/EbcvGAHhHyfBIhZ6NSiIBTo0LNNtScABFyNiqFCBChULMNNSdAhJyNSiECRCjUbEPNCRAhZ6NSiAARCjXbUHMCRMjZqBQiQIRCzTbUnAARcjYqhQgQoVCzDTUnQIScjUohAkQo1GxDzQkQIWejUogAEQo121BzAkTI2agUIkCEQs021JwAEXI2KoUIEKFQsw01J0CEnI1KIQJEKNRsQ80JECFno1KIABEKNdtQcwJEyNmoFCJAhELNNtScABFyNiqFCBChULMNNSdAhJyNSiECRCjUbEPNCRAhZ6NSiAARCjXbUHMCRMjZqBQiQIRCzTbUnAARcjYqhQgQoVCzDTUnQIScjUohAkQo1GxDzQkQIWejUogAEQo121BzAkTI2agUIkCEQs021JwAEXI2KoUIEKFQsw01J0CEnI1KIQJEKNRsQ80JECFno1KIABEKNdtQcwJEyNmoFCJAhELNNtScABFyNiqFCBChULMNNSdAhJyNSiECRCjUbEPNCRAhZ6NSiAARCjXbUHMCRMjZqBQiQIRCzTbUnAARcjYqhQgQoVCzDTUnQIScjUohAkQo1GxDzQkQIWejUogAEQo121BzAkTI2agUIkCEQs021JwAEXI2KoUIEKFQsw01J0CEnI1KIQJEKNRsQ80JECFno1KIABEKNdtQcwJEyNmoFCJAhELNNtScABFyNiqFCBChULMNNSdAhJyNSiEC/wGgKKC4YMA4TAAAAABJRU5ErkJggg=="
                          />
                          {bg.id === defaultBackground && (
                            <div style={{
                              position: 'absolute',
                              top: 8,
                              right: 8,
                              backgroundColor: 'rgba(0, 0, 0, 0.6)',
                              color: '#fff',
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontSize: 12
                            }}>
                              默认
                            </div>
                          )}
                        </div>
                      }
                      actions={[
                        <Button
                          type={selectedBgId === bg.id ? 'primary' : 'default'}
                          icon={<CheckOutlined />}
                          size="small"
                          onClick={() => handleSelectBg(bg.id)}
                        >
                          {selectedBgId === bg.id ? '已选中' : '选择'}
                        </Button>
                      ]}
                    >
                    </Card>
                  </List.Item>
                )}
              />
            )}
          </div>
        </Space>
      </Modal>

      {/* 上传背景图对话框 */}
      <Modal
        title="上传背景图"
        open={uploadModalVisible}
        onCancel={() => {
          setUploadModalVisible(false);
          setNewBgId('');
          setUploadFile(null);
        }}
        onOk={handleUpload}
        okText="上传"
        cancelText="取消"
        confirmLoading={uploading}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <div style={{ marginBottom: 8 }}>背景图ID:</div>
            <Input
              placeholder="请输入背景图ID（唯一标识）"
              value={newBgId}
              onChange={(e) => setNewBgId(e.target.value)}
            />
          </div>
          <div>
            <div style={{ marginBottom: 8 }}>选择图片:</div>
            <Upload
              beforeUpload={(file) => {
                setUploadFile(file);
                return false;
              }}
              maxCount={1}
              accept=".jpg,.jpeg,.png,.gif,.webp"
              onRemove={() => setUploadFile(null)}
            >
              <Button icon={<UploadOutlined />}>选择文件</Button>
            </Upload>
          </div>
        </Space>
      </Modal>
    </>
  );
}

export default BackgroundImageModal;
