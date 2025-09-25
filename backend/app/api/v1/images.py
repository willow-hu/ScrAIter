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
