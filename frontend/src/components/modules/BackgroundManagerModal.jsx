import React, { useState, useEffect } from 'react';
import { Modal, Card, Row, Col, Button, Dropdown, Image, Empty, message, Input, Upload, List, Checkbox, Space, Tag } from 'antd';
import { PlusOutlined, MoreOutlined, CheckOutlined, DeleteOutlined, SwapOutlined, StarOutlined, StarFilled, AimOutlined } from '../../utils/icons';
import '../../styles/background-manager.css';

const { Meta } = Card;

function BackgroundManagerModal({ visible, projectId, treeData, onClose, onRefresh }) {
  const [backgrounds, setBackgrounds] = useState([]);
  const [defaultBackground, setDefaultBackground] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [replaceModalVisible, setReplaceModalVisible] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedBg, setSelectedBg] = useState(null);
  const [newBgId, setNewBgId] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [selectedNodes, setSelectedNodes] = useState([]);

  useEffect(() => {
    if (visible && projectId) {
      loadBackgrounds();
    }
  }, [visible, projectId]);

  // 加载背景图列表
  const loadBackgrounds = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/api/v1/projects/${projectId}/backgrounds`);
      if (!response.ok) {
        throw new Error('获取背景图列表失败');
      }
      const data = await response.json();
      setBackgrounds(data.backgrounds || []);
      setDefaultBackground(data.default_background);
    } catch (error) {
      console.error('加载背景图列表失败:', error);
      message.error('加载背景图列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 上传背景图
  const handleUpload = async () => {
    if (!newBgId || !newBgId.trim()) {
      message.error('请输入背景图ID');
      return;
    }

    if (!uploadFile) {
      message.error('请选择图片文件');
      return;
    }

    const formData = new FormData();
    formData.append('bg_id', newBgId.trim());
    formData.append('file', uploadFile);

    try {
      const response = await fetch(`http://localhost:8000/api/v1/projects/${projectId}/backgrounds/upload`, {
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
      console.error('上传失败:', error);
      message.error('上传失败');
    }
  };

  // 设置默认背景图
  const handleSetDefault = async (bgId) => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/projects/${projectId}/backgrounds/default`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bg_id: bgId })
      });

      const result = await response.json();

      if (response.ok) {
        loadBackgrounds();
      } else {
        message.error(result.detail || '设置失败');
      }
    } catch (error) {
      console.error('设置默认背景图失败:', error);
      message.error('设置失败');
    }
  };

  // 取消默认背景图
  const handleCancelDefault = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/projects/${projectId}/backgrounds/default`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bg_id: null })
      });

      const result = await response.json();

      if (response.ok) {
        loadBackgrounds();
      } else {
        message.error(result.detail || '取消失败');
      }
    } catch (error) {
      console.error('取消默认背景图失败:', error);
      message.error('取消失败');
    }
  };

  // 替换背景图
  const handleReplace = async () => {
    if (!uploadFile) {
      message.error('请选择图片文件');
      return;
    }

    const formData = new FormData();
    formData.append('file', uploadFile);

    try {
      const response = await fetch(`http://localhost:8000/api/v1/projects/${projectId}/backgrounds/${selectedBg.id}/replace`, {
        method: 'PUT',
        body: formData
      });

      const result = await response.json();

      if (response.ok) {
        message.success('背景图替换成功');
        setReplaceModalVisible(false);
        setUploadFile(null);
        setSelectedBg(null);
        loadBackgrounds();
      } else {
        message.error(result.detail || '替换失败');
      }
    } catch (error) {
      console.error('替换失败:', error);
      message.error('替换失败');
    }
  };

  // 删除背景图
  const handleDelete = async (bgId) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个背景图吗？此操作不可恢复。',
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          const response = await fetch(`http://localhost:8000/api/v1/projects/${projectId}/backgrounds/${bgId}`, {
            method: 'DELETE'
          });

          const result = await response.json();

          if (response.ok) {
            message.success('背景图删除成功');
            loadBackgrounds();
          } else {
            message.error(result.detail || '删除失败');
          }
        } catch (error) {
          console.error('删除失败:', error);
          message.error('删除失败');
        }
      }
    });
  };

  // 打开分配场景对话框
  const handleOpenAssign = (bg) => {
    setSelectedBg(bg);
    setSelectedNodes(bg.used_by || []);
    setAssignModalVisible(true);
  };

  // 分配场景
  const handleAssignScenes = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/projects/${projectId}/backgrounds/${selectedBg.id}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bg_id: selectedBg.id,
          node_ids: selectedNodes
        })
      });

      const result = await response.json();

      if (response.ok) {
        message.success('场景分配成功');
        setAssignModalVisible(false);
        setSelectedBg(null);
        setSelectedNodes([]);
        loadBackgrounds();
      } else {
        message.error(result.detail || '分配失败');
      }
    } catch (error) {
      console.error('分配场景失败:', error);
      message.error('分配失败');
    }
  };

  // 获取节点名称
  const getNodeName = (nodeId) => {
    if (!treeData || !treeData.structure) return nodeId;
    const node = treeData.structure.find(n => n.id === nodeId);
    return node ? node.name || nodeId : nodeId;
  };

  // 构建下拉菜单
  const getMenuItems = (bg) => {
    const isDefault = bg.id === defaultBackground;
    
    return [
      {
        key: 'setDefault',
        label: isDefault ? '取消默认' : '设为默认',
        icon: <StarOutlined />,
        onClick: () => isDefault ? handleCancelDefault() : handleSetDefault(bg.id)
      },
      {
        key: 'replace',
        label: '替换',
        icon: <SwapOutlined />,
        onClick: () => {
          setSelectedBg(bg);
          setReplaceModalVisible(true);
        }
      },
      {
        key: 'assign',
        label: '分配场景',
        icon: <AimOutlined />,
        onClick: () => handleOpenAssign(bg)
      },
      {
        type: 'divider'
      },
      {
        key: 'delete',
        label: '删除',
        icon: <DeleteOutlined />,
        danger: true,
        disabled: isDefault,
        onClick: () => handleDelete(bg.id)
      }
    ];
  };

  return (
    <>
      <Modal
        title="背景图管理"
        open={visible}
        onCancel={onClose}
        width={900}
        footer={null}
        className="background-manager-modal"
      >
        <div className="background-manager-content">
          <div className="background-manager-header">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setUploadModalVisible(true)}
            >
              上传背景图
            </Button>
          </div>

          {backgrounds.length === 0 ? (
            <Empty description="暂无背景图" style={{ marginTop: 40 }} />
          ) : (
            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
              {backgrounds.map(bg => (
                <Col span={8} key={bg.id}>
                  <Card
                    hoverable
                    cover={
                      <div className="bg-card-cover">
                        <Image
                          alt={bg.id}
                          src={`http://localhost:8000/api/v1/projects/${projectId}/backgrounds/${bg.id}/thumbnail`}
                          fallback="data:image/png;base64,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"
                          preview={false}
                        />
                        {bg.id === defaultBackground && (
                          <div className="default-badge">
                            <StarFilled style={{ color: '#faad14' }} /> 默认
                          </div>
                        )}
                      </div>
                    }
                    actions={[
                      <Dropdown
                        menu={{ items: getMenuItems(bg) }}
                        trigger={['click']}
                      >
                        <Button type="text" icon={<MoreOutlined />} />
                      </Dropdown>
                    ]}
                  >
                    <Meta
                      title={bg.id}
                      description={
                        <Space direction="vertical" size="small" style={{ width: '100%' }}>
                          <div>文件名: {bg.filename}</div>
                          <div>使用场景: {bg.used_by?.length || 0} 个</div>
                        </Space>
                      }
                    />
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </div>
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
              <Button icon={<PlusOutlined />}>选择文件</Button>
            </Upload>
          </div>
        </Space>
      </Modal>

      {/* 替换背景图对话框 */}
      <Modal
        title="替换背景图"
        open={replaceModalVisible}
        onCancel={() => {
          setReplaceModalVisible(false);
          setUploadFile(null);
          setSelectedBg(null);
        }}
        onOk={handleReplace}
        okText="替换"
        cancelText="取消"
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <div style={{ marginBottom: 8 }}>当前背景图ID: {selectedBg?.id}</div>
          </div>
          <div>
            <div style={{ marginBottom: 8 }}>选择新图片:</div>
            <Upload
              beforeUpload={(file) => {
                setUploadFile(file);
                return false;
              }}
              maxCount={1}
              accept=".jpg,.jpeg,.png,.gif,.webp"
              onRemove={() => setUploadFile(null)}
            >
              <Button icon={<PlusOutlined />}>选择文件</Button>
            </Upload>
          </div>
        </Space>
      </Modal>

      {/* 分配场景对话框 */}
      <Modal
        title="分配场景"
        open={assignModalVisible}
        onCancel={() => {
          setAssignModalVisible(false);
          setSelectedBg(null);
          setSelectedNodes([]);
        }}
        onOk={handleAssignScenes}
        okText="确定"
        cancelText="取消"
        width={600}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8 }}>为背景图 <Tag>{selectedBg?.id}</Tag> 选择场景：</div>
        </div>
        <Checkbox.Group
          style={{ width: '100%' }}
          value={selectedNodes}
          onChange={setSelectedNodes}
        >
          <List
            dataSource={treeData?.structure || []}
            renderItem={(node) => (
              <List.Item>
                <Checkbox value={node.id}>
                  {node.name || node.id}
                </Checkbox>
              </List.Item>
            )}
            style={{ maxHeight: 400, overflowY: 'auto', width: '100%' }}
          />
        </Checkbox.Group>
      </Modal>
    </>
  );
}

export default BackgroundManagerModal;
