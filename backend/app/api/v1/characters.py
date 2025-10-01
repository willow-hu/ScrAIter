"""
角色管理API端点
处理项目中的角色列表管理
"""
from typing import List, Optional
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.services.script_file_service import script_file_service

router = APIRouter()

class Character(BaseModel):
    """角色模型"""
    name: str
    description: str
    tone: str
    avatar: str = ""

class CharacterCreateRequest(BaseModel):
    """创建角色请求"""
    name: str
    description: str
    tone: str
    avatar: str = ""

class CharacterUpdateRequest(BaseModel):
    """更新角色请求"""
    name: Optional[str] = None
    description: Optional[str] = None
    tone: Optional[str] = None
    avatar: Optional[str] = None

class CharacterListResponse(BaseModel):
    """角色列表响应"""
    characters: List[Character]
    total_count: int

@router.get("/projects/{project_name}/characters", response_model=CharacterListResponse)
async def get_characters(project_name: str):
    """获取项目的角色列表"""
    try:
        # 加载项目脚本数据
        script_data = script_file_service.load_script_content(project_name)
        
        if not script_data:
            # 如果项目不存在，返回空列表
            return CharacterListResponse(characters=[], total_count=0)
        
        # 获取角色列表
        character_list = script_data.get("global_context", {}).get("character_list", [])
        
        # 转换为Character模型
        characters = [Character(**char) for char in character_list]
        
        return CharacterListResponse(
            characters=characters,
            total_count=len(characters)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取角色列表失败: {str(e)}")

@router.post("/projects/{project_name}/characters")
async def add_character(project_name: str, request: CharacterCreateRequest):
    """添加新角色"""
    try:
        # 加载项目脚本数据
        script_data = script_file_service.load_script_content(project_name)
        
        if not script_data:
            raise HTTPException(status_code=404, detail=f"项目 '{project_name}' 不存在")
        
        # 获取当前角色列表
        global_context = script_data.get("global_context", {})
        character_list = global_context.get("character_list", [])
        
        # 检查角色名称是否已存在
        existing_names = [char.get("name", "") for char in character_list]
        if request.name in existing_names:
            raise HTTPException(status_code=400, detail=f"角色名称 '{request.name}' 已存在")
        
        # 添加新角色
        new_character = {
            "name": request.name,
            "description": request.description,
            "tone": request.tone,
            "avatar": request.avatar
        }
        character_list.append(new_character)
        
        # 更新数据
        global_context["character_list"] = character_list
        script_data["global_context"] = global_context
        
        # 保存到文件
        success = script_file_service.save_script_content(project_name, script_data)
        if not success:
            raise HTTPException(status_code=500, detail="保存角色数据失败")
        
        return JSONResponse(
            status_code=201,
            content={
                "message": f"角色 '{request.name}' 添加成功",
                "character": new_character,
                "success": True
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"添加角色失败: {str(e)}")

@router.put("/projects/{project_name}/characters/{character_name}")
async def update_character(project_name: str, character_name: str, request: CharacterUpdateRequest):
    """更新角色信息"""
    try:
        # 加载项目脚本数据
        script_data = script_file_service.load_script_content(project_name)
        
        if not script_data:
            raise HTTPException(status_code=404, detail=f"项目 '{project_name}' 不存在")
        
        # 获取当前角色列表
        global_context = script_data.get("global_context", {})
        character_list = global_context.get("character_list", [])
        
        # 查找要更新的角色
        character_index = -1
        for i, char in enumerate(character_list):
            if char.get("name") == character_name:
                character_index = i
                break
        
        if character_index == -1:
            raise HTTPException(status_code=404, detail=f"角色 '{character_name}' 不存在")
        
        # 如果要更新名称，检查新名称是否已存在
        if request.name and request.name != character_name:
            existing_names = [char.get("name", "") for i, char in enumerate(character_list) if i != character_index]
            if request.name in existing_names:
                raise HTTPException(status_code=400, detail=f"角色名称 '{request.name}' 已存在")
        
        # 更新角色信息
        character = character_list[character_index]
        if request.name is not None:
            character["name"] = request.name
        if request.description is not None:
            character["description"] = request.description
        if request.tone is not None:
            character["tone"] = request.tone
        if request.avatar is not None:
            character["avatar"] = request.avatar
        
        # 更新数据
        character_list[character_index] = character
        global_context["character_list"] = character_list
        script_data["global_context"] = global_context
        
        # 保存到文件
        success = script_file_service.save_script_content(project_name, script_data)
        if not success:
            raise HTTPException(status_code=500, detail="保存角色数据失败")
        
        return JSONResponse(
            status_code=200,
            content={
                "message": f"角色 '{character['name']}' 更新成功",
                "character": character,
                "success": True
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"更新角色失败: {str(e)}")

@router.delete("/projects/{project_name}/characters/{character_name}")
async def delete_character(project_name: str, character_name: str):
    """删除角色"""
    try:
        # 加载项目脚本数据
        script_data = script_file_service.load_script_content(project_name)
        
        if not script_data:
            raise HTTPException(status_code=404, detail=f"项目 '{project_name}' 不存在")
        
        # 获取当前角色列表
        global_context = script_data.get("global_context", {})
        character_list = global_context.get("character_list", [])
        
        # 查找要删除的角色
        character_index = -1
        for i, char in enumerate(character_list):
            if char.get("name") == character_name:
                character_index = i
                break
        
        if character_index == -1:
            raise HTTPException(status_code=404, detail=f"角色 '{character_name}' 不存在")
        
        # 删除角色
        deleted_character = character_list.pop(character_index)
        
        # 更新数据
        global_context["character_list"] = character_list
        script_data["global_context"] = global_context
        
        # 保存到文件
        success = script_file_service.save_script_content(project_name, script_data)
        if not success:
            raise HTTPException(status_code=500, detail="保存角色数据失败")
        
        return JSONResponse(
            status_code=200,
            content={
                "message": f"角色 '{character_name}' 删除成功",
                "deleted_character": deleted_character,
                "success": True
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除角色失败: {str(e)}")
