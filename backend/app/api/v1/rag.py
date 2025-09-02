"""
RAG生成API端点
"""
from typing import Optional
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from app.models.rag_models import (
    GenerateStructureRequest, GenerateNodeContentRequest,
    GeneratedContent, GenerationHistoryResponse, RAGSourcesResponse
)
from app.services.rag_service import rag_service

router = APIRouter()

@router.post("/generate/structure")
async def generate_structure(project_name: Optional[str] = None):
    """
    生成剧本结构
    输入：可选的项目名称
    输出：树形结构JSON
    """
    try:
        result = rag_service.generate_script_structure(project_name)
        return JSONResponse(
            status_code=200,
            content=result
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=f"配置文件未找到: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"生成剧本结构失败: {str(e)}")

@router.post("/generate/node-content", response_model=GeneratedContent)
async def generate_node_content(request: GenerateNodeContentRequest):
    """
    生成节点内容
    输入：节点信息、项目全局信息、可选的知识库名称
    输出：该节点的详细内容
    """
    try:
        if not request.node_info:
            raise HTTPException(status_code=400, detail="节点信息不能为空")
        
        if not request.global_context:
            raise HTTPException(status_code=400, detail="全局上下文不能为空")
        
        result = rag_service.generate_node_content(
            node_info=request.node_info,
            global_context=request.global_context,
            kb_name=request.kb_name
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"生成节点内容失败: {str(e)}")

@router.get("/generate/history", response_model=GenerationHistoryResponse)
async def get_generation_history():
    """
    获取生成历史
    返回：历史生成记录、时间戳
    """
    try:
        return rag_service.get_generation_history()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取生成历史失败: {str(e)}")

@router.get("/rag/sources/{generation_id}", response_model=RAGSourcesResponse)
async def get_rag_sources(generation_id: str):
    """
    获取RAG检索片段
    返回：本次生成使用的知识库片段
    """
    try:
        result = rag_service.get_rag_sources(generation_id)
        
        if not result:
            raise HTTPException(status_code=404, detail="未找到指定生成ID的RAG检索片段")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取RAG检索片段失败: {str(e)}")
