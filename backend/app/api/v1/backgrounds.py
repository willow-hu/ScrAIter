"""
背景图管理API端点
处理项目背景图资源池的管理操作
"""
from typing import List
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse, FileResponse
import os

from app.models.background_models import (
    BackgroundListResponse, BackgroundResponse,
    SetDefaultBackgroundRequest, BackgroundDeleteRequest,
    AssignScenesRequest
)
from app.services.background_service import background_service
from app.core.config import settings

router = APIRouter()


@router.get("/projects/{project_id}/backgrounds", response_model=BackgroundListResponse)
async def get_backgrounds(project_id: str):
    """获取项目的背景图列表"""
    try:
        result = background_service.get_background_list(project_id)
        return BackgroundListResponse(**result)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取背景图列表失败: {str(e)}")


@router.post("/projects/{project_id}/backgrounds/upload")
async def upload_background(
    project_id: str,
    bg_id: str = Form(...),
    file: UploadFile = File(...)
):
    """上传背景图"""
    try:
        if not file.filename:
            raise HTTPException(status_code=400, detail="文件名不能为空")
        
        # 读取文件数据
        file_data = await file.read()
        
        # 检查文件大小
        if len(file_data) > settings.MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="文件大小超过限制")
        
        # 检查文件格式
        allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
        file_ext = os.path.splitext(file.filename)[1].lower()
        if file_ext not in allowed_extensions:
            raise HTTPException(status_code=400, detail=f"不支持的文件格式，仅支持: {', '.join(allowed_extensions)}")
        
        result = background_service.upload_background(project_id, bg_id, file_data, file.filename)
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["message"])
        
        return JSONResponse(
            status_code=201,
            content=result
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"上传背景图失败: {str(e)}")


@router.put("/projects/{project_id}/backgrounds/default")
async def set_default_background(project_id: str, request: SetDefaultBackgroundRequest):
    """设置默认背景图"""
    try:
        result = background_service.set_default_background(project_id, request.bg_id)
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["message"])
        
        return JSONResponse(
            status_code=200,
            content=result
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"设置默认背景图失败: {str(e)}")


@router.put("/projects/{project_id}/backgrounds/{bg_id}/replace")
async def replace_background(
    project_id: str,
    bg_id: str,
    file: UploadFile = File(...)
):
    """替换背景图"""
    try:
        if not file.filename:
            raise HTTPException(status_code=400, detail="文件名不能为空")
        
        # 读取文件数据
        file_data = await file.read()
        
        # 检查文件大小
        if len(file_data) > settings.MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="文件大小超过限制")
        
        # 检查文件格式
        allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
        file_ext = os.path.splitext(file.filename)[1].lower()
        if file_ext not in allowed_extensions:
            raise HTTPException(status_code=400, detail=f"不支持的文件格式，仅支持: {', '.join(allowed_extensions)}")
        
        result = background_service.replace_background(project_id, bg_id, file_data, file.filename)
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["message"])
        
        return JSONResponse(
            status_code=200,
            content=result
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"替换背景图失败: {str(e)}")


@router.delete("/projects/{project_id}/backgrounds/{bg_id}")
async def delete_background(project_id: str, bg_id: str):
    """删除背景图"""
    try:
        result = background_service.delete_background(project_id, bg_id)
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["message"])
        
        return JSONResponse(
            status_code=200,
            content=result
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除背景图失败: {str(e)}")


@router.post("/projects/{project_id}/backgrounds/{bg_id}/assign")
async def assign_scenes(project_id: str, bg_id: str, request: AssignScenesRequest):
    """分配场景"""
    try:
        result = background_service.assign_scenes(project_id, bg_id, request.node_ids)
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["message"])
        
        return JSONResponse(
            status_code=200,
            content=result
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"分配场景失败: {str(e)}")


@router.get("/projects/{project_id}/backgrounds/{bg_id}/nodes")
async def get_background_nodes(project_id: str, bg_id: str):
    """获取使用指定背景图的节点列表"""
    try:
        result = background_service.get_background_nodes(project_id, bg_id)
        return JSONResponse(
            status_code=200,
            content=result
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取节点列表失败: {str(e)}")


@router.get("/projects/{project_id}/backgrounds/{bg_id}/thumbnail")
async def get_background_thumbnail(project_id: str, bg_id: str):
    """获取背景图缩略图"""
    try:
        # 获取背景图信息
        bg_list = background_service.get_background_list(project_id)
        
        bg_info = None
        for bg in bg_list["backgrounds"]:
            if bg["id"] == bg_id:
                bg_info = bg
                break
        
        if not bg_info:
            raise HTTPException(status_code=404, detail=f"背景图 '{bg_id}' 不存在")
        
        # 构建文件路径
        project_dir = os.path.join(settings.PROJECTS_DIR, project_id)
        bg_path = os.path.join(project_dir, "assets", "bg", bg_info["filename"])
        
        if not os.path.exists(bg_path):
            raise HTTPException(status_code=404, detail="背景图文件不存在")
        
        return FileResponse(bg_path)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取缩略图失败: {str(e)}")
