"""
RAG生成API端点
"""
from typing import Optional
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse

from app.models.rag_models import (
    GenerateStructureRequest, GenerateNodeContentRequest,
    GeneratedContent, GenerationHistoryResponse, RAGSourcesResponse
)
from app.models.generation_models import (
    OutlineGenerationRequest, OutlineGenerationResponse
)
from app.services.rag_service import rag_service
from app.services.outline_generation_service import outline_generation_service

router = APIRouter()

@router.post("/generate/structure")
async def generate_structure(request: dict):
    """
    生成剧本结构
    输入：知识库名称和全局上下文
    输出：树形结构JSON
    """
    try:
        kb_name = request.get('kb_name')
        global_context = request.get('global_context', {})
        
        if not kb_name or not kb_name.strip():
            raise HTTPException(status_code=400, detail="知识库名称不能为空")
        
        result = rag_service.generate_script_structure(kb_name.strip(), global_context)
        return JSONResponse(
            status_code=200,
            content=result
        )
    except HTTPException:
        raise
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
            kb_name=request.kb_name,
            word_count=request.word_count
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"生成节点内容失败: {str(e)}")

@router.post("/generate/node-content-stream")
async def generate_node_content_stream(request: GenerateNodeContentRequest):
    """
    流式生成节点内容 (Server-Sent Events)
    输入：节点信息、项目全局信息、可选的知识库名称
    输出：流式数据
    """
    try:
        if not request.node_info:
            raise HTTPException(status_code=400, detail="节点信息不能为空")
        
        if not request.global_context:
            raise HTTPException(status_code=400, detail="全局上下文不能为空")
        
        async def generate():
            async for chunk in rag_service.generate_node_content_stream(
                node_info=request.node_info,
                global_context=request.global_context,
                kb_name=request.kb_name,
                word_count=request.word_count
            ):
                yield chunk
        
        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Methods": "*"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"流式生成节点内容失败: {str(e)}")

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

@router.post("/generate/outline", response_model=OutlineGenerationResponse)
async def generate_outline(request: OutlineGenerationRequest):
    """
    生成剧本大纲（基于GraphRAG）
    输入：项目ID和知识库名称
    输出：大纲结构JSON和保存路径
    """
    try:
        if not request.project_id or not request.project_id.strip():
            raise HTTPException(status_code=400, detail="项目ID不能为空")
        
        if not request.kb_name or not request.kb_name.strip():
            raise HTTPException(status_code=400, detail="知识库名称不能为空")
        
        result = outline_generation_service.generate_outline(
            request.project_id.strip(),
            request.kb_name.strip()
        )
        
        return OutlineGenerationResponse(
            success=True,
            message="大纲生成成功",
            structure=result.get("structure"),
            global_context=result.get("global_context")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"生成大纲失败: {str(e)}")
