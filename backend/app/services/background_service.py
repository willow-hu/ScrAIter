"""
背景图管理服务
处理项目中的背景图资源池管理
"""
import os
import shutil
import json
from datetime import datetime
from typing import Dict, Any, Optional, List
from pathlib import Path

from app.core.config import settings


class BackgroundService:
    """背景图管理服务"""
    
    def __init__(self):
        self.projects_dir = settings.PROJECTS_DIR
    
    def _get_project_dir(self, project_id: str) -> str:
        """获取项目目录路径"""
        return os.path.join(self.projects_dir, project_id)
    
    def _get_bg_dir(self, project_id: str) -> str:
        """获取背景图目录路径"""
        bg_dir = os.path.join(self._get_project_dir(project_id), "assets", "bg")
        os.makedirs(bg_dir, exist_ok=True)
        return bg_dir
    
    def _load_project_info(self, project_id: str) -> Dict[str, Any]:
        """加载项目信息"""
        project_dir = self._get_project_dir(project_id)
        info_file = os.path.join(project_dir, "project_info.json")
        
        if not os.path.exists(info_file):
            raise FileNotFoundError(f"项目 {project_id} 不存在")
        
        with open(info_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def _save_project_info(self, project_id: str, project_info: Dict[str, Any]):
        """保存项目信息"""
        project_dir = self._get_project_dir(project_id)
        info_file = os.path.join(project_dir, "project_info.json")
        
        project_info["lastModified"] = datetime.now().isoformat()
        
        with open(info_file, 'w', encoding='utf-8') as f:
            json.dump(project_info, f, ensure_ascii=False, indent=2)
    
    def get_background_list(self, project_id: str) -> Dict[str, Any]:
        """
        获取背景图列表
        
        Args:
            project_id: 项目ID
            
        Returns:
            包含背景图列表和默认背景图的字典
        """
        try:
            project_info = self._load_project_info(project_id)
            
            background_pool = project_info.get("background_pool", [])
            default_background = project_info.get("default_background")
            
            return {
                "backgrounds": background_pool,
                "default_background": default_background,
                "total_count": len(background_pool)
            }
            
        except Exception as e:
            raise Exception(f"获取背景图列表失败: {str(e)}")
    
    def upload_background(self, project_id: str, bg_id: str, file_data: bytes, filename: str) -> Dict[str, Any]:
        """
        上传背景图
        
        Args:
            project_id: 项目ID
            bg_id: 背景图ID（用户自定义）
            file_data: 文件数据
            filename: 文件名
            
        Returns:
            操作结果
        """
        try:
            project_info = self._load_project_info(project_id)
            
            # 初始化background_pool
            if "background_pool" not in project_info:
                project_info["background_pool"] = []
            
            # 检查ID是否已存在
            existing_ids = [bg["id"] for bg in project_info["background_pool"]]
            if bg_id in existing_ids:
                return {
                    "success": False,
                    "message": f"背景图ID '{bg_id}' 已存在，请使用其他ID"
                }
            
            # 保存文件到assets/bg/目录
            bg_dir = self._get_bg_dir(project_id)
            file_path = os.path.join(bg_dir, filename)
            
            with open(file_path, 'wb') as f:
                f.write(file_data)
            
            # 添加到background_pool
            new_background = {
                "id": bg_id,
                "filename": filename,
                "upload_time": datetime.now().isoformat(),
                "used_by": []
            }
            project_info["background_pool"].append(new_background)
            
            # 保存项目信息
            self._save_project_info(project_id, project_info)
            
            return {
                "success": True,
                "message": f"背景图 '{bg_id}' 上传成功",
                "data": new_background
            }
            
        except Exception as e:
            raise Exception(f"上传背景图失败: {str(e)}")
    
    def set_default_background(self, project_id: str, bg_id: Optional[str]) -> Dict[str, Any]:
        """
        设置默认背景图
        
        Args:
            project_id: 项目ID
            bg_id: 背景图ID，如果为None或空字符串则取消默认
            
        Returns:
            操作结果
        """
        try:
            project_info = self._load_project_info(project_id)
            
            # 如果bg_id为空，则取消默认背景图
            if not bg_id:
                project_info["default_background"] = None
                self._save_project_info(project_id, project_info)
                return {
                    "success": True,
                    "message": "已取消默认背景图"
                }
            
            # 检查背景图是否存在
            background_pool = project_info.get("background_pool", [])
            bg_exists = any(bg["id"] == bg_id for bg in background_pool)
            
            if not bg_exists:
                return {
                    "success": False,
                    "message": f"背景图 '{bg_id}' 不存在"
                }
            
            # 设置默认背景图
            project_info["default_background"] = bg_id
            
            # 保存项目信息
            self._save_project_info(project_id, project_info)
            
            return {
                "success": True,
                "message": f"已将 '{bg_id}' 设置为默认背景图"
            }
            
        except Exception as e:
            raise Exception(f"设置默认背景图失败: {str(e)}")
    
    def replace_background(self, project_id: str, bg_id: str, file_data: bytes, new_filename: str) -> Dict[str, Any]:
        """
        替换背景图
        
        Args:
            project_id: 项目ID
            bg_id: 背景图ID
            file_data: 新文件数据
            new_filename: 新文件名
            
        Returns:
            操作结果
        """
        try:
            project_info = self._load_project_info(project_id)
            
            # 查找背景图
            background_pool = project_info.get("background_pool", [])
            bg_index = -1
            old_filename = None
            
            for i, bg in enumerate(background_pool):
                if bg["id"] == bg_id:
                    bg_index = i
                    old_filename = bg["filename"]
                    break
            
            if bg_index == -1:
                return {
                    "success": False,
                    "message": f"背景图 '{bg_id}' 不存在"
                }
            
            # 保存新文件
            bg_dir = self._get_bg_dir(project_id)
            new_file_path = os.path.join(bg_dir, new_filename)
            
            with open(new_file_path, 'wb') as f:
                f.write(file_data)
            
            # 删除旧文件
            if old_filename and old_filename != new_filename:
                old_file_path = os.path.join(bg_dir, old_filename)
                if os.path.exists(old_file_path):
                    os.remove(old_file_path)
            
            # 更新background_pool
            background_pool[bg_index]["filename"] = new_filename
            background_pool[bg_index]["upload_time"] = datetime.now().isoformat()
            
            # 保存项目信息
            self._save_project_info(project_id, project_info)
            
            return {
                "success": True,
                "message": f"背景图 '{bg_id}' 替换成功"
            }
            
        except Exception as e:
            raise Exception(f"替换背景图失败: {str(e)}")
    
    def delete_background(self, project_id: str, bg_id: str) -> Dict[str, Any]:
        """
        删除背景图
        
        Args:
            project_id: 项目ID
            bg_id: 背景图ID
            
        Returns:
            操作结果
        """
        try:
            project_info = self._load_project_info(project_id)
            
            # 检查是否为默认背景图
            default_background = project_info.get("default_background")
            if default_background == bg_id:
                return {
                    "success": False,
                    "message": f"无法删除默认背景图 '{bg_id}'，请先设置其他背景图为默认"
                }
            
            # 查找并删除背景图
            background_pool = project_info.get("background_pool", [])
            bg_index = -1
            filename = None
            
            for i, bg in enumerate(background_pool):
                if bg["id"] == bg_id:
                    bg_index = i
                    filename = bg["filename"]
                    break
            
            if bg_index == -1:
                return {
                    "success": False,
                    "message": f"背景图 '{bg_id}' 不存在"
                }
            
            # 从pool中删除
            background_pool.pop(bg_index)
            
            # 删除文件
            if filename:
                bg_dir = self._get_bg_dir(project_id)
                file_path = os.path.join(bg_dir, filename)
                if os.path.exists(file_path):
                    os.remove(file_path)
            
            # 保存项目信息
            self._save_project_info(project_id, project_info)
            
            return {
                "success": True,
                "message": f"背景图 '{bg_id}' 删除成功"
            }
            
        except Exception as e:
            raise Exception(f"删除背景图失败: {str(e)}")
    
    def assign_scenes(self, project_id: str, bg_id: str, node_ids: List) -> Dict[str, Any]:
        """
        分配场景（设置哪些节点使用该背景图）
        
        Args:
            project_id: 项目ID
            bg_id: 背景图ID
            node_ids: 节点ID列表
            
        Returns:
            操作结果
        """
        try:
            project_info = self._load_project_info(project_id)
            
            # 查找背景图
            background_pool = project_info.get("background_pool", [])
            bg_index = -1
            
            for i, bg in enumerate(background_pool):
                if bg["id"] == bg_id:
                    bg_index = i
                    break
            
            if bg_index == -1:
                return {
                    "success": False,
                    "message": f"背景图 '{bg_id}' 不存在"
                }
            
            # 将传入的 node_ids 强制转换为整数列表后更新 used_by 字段
            processed_ids: List[int] = []
            for nid in node_ids or []:
                try:
                    processed_ids.append(int(nid))
                except Exception:
                    # 忽略无法转换的值
                    continue

            background_pool[bg_index]["used_by"] = processed_ids
            
            # 保存项目信息
            self._save_project_info(project_id, project_info)
            
            return {
                "success": True,
                "message": f"已为背景图 '{bg_id}' 分配 {len(processed_ids)} 个场景",
                "data": {
                    "bg_id": bg_id,
                    "node_ids": processed_ids
                }
            }
            
        except Exception as e:
            raise Exception(f"分配场景失败: {str(e)}")
    
    def get_background_nodes(self, project_id: str, bg_id: str) -> Dict[str, Any]:
        """
        获取使用指定背景图的节点列表
        
        Args:
            project_id: 项目ID
            bg_id: 背景图ID
            
        Returns:
            节点列表
        """
        try:
            project_info = self._load_project_info(project_id)
            
            # 查找背景图
            background_pool = project_info.get("background_pool", [])
            
            for bg in background_pool:
                if bg["id"] == bg_id:
                    return {
                        "bg_id": bg_id,
                        "node_ids": bg.get("used_by", [])
                    }
            
            return {
                "bg_id": bg_id,
                "node_ids": []
            }
            
        except Exception as e:
            raise Exception(f"获取背景图节点列表失败: {str(e)}")


# 创建全局实例
background_service = BackgroundService()
