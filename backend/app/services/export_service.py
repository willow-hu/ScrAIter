"""
导出服务
"""
import os
import json
import zipfile
import tempfile
import shutil
from typing import Set, List, Dict, Any, Optional
from datetime import datetime

from app.core.config import settings
from app.services.script_format_convert import authoring_to_game
from app.services.project_service import project_service
from app.models.export_models import ExportFormat, ExportResponse

class ExportService:
    def __init__(self):
        self.projects_path = settings.PROJECTS_DIR
        self.temp_dir = tempfile.gettempdir()
    
    def extract_used_images(self, script_data: Dict[str, Any]) -> Set[str]:
        """从脚本数据中提取使用的图片文件名"""
        used_images = set()
        
        def extract_from_node(node):
            """递归提取节点中的背景图"""
            if isinstance(node, dict):
                # 检查当前节点的背景图
                if 'background_image' in node and node['background_image']:
                    used_images.add(node['background_image'])
                
                # 递归检查子节点
                if 'child_ids' in node and isinstance(node['child_ids'], list):
                    for child_id in node['child_ids']:
                        # 在structure中查找对应的子节点
                        if 'structure' in script_data:
                            for struct_node in script_data['structure']:
                                if struct_node.get('id') == child_id:
                                    extract_from_node(struct_node)
                                    break
                
                # 如果有children字段（旧格式兼容）
                if 'children' in node and isinstance(node['children'], list):
                    for child in node['children']:
                        extract_from_node(child)
        
        # 提取structure中的所有节点
        if 'structure' in script_data and isinstance(script_data['structure'], list):
            for node in script_data['structure']:
                extract_from_node(node)
        
        return used_images
    
    def load_script_data(self, project_id: str) -> Optional[Dict[str, Any]]:
        """加载脚本数据"""
        return project_service.load_script(project_id)
    
    def get_available_images(self, project_id: str) -> List[str]:
        """获取项目中所有可用的图片"""
        images_dir = os.path.join(self.projects_path, project_id, "assets")
        
        if not os.path.exists(images_dir):
            return []
        
        images = []
        for filename in os.listdir(images_dir):
            file_path = os.path.join(images_dir, filename)
            if os.path.isfile(file_path) and filename.lower().endswith(('.jpg', '.jpeg', '.png')):
                images.append(filename)
        
        return images
    
    def create_export_package(self, project_id: str, export_format: ExportFormat, include_images: bool = True) -> ExportResponse:
        """创建导出包"""
        try:
            # 获取项目信息
            project_info = project_service.get_project(project_id)
            if not project_info:
                return ExportResponse(
                    success=False,
                    message="项目不存在"
                )
            
            project_name = project_info.get("name", project_id)
            
            # 加载脚本数据
            script_data = self.load_script_data(project_id)
            if not script_data:
                return ExportResponse(
                    success=False,
                    message="脚本文件不存在"
                )
            
            # 执行格式转换（创作格式 -> 游戏格式）
            game_script_data = authoring_to_game(script_data)

            # 创建临时目录
            temp_export_dir = tempfile.mkdtemp(prefix=f"export_{project_id}_")
            
            try:
                if export_format == ExportFormat.JSON_ONLY:
                    # 仅导出JSON
                    script_filename = f"{project_name}_script.json"
                    script_export_path = os.path.join(temp_export_dir, script_filename)
                    
                    with open(script_export_path, 'w', encoding='utf-8') as f:
                        json.dump(game_script_data, f, ensure_ascii=False, indent=4)
                    
                    return ExportResponse(
                        success=True,
                        message="JSON导出成功",
                        download_url=script_export_path,
                        file_size=os.path.getsize(script_export_path)
                    )
                
                elif export_format == ExportFormat.FULL_PACKAGE:
                    # 导出包含图片的完整包
                    
                    # 创建ZIP文件
                    zip_filename = f"{project_name}_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"
                    zip_path = os.path.join(temp_export_dir, zip_filename)
                    
                    included_images = []
                    
                    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                        # 添加脚本JSON文件
                        script_json = json.dumps(game_script_data, ensure_ascii=False, indent=2)
                        zipf.writestr(f"{project_name}_script.json", script_json)
                        
                        # 添加图片文件
                        if include_images:
                            # 根据选择策略添加图片
                            images_to_include = []
                            
                            # 获取脚本中使用的图片
                            # 保持图片提取基于原始创作格式，避免转换对资源选择的潜在影响
                            used_images = self.extract_used_images(script_data)
                            
                            # 获取所有可用图片
                            available_images = self.get_available_images(project_id)
                            
                            # 策略：包含所有图片（简化实现）
                            images_to_include = available_images
                            
                            # 添加图片到ZIP
                            images_dir = os.path.join(self.projects_path, project_id, "assets")
                            
                            for image_filename in images_to_include:
                                image_path = os.path.join(images_dir, image_filename)
                                if os.path.exists(image_path):
                                    # 在ZIP中创建images目录
                                    zipf.write(image_path, f"images/{image_filename}")
                                    included_images.append(image_filename)
                        
                        # 添加说明文件
                        readme_content = f"""# {project_name} 导出包

项目ID: {project_id}
导出时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
包含文件:
- {project_name}_script.json: 脚本内容
- images/: 背景图片目录 ({len(included_images)} 个文件)

使用说明:
1. 脚本内容在JSON文件中
2. 背景图片在images目录中
3. 脚本中的background_image字段对应images目录中的文件名
"""
                        zipf.writestr("README.txt", readme_content)
                    
                    return ExportResponse(
                        success=True,
                        message=f"导出包创建成功，包含 {len(included_images)} 个图片文件",
                        download_url=zip_path,
                        file_size=os.path.getsize(zip_path),
                        included_images=included_images
                    )
                
            finally:
                # 注意：这里不删除临时目录，因为需要保留文件供下载
                # 实际应用中应该有定期清理机制
                pass
                
        except Exception as e:
            return ExportResponse(
                success=False,
                message=f"导出失败: {str(e)}"
            )

# 创建全局实例
export_service = ExportService()
