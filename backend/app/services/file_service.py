"""
文件管理服务
"""
import os
import shutil
import uuid
import json
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import UploadFile, HTTPException
import pandas as pd

from app.core.config import settings
from app.models.file_models import FileInfo, FileStatus, FileListResponse, CategoryListResponse, SourceTag

class FileService:
    def __init__(self):
        self.unstructured_path = os.path.join(settings.UPLOADS_DIR, "File", "Unstructured")
        self.structured_path = os.path.join(settings.UPLOADS_DIR, "File", "Structured")
        self.metadata_path = os.path.join(settings.UPLOADS_DIR, "metadata.json")
        
        # 确保目录存在
        os.makedirs(self.unstructured_path, exist_ok=True)
        os.makedirs(self.structured_path, exist_ok=True)
        
        # 初始化元数据文件
        self._init_metadata()
    
    def _init_metadata(self):
        """初始化元数据文件"""
        if not os.path.exists(self.metadata_path):
            metadata = {
                "files": {},  # filename -> {source_tag, category, file_type, ...}
                "categories": [],
                "last_updated": datetime.now().isoformat()
            }
            self._save_metadata(metadata)
    
    def _load_metadata(self) -> Dict:
        """加载元数据"""
        try:
            with open(self.metadata_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            self._init_metadata()
            return self._load_metadata()
    
    def _save_metadata(self, metadata: Dict):
        """保存元数据"""
        metadata["last_updated"] = datetime.now().isoformat()
        with open(self.metadata_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, ensure_ascii=False, indent=2)
    
    def get_categories(self) -> CategoryListResponse:
        """获取所有类目列表"""
        categories = set()
        
        # 从实际文件夹扫描（只返回实际存在的目录）
        for base_path in [self.unstructured_path, self.structured_path]:
            if os.path.exists(base_path):
                for item in os.listdir(base_path):
                    item_path = os.path.join(base_path, item)
                    if os.path.isdir(item_path):
                        categories.add(item)
        
        category_list = sorted(list(categories))
        
        # 更新元数据中的类目列表（只保存实际存在的类目）
        metadata = self._load_metadata()
        metadata["categories"] = category_list
        self._save_metadata(metadata)
        
        return CategoryListResponse(
            categories=category_list,
            total_count=len(category_list)
        )
    
    def get_file_list(self) -> FileListResponse:
        """获取所有文件列表"""
        files = []
        metadata = self._load_metadata()
        
        # 扫描非结构化文件
        if os.path.exists(self.unstructured_path):
            for category in os.listdir(self.unstructured_path):
                category_path = os.path.join(self.unstructured_path, category)
                if os.path.isdir(category_path):
                    for filename in os.listdir(category_path):
                        file_path = os.path.join(category_path, filename)
                        if os.path.isfile(file_path):
                            file_info = self._get_file_info(file_path, filename, category, "unstructured", metadata)
                            files.append(file_info)
        
        # 扫描结构化文件
        if os.path.exists(self.structured_path):
            for category in os.listdir(self.structured_path):
                category_path = os.path.join(self.structured_path, category)
                if os.path.isdir(category_path):
                    for filename in os.listdir(category_path):
                        file_path = os.path.join(category_path, filename)
                        if os.path.isfile(file_path):
                            file_info = self._get_file_info(file_path, filename, category, "structured", metadata)
                            files.append(file_info)
        
        return FileListResponse(files=files, total_count=len(files))
    
    def _get_file_info(self, file_path: str, filename: str, category: str, file_type: str, metadata: Dict) -> FileInfo:
        """获取文件信息"""
        stat = os.stat(file_path)
        relative_path = f"{category}/{filename}"
        
        # 从元数据获取额外信息
        file_metadata = metadata.get("files", {}).get(relative_path, {})
        source_tag = file_metadata.get("source_tag")
        
        return FileInfo(
            filename=filename,
            relative_path=relative_path,
            size=stat.st_size,
            upload_time=datetime.fromtimestamp(stat.st_mtime),
            status=FileStatus.COMPLETED,
            category=category,
            file_type=file_type,
            source_tag=source_tag
        )
    
    def update_file_tag(self, filename: str, source_tag: SourceTag) -> Dict[str, Any]:
        """更新文件标签"""
        try:
            # 解析文件路径
            if "/" not in filename:
                return {"message": "无效的文件路径格式", "success": False}
            
            category, file_name = filename.split("/", 1)
            
            # 检查文件是否存在
            possible_paths = [
                os.path.join(self.unstructured_path, category, file_name),
                os.path.join(self.structured_path, category, file_name)
            ]
            
            file_exists = any(os.path.exists(path) for path in possible_paths)
            if not file_exists:
                return {"message": "文件不存在", "success": False}
            
            # 更新元数据
            metadata = self._load_metadata()
            if "files" not in metadata:
                metadata["files"] = {}
            
            if filename not in metadata["files"]:
                metadata["files"][filename] = {}
            
            metadata["files"][filename]["source_tag"] = source_tag.value
            metadata["files"][filename]["category"] = category
            metadata["files"][filename]["updated_time"] = datetime.now().isoformat()
            
            self._save_metadata(metadata)
            
            return {"message": f"文件标签更新成功", "success": True}
            
        except Exception as e:
            return {"message": f"更新标签失败: {str(e)}", "success": False}
    
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
        
        # 更新类目列表
        metadata = self._load_metadata()
        if category not in metadata.get("categories", []):
            metadata.setdefault("categories", []).append(category)
            self._save_metadata(metadata)
        
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
                
                # 更新文件元数据
                relative_path = f"{category}/{file.filename}"
                metadata["files"][relative_path] = {
                    "category": category,
                    "file_type": file_type,
                    "upload_time": datetime.now().isoformat(),
                    "source_tag": None  # 上传时未设置标签
                }
                
                uploaded_files.append(file.filename)
                
            except Exception as e:
                failed_files.append(f"{file.filename or '未知文件'}: {str(e)}")
        
        # 保存元数据
        self._save_metadata(metadata)
        
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
                return {"message": "无效的文件路径格式", "success": False}
            
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
            
            # 更新元数据
            metadata = self._load_metadata()
            if filename in metadata.get("files", {}):
                del metadata["files"][filename]
                self._save_metadata(metadata)
            
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
