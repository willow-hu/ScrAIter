import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Menu, Button, Tooltip } from 'antd';
import {
  DatabaseOutlined,
  FolderOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined
} from '../../utils/icons';

const { Sider } = Layout;

function Navigation({ 
  activeView, 
  collapsed, 
  onCollapse, 
  width, 
  onWidthChange 
}) {
  const navigate = useNavigate();
  const [isResizing, setIsResizing] = useState(false);

  const menuItems = [
    {
      key: 'archive',
      icon: <DatabaseOutlined />,
      label: '资料管理',
    },
    {
      key: 'projects',
      icon: <FolderOutlined />,
      label: '项目管理',
    },
  ];

  const handleMenuClick = ({ key }) => {
    navigate(`/${key}`);
  };

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
