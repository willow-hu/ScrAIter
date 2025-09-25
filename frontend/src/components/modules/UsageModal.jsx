import React from 'react';
import { Modal, Button } from 'antd';

function UsageModal({ visible, onClose }) {
  return (
    <Modal
      title="使用说明"
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="ok" type="primary" onClick={onClose}>
          知道了
        </Button>
      ]}
      width={600}
    >
      <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
        <ol>
          <li><strong>选择知识库</strong>：使用左上角的知识库选择下拉框选择要使用的知识库</li>
          <li><strong>设置项目信息</strong>：点击项目信息按钮，设置景点信息和角色设定</li>
          <li><strong>生成大纲</strong>：自动生成初始大纲草稿</li>
          <li><strong>编辑节点</strong>：
            <ul style={{ paddingLeft: '20px', marginTop: '4px' }}>
              <li>拖动树节点以移动位置</li>
              <li>鼠标悬停在节点上可查看节点信息</li>
              <li>双击节点以修改节点详细信息</li>
              <li>右键节点以获取更多操作选项</li>
            </ul>
          </li>
          <li><strong>添加节点</strong>：空白区域右击可添加新节点</li>
          <li><strong>导出</strong>：导出完整资源包（包括图像、文本）或仅脚本</li>
          <li><strong>重置功能</strong>：重置按钮可恢复到GraphRAG生成的原始结构</li>
        </ol>
      </div>
    </Modal>
  );
}

export default UsageModal;
