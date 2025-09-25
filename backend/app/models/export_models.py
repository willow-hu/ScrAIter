"""
导出相关的数据模型
"""
from typing import List, Optional
from pydantic import BaseModel
from enum import Enum

class ExportFormat(str, Enum):
    """导出格式枚举"""
    JSON_ONLY = "json_only"  # 仅JSON
    FULL_PACKAGE = "full_package"  # 全部资源打包

class ExportRequest(BaseModel):
    """导出请求"""
    format: ExportFormat = ExportFormat.FULL_PACKAGE
    include_images: bool = True  # 是否包含图片

class ExportResponse(BaseModel):
    """导出响应"""
    success: bool
    message: str
    download_url: Optional[str] = None
    file_size: Optional[int] = None
    included_images: Optional[List[str]] = None  # 包含的图片列表
