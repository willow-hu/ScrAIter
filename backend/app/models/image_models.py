"""
图片管理相关的数据模型
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime

class ImageUploadRequest(BaseModel):
    """图片上传请求"""
    kb_name: str  # 知识库名称

class ImageUploadResponse(BaseModel):
    """图片上传响应"""
    success: bool
    filename: str
    message: str
    file_size: Optional[int] = None

class ImageInfo(BaseModel):
    """图片信息"""
    filename: str
    original_name: str
    file_size: int
    upload_time: datetime
    dimensions: Optional[Dict[str, int]] = None  # {"width": 1920, "height": 1080}

class ImageListResponse(BaseModel):
    """图片列表响应"""
    images: List[ImageInfo]
    total_count: int

class DeleteImageResponse(BaseModel):
    """删除图片响应"""
    success: bool
    message: str
