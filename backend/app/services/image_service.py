"""
图片管理服务
"""
import os
import json
import uuid
import shutil
from datetime import datetime
from typing import List, Optional, Dict, Any
from PIL import Image
from fastapi import UploadFile

from app.core.config import settings
from app.models.image_models import ImageInfo, ImageListResponse, DeleteImageResponse, ImageUploadResponse

class ImageService:
    def __init__(self):
        self.projects_path = settings.SHARED_DIR + "/projects"
        # 确保projects目录存在
        os.makedirs(self.projects_path, exist_ok=True)
        
        # 支持的图片格式
        self.supported_formats = {'.jpg', '.jpeg', '.png'}
        self.max_file_size = 5 * 1024 * 1024  # 5MB
    
    def get_images_dir(self, kb_name: str) -> str:
        """获取指定知识库的图片目录"""
        images_dir = os.path.join(self.projects_path, kb_name, "images")
        os.makedirs(images_dir, exist_ok=True)
        return images_dir
    
    def get_image_metadata_path(self, kb_name: str) -> str:
        """获取图片元数据文件路径"""
        return os.path.join(self.get_images_dir(kb_name), "metadata.json")
    
    def load_image_metadata(self, kb_name: str) -> Dict[str, Any]:
        """加载图片元数据"""
        metadata_path = self.get_image_metadata_path(kb_name)
        if os.path.exists(metadata_path):
            try:
                with open(metadata_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception:
                pass
        return {"images": {}}
    
    def save_image_metadata(self, kb_name: str, metadata: Dict[str, Any]):
        """保存图片元数据"""
        metadata_path = self.get_image_metadata_path(kb_name)
        with open(metadata_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, ensure_ascii=False, indent=2, default=str)
    
    def generate_unique_filename(self, kb_name: str, file_extension: str) -> str:
        """生成唯一的文件名：bg_001, bg_002, ..."""
        images_dir = self.get_images_dir(kb_name)
        counter = 1
        
        while True:
            filename = f"bg_{counter:03d}{file_extension}"
            if not os.path.exists(os.path.join(images_dir, filename)):
                return filename
            counter += 1
    
    async def upload_image(self, kb_name: str, file: UploadFile) -> ImageUploadResponse:
        """上传图片"""
        try:
            # 验证文件类型
            file_extension = os.path.splitext(file.filename.lower())[1]
            if file_extension not in self.supported_formats:
                return ImageUploadResponse(
                    success=False,
                    filename="",
                    message=f"不支持的文件格式。支持的格式：{', '.join(self.supported_formats)}"
                )
            
            # 读取文件内容
            contents = await file.read()
            
            # 验证文件大小
            if len(contents) > self.max_file_size:
                return ImageUploadResponse(
                    success=False,
                    filename="",
                    message=f"文件大小超过限制（{self.max_file_size // (1024*1024)}MB）"
                )
            
            # 验证是否为有效图片
            try:
                image = Image.open(file.file)
                width, height = image.size
                image.verify()
            except Exception:
                return ImageUploadResponse(
                    success=False,
                    filename="",
                    message="无效的图片文件"
                )
            
            # 生成唯一文件名
            filename = self.generate_unique_filename(kb_name, file_extension)
            
            # 保存文件
            images_dir = self.get_images_dir(kb_name)
            file_path = os.path.join(images_dir, filename)
            
            # 重新打开文件以保存
            file.file.seek(0)
            with open(file_path, 'wb') as f:
                f.write(contents)
            
            # 更新元数据
            metadata = self.load_image_metadata(kb_name)
            metadata["images"][filename] = {
                "original_name": file.filename,
                "file_size": len(contents),
                "upload_time": datetime.now().isoformat(),
                "dimensions": {"width": width, "height": height}
            }
            self.save_image_metadata(kb_name, metadata)
            
            return ImageUploadResponse(
                success=True,
                filename=filename,
                message="图片上传成功",
                file_size=len(contents)
            )
            
        except Exception as e:
            return ImageUploadResponse(
                success=False,
                filename="",
                message=f"上传失败: {str(e)}"
            )
    
    def list_images(self, kb_name: str) -> ImageListResponse:
        """获取图片列表"""
        try:
            metadata = self.load_image_metadata(kb_name)
            images = []
            
            for filename, info in metadata.get("images", {}).items():
                # 验证文件是否实际存在
                file_path = os.path.join(self.get_images_dir(kb_name), filename)
                if os.path.exists(file_path):
                    images.append(ImageInfo(
                        filename=filename,
                        original_name=info.get("original_name", filename),
                        file_size=info.get("file_size", 0),
                        upload_time=datetime.fromisoformat(info.get("upload_time", datetime.now().isoformat())),
                        dimensions=info.get("dimensions")
                    ))
            
            # 按上传时间倒序排列
            images.sort(key=lambda x: x.upload_time, reverse=True)
            
            return ImageListResponse(
                images=images,
                total_count=len(images)
            )
            
        except Exception as e:
            return ImageListResponse(
                images=[],
                total_count=0
            )
    
    def get_image_path(self, kb_name: str, filename: str) -> Optional[str]:
        """获取图片文件路径"""
        file_path = os.path.join(self.get_images_dir(kb_name), filename)
        if os.path.exists(file_path):
            return file_path
        return None
    
    def delete_image(self, kb_name: str, filename: str) -> DeleteImageResponse:
        """删除图片"""
        try:
            file_path = os.path.join(self.get_images_dir(kb_name), filename)
            
            if not os.path.exists(file_path):
                return DeleteImageResponse(
                    success=False,
                    message="图片文件不存在"
                )
            
            # 删除文件
            os.remove(file_path)
            
            # 更新元数据
            metadata = self.load_image_metadata(kb_name)
            if filename in metadata.get("images", {}):
                del metadata["images"][filename]
                self.save_image_metadata(kb_name, metadata)
            
            return DeleteImageResponse(
                success=True,
                message="图片删除成功"
            )
            
        except Exception as e:
            return DeleteImageResponse(
                success=False,
                message=f"删除失败: {str(e)}"
            )

# 创建全局实例
image_service = ImageService()
