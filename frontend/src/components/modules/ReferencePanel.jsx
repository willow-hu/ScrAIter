
import React, { useState, useEffect } from 'react';
import { Card, Button, Space, Typography, Empty, Tag } from 'antd';
import { LeftOutlined, RightOutlined } from '../../utils/icons';
import { fetchSourceTags, getSourceTagConfig } from '../../utils/archive_manager';

const { Text, Paragraph } = Typography;

function ReferencePanel({ sources = [], loading = false }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sourceTags, setSourceTags] = useState([]);
  const [filesMetadata, setFilesMetadata] = useState({});
  
  // 获取标签配置
  useEffect(() => {
    const loadSourceTags = async () => {
      try {
        const tags = await fetchSourceTags();
        setSourceTags(tags);
      } catch (error) {
        console.error('获取标签配置失败:', error);
      }
    };
    
    loadSourceTags();
  }, []);

  // 获取文件元数据（包含标签信息）
  useEffect(() => {
    const loadFilesMetadata = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/v1/files');
        if (response.ok) {
          const filesData = await response.json();
          const metadata = {};
          filesData.files.forEach(file => {
            metadata[file.filename] = {
              source_tag: file.source_tag,
              category: file.category,
              file_type: file.file_type
            };
          });
          setFilesMetadata(metadata);
        }
      } catch (error) {
        console.error('获取文件元数据失败:', error);
      }
    };

    loadFilesMetadata();
  }, []);
  
  // 当sources变化时重置索引
  useEffect(() => {
    setCurrentIndex(0);
  }, [sources]);

  // 获取文件的标签信息
  const getFileTagInfo = (sourceFile) => {
    if (!sourceFile || !filesMetadata[sourceFile]) {
      return null;
    }
    
    const fileMetadata = filesMetadata[sourceFile];
    const sourceTag = fileMetadata.source_tag;
    
    if (!sourceTag) {
      return null;
    }
    
    return getSourceTagConfig(sourceTag, sourceTags);
  };

  // 如果没有数据，显示空状态
  if (!sources || sources.length === 0) {
    return (
      <Card title="参考资料" size="small" className="panel reference-panel reference-panel-empty">
        <Empty 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="暂无参考资料"
          className="reference-panel-empty-content"
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
      title={
        <Space>
          <Text>参考资料</Text>
          {sources.length > 0}
        </Space>
      } 
      size="small" 
      className="panel reference-panel"
    >
      {/* 内容区域 */}
      <div className="reference-panel-content">
        <Space direction="vertical" className="reference-panel-space" size="small">
          {/* 来源信息 */}
          <div className="reference-panel-source">
            <Text type="secondary" className="reference-panel-source-text">
              来源：{currentSource.source_file || '未知文件'}
              {(() => {
                const tagInfo = getFileTagInfo(currentSource.source_file);
                return tagInfo ? (
                  <Tag 
                    color={tagInfo.color}
                    size="small"
                    className="reference-source-tag"
                  >
                    {tagInfo.label}
                  </Tag>
                ) : null;
              })()}
            </Text>
            <br />
            <Text type="secondary" className="reference-panel-source-text">
              相关度：{(currentSource.score * 100).toFixed(1)}%
            </Text>
          </div>
          
          {/* 内容文本 */}
          <div className="reference-panel-text-container">
            <Paragraph className="reference-panel-text">
              {currentSource.text}
            </Paragraph>
          </div>
        </Space>
      </div>

      {/* 分页控制器 */}
      <div className="reference-panel-pagination">
        <Button 
          type="text" 
          icon={<LeftOutlined />} 
          size="small"
          onClick={goToPrevious}
          disabled={currentIndex === 0}
        />
        
        <Text className="reference-panel-pagination-text">
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
