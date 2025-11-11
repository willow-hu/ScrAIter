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
        
        # 支持的图片格式 - 扩展支持更多格式
        self.supported_formats = {'.jpg', '.jpeg', '.png', '.bmp', '.webp'}
        # 移除文件大小限制
    
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
            # 验证文件名
            if not file.filename:
                return ImageUploadResponse(
                    success=False,
                    filename="",
                    message="文件名不能为空"
                )
            
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
            
            # 验证是否为有效图片
            try:
                file.file.seek(0)
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
    
    # ========== NPC立绘管理方法 ==========
    
    def get_npc_dir(self, project_id: str) -> str:
        """获取NPC立绘目录"""
        npc_dir = os.path.join(settings.PROJECTS_DIR, project_id, "assets", "npc")
        os.makedirs(npc_dir, exist_ok=True)
        return npc_dir
    
    def get_asset_metadata_path(self, project_id: str, asset_type: str) -> str:
        """获取资产元数据文件路径"""
        if asset_type == "npc":
            return os.path.join(self.get_npc_dir(project_id), "metadata.json")
        elif asset_type == "bg":
            return os.path.join(self.get_bg_dir(project_id), "metadata.json")
        else:
            raise ValueError(f"不支持的资产类型: {asset_type}")
    
    def load_asset_metadata(self, project_id: str, asset_type: str) -> Dict[str, Any]:
        """加载资产元数据"""
        metadata_path = self.get_asset_metadata_path(project_id, asset_type)
        if os.path.exists(metadata_path):
            try:
                with open(metadata_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception:
                pass
        return {"images": {}}
    
    def save_asset_metadata(self, project_id: str, asset_type: str, metadata: Dict[str, Any]):
        """保存资产元数据"""
        metadata_path = self.get_asset_metadata_path(project_id, asset_type)
        with open(metadata_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, ensure_ascii=False, indent=2, default=str)
    
    async def upload_npc_image(self, project_id: str, file: UploadFile) -> ImageUploadResponse:
        """上传NPC立绘"""
        try:
            if not file.filename:
                return ImageUploadResponse(
                    success=False,
                    filename="",
                    message="文件名不能为空"
                )
            
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
            
            # 验证是否为有效图片
            try:
                file.file.seek(0)
                image = Image.open(file.file)
                width, height = image.size
                image.verify()
            except Exception:
                return ImageUploadResponse(
                    success=False,
                    filename="",
                    message="无效的图片文件"
                )
            
            # 使用原始文件名
            filename = file.filename
            
            # 保存文件
            npc_dir = self.get_npc_dir(project_id)
            file_path = os.path.join(npc_dir, filename)
            
            file.file.seek(0)
            with open(file_path, 'wb') as f:
                f.write(contents)
            
            # 更新元数据
            metadata = self.load_asset_metadata(project_id, "npc")
            metadata["images"][filename] = {
                "original_name": file.filename,
                "file_size": len(contents),
                "upload_time": datetime.now().isoformat(),
                "dimensions": {"width": width, "height": height}
            }
            self.save_asset_metadata(project_id, "npc", metadata)
            
            return ImageUploadResponse(
                success=True,
                filename=filename,
                message="NPC立绘上传成功",
                file_size=len(contents)
            )
            
        except Exception as e:
            return ImageUploadResponse(
                success=False,
                filename="",
                message=f"上传失败: {str(e)}"
            )
    
    def list_npc_images(self, project_id: str) -> ImageListResponse:
        """获取NPC立绘列表"""
        try:
            metadata = self.load_asset_metadata(project_id, "npc")
            images = []
            
            for filename, info in metadata.get("images", {}).items():
                file_path = os.path.join(self.get_npc_dir(project_id), filename)
                if os.path.exists(file_path):
                    images.append(ImageInfo(
                        filename=filename,
                        original_name=info.get("original_name", filename),
                        file_size=info.get("file_size", 0),
                        upload_time=datetime.fromisoformat(info.get("upload_time", datetime.now().isoformat())),
                        dimensions=info.get("dimensions")
                    ))
            
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
    
    def get_npc_image_path(self, project_id: str, filename: str) -> Optional[str]:
        """获取NPC立绘文件路径"""
        file_path = os.path.join(self.get_npc_dir(project_id), filename)
        if os.path.exists(file_path):
            return file_path
        return None
    
    def delete_npc_image(self, project_id: str, filename: str) -> DeleteImageResponse:
        """删除NPC立绘"""
        try:
            file_path = os.path.join(self.get_npc_dir(project_id), filename)
            
            if not os.path.exists(file_path):
                return DeleteImageResponse(
                    success=False,
                    message="NPC立绘文件不存在"
                )
            
            os.remove(file_path)
            
            metadata = self.load_asset_metadata(project_id, "npc")
            if filename in metadata.get("images", {}):
                del metadata["images"][filename]
                self.save_asset_metadata(project_id, "npc", metadata)
            
            return DeleteImageResponse(
                success=True,
                message="NPC立绘删除成功"
            )
            
        except Exception as e:
            return DeleteImageResponse(
                success=False,
                message=f"删除失败: {str(e)}"
            )
    
    # ========== 背景图片管理方法 ==========
    
    def get_bg_dir(self, project_id: str) -> str:
        """获取背景图片目录"""
        bg_dir = os.path.join(settings.PROJECTS_DIR, project_id, "assets", "bg")
        os.makedirs(bg_dir, exist_ok=True)
        return bg_dir
    
    def generate_bg_filename(self, project_id: str, file_extension: str) -> str:
        """生成背景图片文件名"""
        bg_dir = self.get_bg_dir(project_id)
        counter = 1
        
        while True:
            filename = f"bg_{counter:03d}{file_extension}"
            if not os.path.exists(os.path.join(bg_dir, filename)):
                return filename
            counter += 1
    
    async def upload_bg_image(self, project_id: str, file: UploadFile) -> ImageUploadResponse:
        """上传背景图片"""
        try:
            if not file.filename:
                return ImageUploadResponse(
                    success=False,
                    filename="",
                    message="文件名不能为空"
                )
            
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
            
            # 验证是否为有效图片
            try:
                file.file.seek(0)
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
            filename = self.generate_bg_filename(project_id, file_extension)
            
            # 保存文件
            bg_dir = self.get_bg_dir(project_id)
            file_path = os.path.join(bg_dir, filename)
            
            file.file.seek(0)
            with open(file_path, 'wb') as f:
                f.write(contents)
            
            # 更新元数据
            metadata = self.load_asset_metadata(project_id, "bg")
            metadata["images"][filename] = {
                "original_name": file.filename,
                "file_size": len(contents),
                "upload_time": datetime.now().isoformat(),
                "dimensions": {"width": width, "height": height}
            }
            self.save_asset_metadata(project_id, "bg", metadata)
            
            return ImageUploadResponse(
                success=True,
                filename=filename,
                message="背景图片上传成功",
                file_size=len(contents)
            )
            
        except Exception as e:
            return ImageUploadResponse(
                success=False,
                filename="",
                message=f"上传失败: {str(e)}"
            )
    
    def list_bg_images(self, project_id: str) -> ImageListResponse:
        """获取背景图片列表"""
        try:
            metadata = self.load_asset_metadata(project_id, "bg")
            images = []
            
            for filename, info in metadata.get("images", {}).items():
                file_path = os.path.join(self.get_bg_dir(project_id), filename)
                if os.path.exists(file_path):
                    images.append(ImageInfo(
                        filename=filename,
                        original_name=info.get("original_name", filename),
                        file_size=info.get("file_size", 0),
                        upload_time=datetime.fromisoformat(info.get("upload_time", datetime.now().isoformat())),
                        dimensions=info.get("dimensions")
                    ))
            
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
    
    def get_bg_image_path(self, project_id: str, filename: str) -> Optional[str]:
        """获取背景图片文件路径"""
        file_path = os.path.join(self.get_bg_dir(project_id), filename)
        if os.path.exists(file_path):
            return file_path
        return None
    
    def delete_bg_image(self, project_id: str, filename: str) -> DeleteImageResponse:
        """删除背景图片"""
        try:
            file_path = os.path.join(self.get_bg_dir(project_id), filename)
            
            if not os.path.exists(file_path):
                return DeleteImageResponse(
                    success=False,
                    message="背景图片文件不存在"
                )
            
            os.remove(file_path)
            
            metadata = self.load_asset_metadata(project_id, "bg")
            if filename in metadata.get("images", {}):
                del metadata["images"][filename]
                self.save_asset_metadata(project_id, "bg", metadata)
            
            return DeleteImageResponse(
                success=True,
                message="背景图片删除成功"
            )
            
        except Exception as e:
            return DeleteImageResponse(
                success=False,
                message=f"删除失败: {str(e)}"
            )

# 创建全局实例
image_service = ImageService()
