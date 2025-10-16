"""
知识库管理API端点
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from app.models.file_models import KnowledgeBaseStatus, BuildTaskResponse, BuildStatus, BuildKnowledgeBaseRequest
from app.services.knowledge_base_service import knowledge_base_service

router = APIRouter()

@router.get("/knowledge-base/status", response_model=KnowledgeBaseStatus)
async def get_knowledge_base_status():
    """
    获取知识库状态
    返回：是否已构建、文件数量、最后更新时间、构建进度
    """
    try:
        return knowledge_base_service.get_knowledge_base_status()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取知识库状态失败: {str(e)}")

@router.post("/knowledge-base/build", response_model=BuildTaskResponse)
async def build_knowledge_base(request: BuildKnowledgeBaseRequest):
    """
    构建/重建知识库
    输入：知识库名称、选择的类目、文件类型
    返回：构建任务ID，可用于查询进度
    """
    try:
        if not request.name or not request.name.strip():
            raise HTTPException(status_code=400, detail="知识库名称不能为空")
        
        if not request.categories:
            raise HTTPException(status_code=400, detail="请选择至少一个类目")
        
        result = await knowledge_base_service.build_knowledge_base(
            name=request.name.strip(),
            categories=request.categories,
            file_type=request.file_type,
            # 文本处理参数
            chunk_size=request.chunk_size,
            chunk_overlap=request.chunk_overlap,
            chunking_method=request.chunking_method,
            # 嵌入参数
            embedding_model=request.embedding_model,
            vector_dimension=request.vector_dimension,
            # 索引参数
            index_type=request.index_type,
            similarity_metric=request.similarity_metric,
            # 元数据
            description=request.description,
            tags=request.tags,
            # 性能参数
            batch_size=request.batch_size,
            max_workers=request.max_workers
        )
        
        return BuildTaskResponse(
            task_id=result["task_id"],
            message=result["message"]
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"启动知识库构建失败: {str(e)}")

@router.get("/knowledge-base/build-status/{task_id}", response_model=BuildStatus)
async def get_build_status(task_id: str):
    """
    获取构建进度
    返回：进度百分比、当前处理文件、预计完成时间
    """
    try:
        build_status = knowledge_base_service.get_build_status(task_id)
        
        if not build_status:
            raise HTTPException(status_code=404, detail="构建任务不存在")
        
        return build_status
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取构建状态失败: {str(e)}")

@router.get("/knowledge-base/list")
async def list_knowledge_bases():
    """
    获取已构建的知识库列表
    """
    try:
        result = knowledge_base_service.list_knowledge_bases()
        return JSONResponse(
            status_code=200,
            content=result
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取知识库列表失败: {str(e)}")

@router.delete("/knowledge-base/{kb_name}")
async def delete_knowledge_base(kb_name: str):
    """
    删除知识库
    """
    try:
        if not kb_name or not kb_name.strip():
            raise HTTPException(status_code=400, detail="知识库名称不能为空")
        
        result = knowledge_base_service.delete_knowledge_base(kb_name.strip())
        
        if not result["success"]:
            raise HTTPException(status_code=404, detail=result["message"])
        
        return JSONResponse(
            status_code=200,
            content=result
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除知识库失败: {str(e)}")

@router.post("/knowledge-base/check-tags")
async def check_files_tags(request: dict):
    """
    检查指定类目中的文件是否都有标签
    """
    try:
        categories = request.get("categories", [])
        if not categories:
            raise HTTPException(status_code=400, detail="请提供类目列表")
        
        result = knowledge_base_service.check_files_have_tags(categories)
        return JSONResponse(
            status_code=200,
            content=result
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"检查文件标签失败: {str(e)}")

@router.post("/knowledge-base/{kb_name}/build-graph", response_model=BuildTaskResponse)
async def build_knowledge_graph(kb_name: str):
    """
    为指定知识库构建知识图谱
    """
    try:
        if not kb_name or not kb_name.strip():
            raise HTTPException(status_code=400, detail="知识库名称不能为空")
        
        result = await knowledge_base_service.build_knowledge_graph(kb_name.strip())
        
        return BuildTaskResponse(
            task_id=result["task_id"],
            message=result["message"]
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"启动知识图谱构建失败: {str(e)}")

@router.get("/knowledge-base/{kb_name}/graph-status/{task_id}", response_model=BuildStatus)
async def get_graph_build_status(kb_name: str, task_id: str):
    """
    获取知识图谱构建进度
    """
    try:
        build_status = knowledge_base_service.get_build_status(task_id)
        
        if not build_status:
            raise HTTPException(status_code=404, detail="构建任务不存在")
        
        return build_status
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取图谱构建状态失败: {str(e)}")
