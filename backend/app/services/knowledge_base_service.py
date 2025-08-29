"""
知识库管理服务
"""
import os
import json
import uuid
import asyncio
from datetime import datetime
from typing import Dict, Any, Optional
import shutil

from app.core.config import settings
from app.models.file_models import KnowledgeBaseStatus, BuildStatus

class KnowledgeBaseService:
    def __init__(self):
        self.kb_path = settings.KNOWLEDGE_BASES_DIR
        self.uploads_path = settings.UPLOADS_DIR
        self.build_tasks: Dict[str, BuildStatus] = {}
        
        # 确保目录存在
        os.makedirs(self.kb_path, exist_ok=True)
    
    def get_knowledge_base_status(self) -> KnowledgeBaseStatus:
        """获取知识库状态"""
        try:
            # 检查是否存在知识库
            kb_dirs = [d for d in os.listdir(self.kb_path) if os.path.isdir(os.path.join(self.kb_path, d))]
            
            if not kb_dirs:
                return KnowledgeBaseStatus(
                    is_built=False,
                    file_count=0,
                    status="idle"
                )
            
            # 统计文件数量
            file_count = self._count_source_files()
            
            # 获取最后更新时间
            last_updated = None
            for kb_dir in kb_dirs:
                kb_dir_path = os.path.join(self.kb_path, kb_dir)
                if os.path.exists(kb_dir_path):
                    stat = os.stat(kb_dir_path)
                    dir_time = datetime.fromtimestamp(stat.st_mtime)
                    if last_updated is None or dir_time > last_updated:
                        last_updated = dir_time
            
            # 检查是否有正在进行的构建任务
            active_tasks = [task for task in self.build_tasks.values() if task.status == "running"]
            
            if active_tasks:
                current_task = active_tasks[0]
                return KnowledgeBaseStatus(
                    is_built=True,
                    file_count=file_count,
                    last_updated=last_updated,
                    build_progress=current_task.progress,
                    status="building"
                )
            
            return KnowledgeBaseStatus(
                is_built=True,
                file_count=file_count,
                last_updated=last_updated,
                status="completed"
            )
            
        except Exception as e:
            return KnowledgeBaseStatus(
                is_built=False,
                file_count=0,
                status="error"
            )
    
    def _count_source_files(self) -> int:
        """统计源文件数量"""
        count = 0
        file_dir = os.path.join(self.uploads_path, "File")
        
        if os.path.exists(file_dir):
            for root, dirs, files in os.walk(file_dir):
                count += len([f for f in files if not f.startswith('.')])
        
        return count
    
    async def build_knowledge_base(self) -> Dict[str, str]:
        """构建知识库"""
        task_id = str(uuid.uuid4())
        
        # 创建构建任务
        build_status = BuildStatus(
            task_id=task_id,
            progress=0.0,
            status="running"
        )
        self.build_tasks[task_id] = build_status
        
        # 异步执行构建任务
        asyncio.create_task(self._build_knowledge_base_task(task_id))
        
        return {
            "task_id": task_id,
            "message": "知识库构建任务已启动"
        }
    
    async def _build_knowledge_base_task(self, task_id: str):
        """执行知识库构建任务"""
        try:
            build_status = self.build_tasks[task_id]
            
            # 模拟构建过程（实际应该调用原有的知识库构建代码）
            await self._simulate_build_process(task_id)
            
            # 完成构建
            build_status.status = "completed"
            build_status.progress = 100.0
            
        except Exception as e:
            build_status = self.build_tasks.get(task_id)
            if build_status:
                build_status.status = "error"
                build_status.error_message = str(e)
    
    async def _simulate_build_process(self, task_id: str):
        """模拟构建过程（待替换为实际的构建逻辑）"""
        build_status = self.build_tasks[task_id]
        
        # 这里应该替换为实际的知识库构建逻辑
        # 目前只是模拟进度更新
        steps = [
            ("扫描文件...", 10),
            ("处理文档...", 30),
            ("生成向量嵌入...", 60),
            ("构建索引...", 80),
            ("保存知识库...", 90),
            ("完成", 100)
        ]
        
        for step_name, progress in steps:
            await asyncio.sleep(1)  # 模拟处理时间
            build_status.current_file = step_name
            build_status.progress = progress
            
            if progress < 100:
                build_status.estimated_completion = datetime.now()
    
    def get_build_status(self, task_id: str) -> Optional[BuildStatus]:
        """获取构建进度"""
        return self.build_tasks.get(task_id)
    
    def _copy_original_kb_logic(self):
        """
        这里应该复制并适配原有的知识库构建逻辑
        从 qwen-local-rag/create_kb.py 中的相关函数
        """
        # TODO: 集成原有的create_kb.py逻辑
        pass

# 创建全局实例
knowledge_base_service = KnowledgeBaseService()
