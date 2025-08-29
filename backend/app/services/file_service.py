"""
文件管理服务
"""
import os
import shutil
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import UploadFile, HTTPException
import pandas as pd

from app.core.config import settings
from app.models.file_models import FileInfo, FileStatus, FileListResponse

class FileService:
    def __init__(self):
        self.unstructured_path = os.path.join(settings.UPLOADS_DIR, "File", "Unstructured")
        self.structured_path = os.path.join(settings.UPLOADS_DIR, "File", "Structured")
        
        # 确保目录存在
        os.makedirs(self.unstructured_path, exist_ok=True)
        os.makedirs(self.structured_path, exist_ok=True)
    
    def get_file_list(self) -> FileListResponse:
        """获取所有文件列表"""
        files = []
        
        # 扫描非结构化文件
        if os.path.exists(self.unstructured_path):
            for category in os.listdir(self.unstructured_path):
                category_path = os.path.join(self.unstructured_path, category)
                if os.path.isdir(category_path):
                    for filename in os.listdir(category_path):
                        file_path = os.path.join(category_path, filename)
                        if os.path.isfile(file_path):
                            file_info = self._get_file_info(file_path, filename, category, "unstructured")
                            files.append(file_info)
        
        # 扫描结构化文件
        if os.path.exists(self.structured_path):
            for category in os.listdir(self.structured_path):
                category_path = os.path.join(self.structured_path, category)
                if os.path.isdir(category_path):
                    for filename in os.listdir(category_path):
                        file_path = os.path.join(category_path, filename)
                        if os.path.isfile(file_path):
                            file_info = self._get_file_info(file_path, filename, category, "structured")
                            files.append(file_info)
        
        return FileListResponse(files=files, total_count=len(files))
    
    def _get_file_info(self, file_path: str, filename: str, category: str, file_type: str) -> FileInfo:
        """获取文件信息"""
        stat = os.stat(file_path)
        return FileInfo(
            filename=filename,
            relative_path=f"{category}/{filename}",
            size=stat.st_size,
            upload_time=datetime.fromtimestamp(stat.st_mtime),
            status=FileStatus.COMPLETED,
            category=category,
            file_type=file_type
        )
    
    async def upload_files(self, files: List[UploadFile], category: str, file_type: str = "unstructured") -> Dict[str, Any]:
        """上传文件"""
        uploaded_files = []
        failed_files = []
        
        # 选择目标路径
        if file_type == "structured":
            target_path = os.path.join(self.structured_path, category)
        else:
            target_path = os.path.join(self.unstructured_path, category)
        
        # 创建分类目录
        os.makedirs(target_path, exist_ok=True)
        
        for file in files:
            try:
                # 检查文件名
                if not file.filename:
                    failed_files.append("文件名为空")
                    continue
                
                # 检查文件扩展名
                file_ext = os.path.splitext(file.filename)[1].lower()
                if file_ext not in settings.ALLOWED_EXTENSIONS:
                    failed_files.append(f"{file.filename}: 不支持的文件格式")
                    continue
                
                # 检查文件大小
                contents = await file.read()
                if len(contents) > settings.MAX_FILE_SIZE:
                    failed_files.append(f"{file.filename}: 文件大小超过限制")
                    continue
                
                # 保存文件
                file_path = os.path.join(target_path, file.filename)
                with open(file_path, "wb") as f:
                    f.write(contents)
                
                # 如果是结构化文件，进行预处理
                if file_type == "structured" and file_ext in [".xlsx", ".csv"]:
                    self._process_structured_file(file_path, file.filename, target_path)
                
                uploaded_files.append(file.filename)
                
            except Exception as e:
                failed_files.append(f"{file.filename or '未知文件'}: {str(e)}")
        
        return {
            "message": f"上传完成，成功 {len(uploaded_files)} 个，失败 {len(failed_files)} 个",
            "uploaded_files": uploaded_files,
            "failed_files": failed_files
        }
    
    def _process_structured_file(self, file_path: str, filename: str, target_path: str):
        """处理结构化文件，转换为文本格式"""
        try:
            # 读取数据
            if filename.endswith('.xlsx'):
                df = pd.read_excel(file_path)
            elif filename.endswith('.csv'):
                df = pd.read_csv(file_path)
            else:
                return
            
            # 转换为文本格式
            txt_filename = os.path.splitext(filename)[0] + '.txt'
            txt_path = os.path.join(target_path, txt_filename)
            
            with open(txt_path, "w", encoding="utf-8") as f:
                columns = df.columns
                for idx, row in df.iterrows():
                    f.write("【")
                    info = []
                    for col in columns:
                        info.append(f"{col}:{row[col]}")
                    infos = ",".join(info)
                    f.write(infos)
                    if idx != len(df) - 1:
                        f.write("】\n")
                    else:
                        f.write("】")
            
            # 删除原始文件
            os.remove(file_path)
            
        except Exception as e:
            print(f"处理结构化文件失败: {e}")
    
    def delete_file(self, filename: str) -> Dict[str, Any]:
        """删除文件"""
        try:
            # 解析文件路径
            if "/" not in filename:
                raise HTTPException(status_code=400, detail="无效的文件路径格式")
            
            category, file_name = filename.split("/", 1)
            
            # 尝试在两个目录中查找文件
            possible_paths = [
                os.path.join(self.unstructured_path, category, file_name),
                os.path.join(self.structured_path, category, file_name)
            ]
            
            file_deleted = False
            for file_path in possible_paths:
                if os.path.exists(file_path):
                    os.remove(file_path)
                    file_deleted = True
                    break
            
            if not file_deleted:
                return {"message": "文件不存在", "success": False}
            
            # 如果分类目录为空，删除目录
            category_paths = [
                os.path.join(self.unstructured_path, category),
                os.path.join(self.structured_path, category)
            ]
            
            for category_path in category_paths:
                if os.path.exists(category_path) and not os.listdir(category_path):
                    os.rmdir(category_path)
            
            return {"message": f"文件 {filename} 删除成功", "success": True}
            
        except Exception as e:
            return {"message": f"删除文件失败: {str(e)}", "success": False}

# 创建全局实例
file_service = FileService()
