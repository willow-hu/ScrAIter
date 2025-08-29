"""
知识库管理API端点
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from app.models.file_models import KnowledgeBaseStatus, BuildTaskResponse, BuildStatus
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
async def build_knowledge_base():
    """
    构建/重建知识库
    返回：构建任务ID，可用于查询进度
    """
    try:
        result = await knowledge_base_service.build_knowledge_base()
        return BuildTaskResponse(
            task_id=result["task_id"],
            message=result["message"]
        )
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
