"""
图片管理API端点
"""
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from typing import Optional

from app.models.image_models import ImageListResponse, DeleteImageResponse, ImageUploadResponse
from app.services.image_service import image_service

router = APIRouter()

@router.post("/images/upload", response_model=ImageUploadResponse)
async def upload_image(
    kb_name: str,
    file: UploadFile = File(...)
):
    """
    上传图片到指定知识库
    """
    try:
        if not kb_name or not kb_name.strip():
            raise HTTPException(status_code=400, detail="知识库名称不能为空")
        
        result = await image_service.upload_image(kb_name.strip(), file)
        
        if not result.success:
            raise HTTPException(status_code=400, detail=result.message)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"上传图片失败: {str(e)}")

@router.get("/images/list/{kb_name}", response_model=ImageListResponse)
async def list_images(kb_name: str):
    """
    获取指定知识库的图片列表
    """
    try:
        if not kb_name or not kb_name.strip():
            raise HTTPException(status_code=400, detail="知识库名称不能为空")
        
        result = image_service.list_images(kb_name.strip())
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取图片列表失败: {str(e)}")

@router.get("/images/{kb_name}/{filename}")
async def get_image(kb_name: str, filename: str):
    """
    获取图片文件
    """
    try:
        if not kb_name or not kb_name.strip():
            raise HTTPException(status_code=400, detail="知识库名称不能为空")
        
        if not filename or not filename.strip():
            raise HTTPException(status_code=400, detail="文件名不能为空")
        
        file_path = image_service.get_image_path(kb_name.strip(), filename.strip())
        
        if not file_path:
            raise HTTPException(status_code=404, detail="图片文件不存在")
        
        return FileResponse(
            file_path,
            media_type="image/*",
            filename=filename
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取图片失败: {str(e)}")

@router.delete("/images/{kb_name}/{filename}", response_model=DeleteImageResponse)
async def delete_image(kb_name: str, filename: str):
    """
    删除图片文件
    """
    try:
        if not kb_name or not kb_name.strip():
            raise HTTPException(status_code=400, detail="知识库名称不能为空")
        
        if not filename or not filename.strip():
            raise HTTPException(status_code=400, detail="文件名不能为空")
        
        result = image_service.delete_image(kb_name.strip(), filename.strip())
        
        if not result.success:
            raise HTTPException(status_code=400, detail=result.message)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除图片失败: {str(e)}")

# ========== NPC立绘管理API ==========

@router.post("/projects/{project_id}/assets/npc/upload", response_model=ImageUploadResponse)
async def upload_npc_image(
    project_id: str,
    file: UploadFile = File(...)
):
    """上传NPC立绘"""
    try:
        if not project_id or not project_id.strip():
            raise HTTPException(status_code=400, detail="项目ID不能为空")
        
        result = await image_service.upload_npc_image(project_id.strip(), file)
        
        if not result.success:
            raise HTTPException(status_code=400, detail=result.message)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"上传NPC立绘失败: {str(e)}")

@router.get("/projects/{project_id}/assets/npc/list", response_model=ImageListResponse)
async def list_npc_images(project_id: str):
    """获取NPC立绘列表"""
    try:
        if not project_id or not project_id.strip():
            raise HTTPException(status_code=400, detail="项目ID不能为空")
        
        result = image_service.list_npc_images(project_id.strip())
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取NPC立绘列表失败: {str(e)}")

@router.get("/projects/{project_id}/assets/npc/{filename}")
async def get_npc_image(project_id: str, filename: str):
    """获取NPC立绘文件"""
    try:
        if not project_id or not project_id.strip():
            raise HTTPException(status_code=400, detail="项目ID不能为空")
        
        if not filename or not filename.strip():
            raise HTTPException(status_code=400, detail="文件名不能为空")
        
        file_path = image_service.get_npc_image_path(project_id.strip(), filename.strip())
        
        if not file_path:
            raise HTTPException(status_code=404, detail="NPC立绘文件不存在")
        
        return FileResponse(
            file_path,
            media_type="image/*",
            filename=filename
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取NPC立绘失败: {str(e)}")

@router.delete("/projects/{project_id}/assets/npc/{filename}", response_model=DeleteImageResponse)
async def delete_npc_image(project_id: str, filename: str):
    """删除NPC立绘"""
    try:
        if not project_id or not project_id.strip():
            raise HTTPException(status_code=400, detail="项目ID不能为空")
        
        if not filename or not filename.strip():
            raise HTTPException(status_code=400, detail="文件名不能为空")
        
        result = image_service.delete_npc_image(project_id.strip(), filename.strip())
        
        if not result.success:
            raise HTTPException(status_code=400, detail=result.message)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除NPC立绘失败: {str(e)}")

# ========== 背景图片管理API ==========

@router.post("/projects/{project_id}/assets/bg/upload", response_model=ImageUploadResponse)
async def upload_bg_image(
    project_id: str,
    file: UploadFile = File(...)
):
    """上传背景图片"""
    try:
        if not project_id or not project_id.strip():
            raise HTTPException(status_code=400, detail="项目ID不能为空")
        
        result = await image_service.upload_bg_image(project_id.strip(), file)
        
        if not result.success:
            raise HTTPException(status_code=400, detail=result.message)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"上传背景图片失败: {str(e)}")

@router.get("/projects/{project_id}/assets/bg/list", response_model=ImageListResponse)
async def list_bg_images(project_id: str):
    """获取背景图片列表"""
    try:
        if not project_id or not project_id.strip():
            raise HTTPException(status_code=400, detail="项目ID不能为空")
        
        result = image_service.list_bg_images(project_id.strip())
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取背景图片列表失败: {str(e)}")

@router.get("/projects/{project_id}/assets/bg/{filename}")
async def get_bg_image(project_id: str, filename: str):
    """获取背景图片文件"""
    try:
        if not project_id or not project_id.strip():
            raise HTTPException(status_code=400, detail="项目ID不能为空")
        
        if not filename or not filename.strip():
            raise HTTPException(status_code=400, detail="文件名不能为空")
        
        file_path = image_service.get_bg_image_path(project_id.strip(), filename.strip())
        
        if not file_path:
            raise HTTPException(status_code=404, detail="背景图片文件不存在")
        
        return FileResponse(
            file_path,
            media_type="image/*",
            filename=filename
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取背景图片失败: {str(e)}")

@router.delete("/projects/{project_id}/assets/bg/{filename}", response_model=DeleteImageResponse)
async def delete_bg_image(project_id: str, filename: str):
    """删除背景图片"""
    try:
        if not project_id or not project_id.strip():
            raise HTTPException(status_code=400, detail="项目ID不能为空")
        
        if not filename or not filename.strip():
            raise HTTPException(status_code=400, detail="文件名不能为空")
        
        result = image_service.delete_bg_image(project_id.strip(), filename.strip())
        
        if not result.success:
            raise HTTPException(status_code=400, detail=result.message)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除背景图片失败: {str(e)}")
