import React, { useState, useEffect } from 'react';
import { Modal, Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

const TIPS = [
  '提示：知识图谱构建完成后，可以在"剧本编辑"页面生成大纲',
  '提示：可以在知识库中上传多种格式的文件，包括PDF、Word、Excel等',
  '提示：为文件添加来源标签有助于更好地管理和追溯知识来源',
  '提示：同一主题的文件建议放在同一个类目中，便于统一管理',
  '提示：图谱构建使用AI提取文档中的实体和关系，形成知识网络',
  '提示：构建完成后，系统会自动进行图谱剪枝，保留最重要的知识节点',
  '提示：知识库可以随时重建，更新后的文件会被重新索引',
  '提示：生成的大纲会基于知识图谱中的实体关系自动组织结构'
];

function GraphBuildingModal({ visible, kbTheme }) {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  useEffect(() => {
    if (!visible) {
      setCurrentTipIndex(0);
      return;
    }

    // 每5秒切换一个tip
    const interval = setInterval(() => {
      setCurrentTipIndex(prev => (prev + 1) % TIPS.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [visible]);

  const customIcon = <LoadingOutlined style={{ fontSize: 48, color: '#1890ff' }} spin />;

  return (
    <Modal
      open={visible}
      footer={null}
      closable={false}
      centered
      width={600}
      bodyStyle={{
        padding: '48px 32px',
        textAlign: 'center'
      }}
      maskStyle={{
        backgroundColor: 'rgba(0, 0, 0, 0.65)'
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
        {/* 加载动画 */}
        <Spin indicator={customIcon} size="large" />
        
        {/* 等待说明 */}
        <div style={{ 
          fontSize: '16px', 
          fontWeight: 500, 
          color: '#262626',
          lineHeight: '24px',
          textAlign: 'center'
        }}>
          {kbTheme && (
            <div style={{ marginBottom: '8px', color: '#1890ff' }}>
              正在为「{kbTheme}」构建知识图谱
            </div>
          )}
          <div>
            图谱构建过程可能需要5-10分钟（取决于知识库大小），请耐心等待…
          </div>
        </div>
        
        {/* Tips轮播 */}
        <div style={{
          padding: '16px 24px',
          backgroundColor: '#f0f5ff',
          borderRadius: '8px',
          minHeight: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          transition: 'opacity 0.3s ease-in-out'
        }}>
          <div style={{
            fontSize: '14px',
            color: '#595959',
            lineHeight: '22px',
            textAlign: 'left'
          }}>
            {TIPS[currentTipIndex]}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default GraphBuildingModal;
