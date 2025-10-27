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

class SourceTag(str, Enum):
    LITERATURE = "literature"  # 文献资料
    ENCYCLOPEDIA = "encyclopedia"  # 百科知识
    BLOG = "blog"  # 博客文章
    NEWS = "news"  # 新闻报道
    OFFICIAL = "official"  # 官方资料
    OTHER = "other"  # 其他来源

class FileInfo(BaseModel):
    filename: str
    relative_path: str  # 用于删除文件时的路径引用
    size: int
    upload_time: datetime
    status: FileStatus
    category: Optional[str] = None
    file_type: Optional[str] = None  # structured 或 unstructured
    source_tag: Optional[SourceTag] = None  # 来源标签

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

class UpdateTagRequest(BaseModel):
    source_tag: SourceTag

class UpdateTagResponse(BaseModel):
    message: str
    success: bool

class CategoryListResponse(BaseModel):
    categories: List[str]
    total_count: int

class KnowledgeBaseStatus(BaseModel):
    is_built: bool
    file_count: int
    last_updated: Optional[datetime] = None
    build_progress: Optional[float] = None
    status: str  # "idle", "building", "completed", "error"

class BuildKnowledgeBaseRequest(BaseModel):
    name: str
    categories: List[str]
    file_type: str = "mixed"  # "structured", "unstructured", "mixed"
    
    # 知识库主题
    theme: Optional[str] = None
    
    # 文本处理参数
    chunk_size: int = 1000
    chunk_overlap: int = 200
    chunking_method: str = "recursive"  # "recursive", "sentence", "paragraph"
    
    # 嵌入参数
    embedding_model: str = "dashscope"  # "dashscope", "local"
    vector_dimension: Optional[int] = None  # 自动推断
    
    # 索引参数
    index_type: str = "faiss"
    similarity_metric: str = "cosine"  # "cosine", "euclidean", "dot_product"
    
    # 元数据
    description: Optional[str] = None
    tags: List[str] = []
    
    # 性能参数
    batch_size: int = 32
    max_workers: int = 4

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
    # GraphRAG扩展字段
    current_step: Optional[str] = None  # 当前步骤：preprocessing, vector_building, entity_extraction
    graph_entities_count: Optional[int] = 0
    graph_relationships_count: Optional[int] = 0
