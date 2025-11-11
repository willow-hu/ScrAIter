"""
项目管理相关的数据模型
"""
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

class ProjectCreate(BaseModel):
    """创建项目请求"""
    name: str = Field(..., description="项目名称")
    knowledgeBaseId: str = Field(..., description="关联的知识库ID")
    description: str = Field(default="", description="项目描述")

class ProjectUpdate(BaseModel):
    """更新项目请求"""
    name: Optional[str] = Field(None, description="项目名称")
    description: Optional[str] = Field(None, description="项目描述")
    thumbnail: Optional[str] = Field(None, description="缩略图路径")
    character_list: Optional[List[Dict[str, Any]]] = Field(None, description="角色列表")
    npc_portraits: Optional[Dict[str, str]] = Field(None, description="NPC立绘映射")

class ProjectDuplicate(BaseModel):
    """复制项目请求"""
    newName: str = Field(..., description="新项目名称")

class ProjectInfo(BaseModel):
    """项目信息"""
    id: str = Field(..., description="项目ID")
    name: str = Field(..., description="项目名称")
    knowledgeBaseId: str = Field(..., description="关联的知识库ID")
    description: str = Field(default="", description="项目描述")
    createdTime: str = Field(..., description="创建时间")
    lastModified: str = Field(..., description="最后修改时间")
    thumbnail: str = Field(default="", description="缩略图路径")
    version: int = Field(default=1, description="版本号")

class ProjectList(BaseModel):
    """项目列表响应"""
    projects: List[ProjectInfo]
    total_count: int

class ScriptData(BaseModel):
    """脚本数据"""
    global_context: dict = Field(..., description="全局上下文")
    structure: list = Field(..., description="树结构")
