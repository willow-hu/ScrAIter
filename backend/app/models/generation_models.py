"""
大纲生成相关的数据模型
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

class OutlineGenerationRequest(BaseModel):
    """大纲生成请求"""
    project_id: str
    kb_name: str
    user_requirements: Optional[str] = ""
    
class OutlineGenerationResponse(BaseModel):
    """大纲生成响应"""
    success: bool
    message: str
    outline_path: Optional[str] = None
    structure: Optional[List[Dict[str, Any]]] = None
