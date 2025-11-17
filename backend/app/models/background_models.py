"""
背景图管理相关的数据模型
"""
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel


class BackgroundInfo(BaseModel):
    """背景图信息"""
    id: str
    filename: str
    upload_time: str
    used_by: List[int] = []


class BackgroundListResponse(BaseModel):
    """背景图列表响应"""
    backgrounds: List[BackgroundInfo]
    default_background: Optional[str] = None
    total_count: int


class BackgroundUploadRequest(BaseModel):
    """上传背景图请求"""
    id: str
    filename: str


class BackgroundReplaceRequest(BaseModel):
    """替换背景图请求"""
    bg_id: str
    filename: str


class BackgroundDeleteRequest(BaseModel):
    """删除背景图请求"""
    bg_id: str


class SetDefaultBackgroundRequest(BaseModel):
    """设置默认背景图请求"""
    bg_id: Optional[str] = None  # 允许为None以取消默认


class AssignScenesRequest(BaseModel):
    """分配场景请求"""
    node_ids: List[int]


class BackgroundResponse(BaseModel):
    """通用背景图操作响应"""
    success: bool
    message: str
    data: Optional[dict] = None
