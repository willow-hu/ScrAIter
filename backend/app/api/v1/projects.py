"""
项目管理API端点
处理剧本项目的创建、查询、更新、删除等操作
"""
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse

from app.models.project_models import (
    ProjectCreate, ProjectUpdate, ProjectDuplicate,
    ProjectInfo, ProjectList, ScriptData
)
from app.services.project_service import project_service

router = APIRouter()

@router.get("/projects", response_model=ProjectList)
async def list_projects():
    """列出所有项目"""
    try:
        projects = project_service.list_projects()
        return ProjectList(
            projects=[ProjectInfo(**project) for project in projects],
            total_count=len(projects)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取项目列表失败: {str(e)}")

@router.post("/projects", response_model=ProjectInfo, status_code=201)
async def create_project(request: ProjectCreate):
    """创建新项目"""
    try:
        if not request.name or not request.name.strip():
            raise HTTPException(status_code=400, detail="项目名称不能为空")
        
        if not request.knowledgeBaseId or not request.knowledgeBaseId.strip():
            raise HTTPException(status_code=400, detail="知识库ID不能为空")
        
        project_info = project_service.create_project(
            name=request.name.strip(),
            kb_id=request.knowledgeBaseId.strip(),
            description=request.description
        )
        
        return ProjectInfo(**project_info)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建项目失败: {str(e)}")

@router.get("/projects/{project_id}", response_model=ProjectInfo)
async def get_project(project_id: str):
    """获取项目详情"""
    try:
        project = project_service.get_project(project_id)
        if not project:
            raise HTTPException(status_code=404, detail=f"项目 '{project_id}' 不存在")
        
        return ProjectInfo(**project)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取项目详情失败: {str(e)}")

@router.put("/projects/{project_id}", response_model=ProjectInfo)
async def update_project(project_id: str, request: ProjectUpdate):
    """更新项目信息"""
    try:
        # 构建更新数据字典
        update_data = {}
        if request.name is not None:
            update_data["name"] = request.name
        if request.description is not None:
            update_data["description"] = request.description
        if request.thumbnail is not None:
            update_data["thumbnail"] = request.thumbnail
        if request.character_list is not None:
            update_data["character_list"] = request.character_list
        
        if not update_data:
            raise HTTPException(status_code=400, detail="没有提供要更新的数据")
        
        project = project_service.update_project(project_id, update_data)
        if not project:
            raise HTTPException(status_code=404, detail=f"项目 '{project_id}' 不存在")
        
        return ProjectInfo(**project)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"更新项目失败: {str(e)}")

@router.delete("/projects/{project_id}")
async def delete_project(project_id: str):
    """删除项目"""
    try:
        success = project_service.delete_project(project_id)
        if not success:
            raise HTTPException(status_code=404, detail=f"项目 '{project_id}' 不存在")
        
        return JSONResponse(
            status_code=200,
            content={
                "message": f"项目 '{project_id}' 删除成功",
                "success": True
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除项目失败: {str(e)}")

@router.post("/projects/{project_id}/duplicate", response_model=ProjectInfo, status_code=201)
async def duplicate_project(project_id: str, request: ProjectDuplicate):
    """复制项目"""
    try:
        if not request.newName or not request.newName.strip():
            raise HTTPException(status_code=400, detail="新项目名称不能为空")
        
        new_project = project_service.duplicate_project(project_id, request.newName.strip())
        if not new_project:
            raise HTTPException(status_code=404, detail=f"源项目 '{project_id}' 不存在")
        
        return ProjectInfo(**new_project)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"复制项目失败: {str(e)}")

@router.get("/projects/{project_id}/script")
async def get_project_script(project_id: str):
    """获取项目的脚本内容"""
    try:
        script_data = project_service.load_script(project_id)
        if not script_data:
            raise HTTPException(status_code=404, detail=f"项目 '{project_id}' 的脚本文件不存在")
        
        return JSONResponse(
            status_code=200,
            content=script_data
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取脚本内容失败: {str(e)}")

@router.post("/projects/{project_id}/script")
async def save_project_script(project_id: str, script_data: dict):
    """保存项目的脚本内容"""
    try:
        # 验证项目是否存在
        project = project_service.get_project(project_id)
        if not project:
            raise HTTPException(status_code=404, detail=f"项目 '{project_id}' 不存在")
        
        success = project_service.save_script(project_id, script_data)
        if not success:
            raise HTTPException(status_code=500, detail="保存脚本内容失败")
        
        return JSONResponse(
            status_code=200,
            content={
                "message": f"项目 '{project_id}' 的脚本内容保存成功",
                "success": True
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"保存脚本内容失败: {str(e)}")

@router.get("/projects/by-kb/{kb_id}", response_model=ProjectList)
async def get_projects_by_kb(kb_id: str):
    """获取某知识库下的所有项目"""
    try:
        projects = project_service.get_projects_by_kb(kb_id)
        return ProjectList(
            projects=[ProjectInfo(**project) for project in projects],
            total_count=len(projects)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取知识库项目失败: {str(e)}")
