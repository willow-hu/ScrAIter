import React, { useState, useEffect } from 'react';
import { Card, Button, Space, Typography, Empty } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';

const { Text, Paragraph } = Typography;

function ReferencePanel({ sources = [], loading = false }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // 当sources变化时重置索引
  useEffect(() => {
    setCurrentIndex(0);
  }, [sources]);

  // 如果没有数据，显示空状态
  if (!sources || sources.length === 0) {
    return (
      <Card title="参考资料" size="small" className="reference-panel" style={{ minHeight: '400px' }}>
        <Empty 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="暂无参考资料"
          style={{ paddingTop: '60px' }}
        />
      </Card>
    );
  }

  const currentSource = sources[currentIndex];
  const totalSources = Math.min(sources.length, 5); // 最多显示5条

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goToNext = () => {
    if (currentIndex < totalSources - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  return (
    <Card 
      title="参考资料" 
      size="small" 
      className="reference-panel"
      style={{ minHeight: '400px', display: 'flex', flexDirection: 'column' }}
      bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column' }}
    >
      {/* 内容区域 */}
      <div style={{ flex: 1, overflow: 'hidden', marginBottom: '16px' }}>
        <Space direction="vertical" style={{ width: '100%' }} size="small">
          {/* 来源信息 */}
          <div style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: '8px' }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              来源：{currentSource.source_file || '未知文件'}
            </Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              相关度：{(currentSource.score * 100).toFixed(1)}%
            </Text>
          </div>
          
          {/* 内容文本 */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            <Paragraph 
              style={{ 
                fontSize: '13px', 
                lineHeight: '1.6',
                margin: 0,
                maxHeight: '280px',
                overflow: 'auto'
              }}
            >
              {currentSource.text}
            </Paragraph>
          </div>
        </Space>
      </div>

      {/* 分页控制器 */}
      <div style={{ 
        borderTop: '1px solid #f0f0f0', 
        paddingTop: '12px',
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
      }}>
        <Button 
          type="text" 
          icon={<LeftOutlined />} 
          size="small"
          onClick={goToPrevious}
          disabled={currentIndex === 0}
        />
        
        <Text style={{ fontSize: '13px', color: '#666' }}>
          {currentIndex + 1} / {totalSources}
        </Text>
        
        <Button 
          type="text" 
          icon={<RightOutlined />} 
          size="small"
          onClick={goToNext}
          disabled={currentIndex >= totalSources - 1}
        />
      </div>
    </Card>
  );
}

export default ReferencePanel;
