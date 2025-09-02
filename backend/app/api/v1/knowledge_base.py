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
            file_type=request.file_type
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
