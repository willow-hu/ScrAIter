"""
GraphRAG数据模型
定义图相关的数据结构和API模型
"""
from typing import List, Optional, Any
from pydantic import BaseModel
from datetime import datetime

class GraphEntity(BaseModel):
    """图实体数据结构"""
    id: str
    title: str
    type: str  # person, organization, location, event, etc.
    description: str
    text_unit_ids: List[str]
    degree: Optional[int] = None  # 节点度数

class GraphRelationship(BaseModel):
    """图关系数据结构"""
    id: str
    source: str  # 源实体title或id
    target: str  # 目标实体title或id
    description: str
    weight: float
    text_unit_ids: List[str]

class GraphBuildStatus(BaseModel):
    """图构建状态"""
    task_id: str
    current_step: str  # 当前步骤：preprocessing, vector_building, entity_extraction
    step_progress: float  # 当前步骤进度 0-100
    overall_progress: float  # 总体进度 0-100
    entities_count: int = 0
    relationships_count: int = 0
    status: str  # running, completed, error
    error_message: Optional[str] = None

class GraphEntitiesResponse(BaseModel):
    """实体查询响应"""
    entities: List[GraphEntity]
    total: int
    page: int
    page_size: int

class GraphRelationshipsResponse(BaseModel):
    """关系查询响应"""
    relationships: List[GraphRelationship]
    total: int

class GraphStatistics(BaseModel):
    """图统计信息"""
    entities_count: int
    relationships_count: int
    avg_entity_degree: float
    graph_density: float
    created_time: Optional[datetime] = None
    last_updated: Optional[datetime] = None