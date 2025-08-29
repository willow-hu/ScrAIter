"""
API数据模型
"""
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from enum import Enum

class FileStatus(str, Enum):
    UPLOADING = "uploading"
    PROCESSING = "processing"
    COMPLETED = "completed"
    ERROR = "error"

class FileInfo(BaseModel):
    filename: str
    relative_path: str  # 用于删除文件时的路径引用
    size: int
    upload_time: datetime
    status: FileStatus
    category: Optional[str] = None
    file_type: Optional[str] = None  # structured 或 unstructured

class FileListResponse(BaseModel):
    files: List[FileInfo]
    total_count: int

class UploadResponse(BaseModel):
    message: str
    uploaded_files: List[str]
    failed_files: List[str] = []

class DeleteResponse(BaseModel):
    message: str
    success: bool

class KnowledgeBaseStatus(BaseModel):
    is_built: bool
    file_count: int
    last_updated: Optional[datetime] = None
    build_progress: Optional[float] = None
    status: str  # "idle", "building", "completed", "error"

class BuildTaskResponse(BaseModel):
    task_id: str
    message: str

class BuildStatus(BaseModel):
    task_id: str
    progress: float  # 0-100
    current_file: Optional[str] = None
    estimated_completion: Optional[datetime] = None
    status: str  # "running", "completed", "error"
    error_message: Optional[str] = None
