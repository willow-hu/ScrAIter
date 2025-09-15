import React, { useState, useCallback } from 'react';
import { Layout, Menu, Button, Tooltip } from 'antd';
import {
  FileOutlined,
  DatabaseOutlined,
  NodeIndexOutlined,
  EditOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined
} from '@ant-design/icons';

const { Sider } = Layout;

function Navigation({ 
  activeView, 
  onViewChange, 
  collapsed, 
  onCollapse, 
  width, 
  onWidthChange 
}) {
  const [isResizing, setIsResizing] = useState(false);

  const menuItems = [
    {
      key: 'files',
      icon: <FileOutlined />,
      label: '文件管理',
    },
    {
      key: 'knowledge-base',
      icon: <DatabaseOutlined />,
      label: '知识库管理',
    },
    {
      key: 'outline',
      icon: <NodeIndexOutlined />,
      label: '生成大纲',
    },
    {
      key: 'script',
      icon: <EditOutlined />,
      label: '脚本创作',
    },
  ];

  const handleMenuClick = ({ key }) => {
    onViewChange(key);
  };

  // 处理鼠标拖拽调整宽度
  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (isResizing && !collapsed) {
      const newWidth = e.clientX;
      onWidthChange(Math.max(200, Math.min(400, newWidth)));
    }
  }, [isResizing, collapsed, onWidthChange]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  // 添加事件监听器
  React.useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <>
      <Sider
        width={width}
        collapsed={collapsed}
        collapsedWidth={80}
        style={{
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          zIndex: 100,
          boxShadow: '2px 0 6px rgba(0, 0, 0, 0.1)',
          backgroundColor: '#fff',
        }}
      >
        <div className="navi-header">
          <div className="logo" style={{ fontSize: '22px' }}>
            {!collapsed && <span>ScrAIter</span>}
          </div>
          <Tooltip placement="right">
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => onCollapse(!collapsed)}
              style={{
                fontSize: '16px',
                width: 40,
                height: 40,
                color: '#666',
              }}
            />
          </Tooltip>
        </div>

        <Menu
          theme="light"
          mode="inline"
          selectedKeys={[activeView]}
          onClick={handleMenuClick}
          style={{ border: 'none', backgroundColor: 'transparent' }}
          items={menuItems}
        />
      </Sider>

      {/* 拖拽调整宽度的分割线 */}
      {!collapsed && (
        <div
          className="navi-resizer"
          style={{
            position: 'fixed',
            left: width - 2,
            top: 0,
            width: 4,
            height: '100vh',
            cursor: 'col-resize',
            zIndex: 101,
            backgroundColor: isResizing ? '#d9d9d9' : 'transparent',
          }}
          onMouseDown={handleMouseDown}
        />
      )}
    </>
  );
}

export default Navigation;