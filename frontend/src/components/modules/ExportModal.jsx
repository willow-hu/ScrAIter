import React from 'react';
import { Modal, Button } from 'antd';
import '../../styles/export-modal.css';

function ExportModal({ visible, onClose, onExport }) {
  return (
    <Modal
      title="选择导出格式"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={500}
    >
      <div className="export-modal-content">
        <div className="export-options">
          <Button
            onClick={() => {
              onClose();
              onExport('json_only');
            }}
            className="export-option-button"
          >
            <div>
              <div className="export-option-title">仅导出JSON脚本</div>
            </div>
          </Button>
          
          <Button
            onClick={() => {
              onClose();
              onExport('full_package');
            }}
            className="export-option-button"
          >
            <div>
              <div className="export-option-title">导出完整资源包</div>
            </div>
          </Button>
        </div>
        
        <div className="export-tip">
          💡 选择"导出完整包"以获得包含所有资源的完整项目文件。
        </div>
      </div>
    </Modal>
  );
}

export default ExportModal;
