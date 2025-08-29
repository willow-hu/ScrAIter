import React from 'react';
import { List, Card, Typography, Tag, Space, Empty } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';

const { Text, Paragraph } = Typography;

function ReferenceViewer({ sources = [] }) {
  if (!sources || sources.length === 0) {
    return (
      <Empty 
        description="没有找到参考资料"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  // 按相似度分数排序
  const sortedSources = [...sources].sort((a, b) => (b.score || 0) - (a.score || 0));

  return (
    <div className="reference-viewer">
      <Space direction="vertical" style={{ width: '100%', marginBottom: '16px' }}>
        <Text strong>找到 {sources.length} 条相关资料，按相似度排序：</Text>
      </Space>
      
      <List
        dataSource={sortedSources}
        renderItem={(source, index) => (
          <List.Item style={{ border: 'none', padding: '0 0 16px 0' }}>
            <Card 
              size="small" 
              style={{ width: '100%' }}
              title={
                <Space>
                  <FileTextOutlined />
                  <Text strong>参考资料 #{index + 1}</Text>
                  <Tag color="blue">
                    相似度: {((source.score || 0) * 100).toFixed(1)}%
                  </Tag>
                  {source.source_file && (
                    <Tag color="geekblue">
                      {source.source_file}
                    </Tag>
                  )}
                </Space>
              }
            >
              <Paragraph 
                style={{ 
                  margin: 0,
                  lineHeight: '1.6',
                  fontSize: '14px'
                }}
              >
                {source.text}
              </Paragraph>
            </Card>
          </List.Item>
        )}
      />
    </div>
  );
}

export default ReferenceViewer;
