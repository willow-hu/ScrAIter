import React, { useState, useEffect } from 'react';
import { Modal, Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

const TIPS = [
  '💡 提示：知识图谱构建完成后，可以在"脚本创作"页面生成大纲',
  '💡 提示：同一主题的文件建议放在同一个类目中，便于统一管理',
  '💡 提示：来源标签代表了文档片段的可信度',
  '💡 提示：AI也会犯错，要记得检查内容哦！',
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
      width={650}
      styles={{
        body: {
          padding: '48px 32px',
          textAlign: 'center'
        },
        mask: {
          backgroundColor: 'rgba(0, 0, 0, 0.65)'
        }
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
              正在为“{kbTheme}”构建知识图谱
            </div>
          )}
          <div>
            图谱构建过程可能需要10-15分钟（取决于知识库大小），请耐心等待…
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
