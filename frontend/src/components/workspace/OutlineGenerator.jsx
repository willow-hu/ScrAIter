import React, { useState, useEffect, useRef } from 'react';
import { Layout, Typography } from 'antd';
import DraftGenerator from '../modules/DraftGenerator';

const { Content } = Layout;
const { Title } = Typography;

function OutlineGenerator() {
  // 处理初稿确认（暂时只是一个占位符，实际应该保存并可能切换到脚本创作）
  const handleDraftConfirmed = (draftData) => {
    console.log('Generated outline:', draftData);
    // 这里可以保存生成的大纲，并提示用户切换到脚本创作页面
    // 或者直接在当前页面显示只读版本的树结构
  };

  return (
    <Layout style={{ height: '100vh', background: '#fff' }}>
      <Content style={{ height: '100%' }}>
        <div style={{ 
          position: 'absolute',
          top: 16,
          left: 24,
          zIndex: 10,
          background: 'rgba(255, 255, 255, 0.9)',
          padding: '8px 16px',
          borderRadius: 6,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
        }}>
          <Title level={4} style={{ margin: 0 }}>生成大纲</Title>
        </div>
        
        <DraftGenerator 
          onDraftConfirmed={handleDraftConfirmed}
          onBack={() => {
            // 可以添加返回逻辑
          }}
        />
      </Content>
    </Layout>
  );
}

export default OutlineGenerator;