"""
RAG生成相关的数据模型
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime

class GenerateStructureRequest(BaseModel):
    """生成剧本结构请求"""
    # 使用系统默认设置，无需用户输入
    pass

class GenerateNodeContentRequest(BaseModel):
    """生成节点内容请求"""
    node_info: Dict[str, Any]  # 节点信息
    global_context: Dict[str, Any]  # 项目全局信息

class GeneratedContent(BaseModel):
    """生成的内容"""
    content: str
    generation_id: str
    timestamp: datetime
    node_name: Optional[str] = None

class GenerationHistory(BaseModel):
    """生成历史记录"""
    generation_id: str
    timestamp: datetime
    generation_type: str  # "structure" 或 "node_content"
    node_name: Optional[str] = None
    success: bool
    error_message: Optional[str] = None

class GenerationHistoryResponse(BaseModel):
    """生成历史响应"""
    history: List[GenerationHistory]
    total_count: int

class RAGSource(BaseModel):
    """RAG检索片段"""
    text: str
    score: float
    source_file: Optional[str] = None

class RAGSourcesResponse(BaseModel):
    """RAG检索片段响应"""
    generation_id: str
    sources: List[RAGSource]
    query: str
