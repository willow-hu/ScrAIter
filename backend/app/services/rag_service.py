"""
RAG生成服务
集成原有的qwen-local-rag项目功能
"""
import os
import json
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple
from openai import OpenAI
from llama_index.core import StorageContext, load_index_from_storage, Settings
from llama_index.embeddings.dashscope import (
    DashScopeEmbedding,
    DashScopeTextEmbeddingModels,
    DashScopeTextEmbeddingType,
)
from llama_index.postprocessor.dashscope_rerank import DashScopeRerank

from app.core.config import settings
from app.models.rag_models import (
    GeneratedContent, GenerationHistory, GenerationHistoryResponse,
    RAGSource, RAGSourcesResponse
)
from app.services.script_file_service import script_file_service

class RAGService:
    def __init__(self):
        # 设置嵌入模型
        self.embed_model = DashScopeEmbedding(
            model_name=DashScopeTextEmbeddingModels.TEXT_EMBEDDING_V2,
            text_type=DashScopeTextEmbeddingType.TEXT_TYPE_DOCUMENT,
        )
        Settings.embed_model = self.embed_model
        
        # OpenAI客户端
        self.client = OpenAI(
            api_key=os.getenv("DASHSCOPE_API_KEY"),
            base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
        )
        
        # 路径设置
        self.kb_path = settings.KNOWLEDGE_BASES_DIR
        self.configs_path = settings.CONFIGS_DIR
        self.prompts_path = os.path.join(settings.BASE_DIR, "app", "prompts")
        
        # 生成历史存储
        self.generation_history: List[GenerationHistory] = []
        self.rag_sources_cache: Dict[str, List[RAGSource]] = {}
        
        # 默认知识库名称
        self.default_kb_name = "twin_pagoda"
        
        # 索引缓存 - 新增
        self.index_cache: Dict[str, Any] = {}
        self.retriever_cache: Dict[str, Any] = {}
        print("🚀 RAG服务初始化完成，已启用索引缓存机制")
    
    def set_default_knowledge_base(self, kb_name: str):
        """设置默认知识库"""
        self.default_kb_name = kb_name
    
    def load_prompt_template(self, prompt_file: str = "generate_script.txt") -> str:
        """加载提示词模板"""
        assert os.path.exists(self.prompts_path), "提示词文件不存在！"
        prompt_path = os.path.join(self.prompts_path, prompt_file)
        
        with open(prompt_path, 'r', encoding='utf-8') as f:
            return f.read().strip()
    
    def load_anchor_tree(self) -> Dict[str, Any]:
        """加载锚点树结构"""
        # 默认使用twin_pagoda主题
        anchor_tree_path = os.path.join(self.configs_path, "structure", "twin_pagoda", "anchor_tree.json")
        
        if not os.path.exists(anchor_tree_path):
            raise FileNotFoundError(f"锚点树文件不存在: {anchor_tree_path}")
        
        with open(anchor_tree_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def retrieve_relevant_chunks(
        self, 
        query: str, 
        kb_name: Optional[str] = None,
        similarity_threshold: float = 0.5, 
        chunk_cnt: int = 3
    ) -> Tuple[str, List[RAGSource]]:
        """检索相关知识片段"""
        kb_name = kb_name or self.default_kb_name
        
        try:
            db_path = os.path.join(self.kb_path, "VectorStore", kb_name)
            
            if not os.path.exists(db_path):
                return "", []
            
            # 检查缓存中是否有对应的检索器
            if kb_name in self.retriever_cache:
                retriever = self.retriever_cache[kb_name]
            else:
                # 加载索引
                storage_context = StorageContext.from_defaults(persist_dir=db_path)
                index = load_index_from_storage(storage_context)
                
                # 创建检索器并缓存
                retriever = index.as_retriever(similarity_top_k=20)
                self.index_cache[kb_name] = index
                self.retriever_cache[kb_name] = retriever
            
            # 检索
            retrieved_nodes = retriever.retrieve(query)
            
            # 重排序
            reranker = DashScopeRerank(top_n=chunk_cnt, return_documents=True)
            ranked_nodes = reranker.postprocess_nodes(retrieved_nodes, query_str=query)
            
            # 构建结果
            context_str = ""
            rag_sources = []
            
            for i, node in enumerate(ranked_nodes):
                # 确保score不为None
                node_score = getattr(node, 'score', 0.0) or 0.0
                if node_score >= similarity_threshold:
                    context_str += node.text + "\n\n"
                    rag_sources.append(RAGSource(
                        text=node.text,
                        score=node_score,
                        source_file=node.metadata.get('file_name', 'unknown')
                    ))
            
            return context_str.strip(), rag_sources
            
        except Exception as e:
            print(f"RAG检索失败: {e}")
            return "", []
    
    def generate_script_structure(self, kb_name: str, global_context: Dict[str, Any]) -> Dict[str, Any]:
        """生成剧本结构"""
        generation_id = str(uuid.uuid4())
        
        try:
            # 确保shared/projects目录存在
            projects_base_dir = os.path.join(settings.SHARED_DIR, "projects")
            os.makedirs(projects_base_dir, exist_ok=True)
            
            # 创建知识库名称的子文件夹
            kb_projects_dir = os.path.join(projects_base_dir, kb_name)
            os.makedirs(kb_projects_dir, exist_ok=True)
            
            # 创建JSON文件
            script_file_name = f"{kb_name}_script.json"
            script_file_path = os.path.join(kb_projects_dir, script_file_name)
            
            # 检查文件是否已存在，如果存在则只更新structure字段
            if os.path.exists(script_file_path):
                try:
                    with open(script_file_path, 'r', encoding='utf-8') as f:
                        existing_data = json.load(f)
                    
                    # 保留现有的global_context，只更新structure
                    script_data = {
                        "global_context": existing_data.get("global_context", global_context),
                        "structure": []  # 暂时置空，等待GraphRAG实现
                    }
                except (json.JSONDecodeError, Exception):
                    # 如果文件损坏，创建新的
                    script_data = {
                        "global_context": global_context,
                        "structure": []  # 暂时置空，等待GraphRAG实现
                    }
            else:
                # 文件不存在，创建新的
                script_data = {
                    "global_context": global_context,
                    "structure": []  # 暂时置空，等待GraphRAG实现
                }
            
            # 保存文件
            with open(script_file_path, 'w', encoding='utf-8') as f:
                json.dump(script_data, f, ensure_ascii=False, indent=2)
            
            # 记录生成历史
            history_record = GenerationHistory(
                generation_id=generation_id,
                timestamp=datetime.now(),
                generation_type="structure",
                success=True
            )
            self.generation_history.append(history_record)
            
            return {
                "generation_id": generation_id,
                "structure": script_data["structure"],
                "global_context": script_data["global_context"],
                "message": f"已在 shared/projects/{kb_name}/ 目录下创建/更新 {script_file_name} 文件",
                "file_path": script_file_path
            }
            
        except Exception as e:
            # 记录失败
            history_record = GenerationHistory(
                generation_id=generation_id,
                timestamp=datetime.now(),
                generation_type="structure",
                success=False,
                error_message=str(e)
            )
            self.generation_history.append(history_record)
            raise e
    
    def generate_node_content(
        self, 
        node_info: Dict[str, Any], 
        global_context: Dict[str, Any],
        kb_name: Optional[str] = None,
        similarity_threshold: float = 0.2,
        chunk_cnt: int = 5
    ) -> GeneratedContent:
        """生成节点内容"""
        generation_id = str(uuid.uuid4())
        node_name = node_info.get("name", "unknown")
        
        try:
            # 加载提示词模板
            prompt_template = self.load_prompt_template()
            
            # RAG检索
            user_query = node_info.get("user", node_info.get("abstract", ""))
            context_knowledge, rag_sources = self.retrieve_relevant_chunks(
                user_query, 
                kb_name=kb_name,
                similarity_threshold=similarity_threshold,
                chunk_cnt=chunk_cnt
            )
            
            # 缓存RAG源
            self.rag_sources_cache[generation_id] = rag_sources
            
            # 构建最终提示词
            try:
                filled_prompt = prompt_template.format(
                    global_context=json.dumps(global_context, ensure_ascii=False, indent=2),
                    node_info=json.dumps(node_info, ensure_ascii=False, indent=2),
                    context=context_knowledge
                )
            except KeyError as e:
                print(f"❌ 提示词模板有误，请检查: {e}")
                raise e

            # 调用大模型
            completion = self.client.chat.completions.create(
                model="qwen-max",
                messages=[
                    {
                        "role": "system", 
                        "content": "你是一位经验丰富的交互剧情游戏设计师，严格按照要求生成对话脚本。"
                    },
                    {"role": "user", "content": filled_prompt}
                ],
                temperature=0.7,
                max_tokens=512,
                stream=False
            )
            
            content = completion.choices[0].message.content
            if content is None:
                content = "[内容生成失败]"
            else:
                content = content.strip()
            
            # 记录成功历史
            history_record = GenerationHistory(
                generation_id=generation_id,
                timestamp=datetime.now(),
                generation_type="node_content",
                node_name=node_name,
                success=True
            )
            self.generation_history.append(history_record)
            
            return GeneratedContent(
                content=content,
                generation_id=generation_id,
                timestamp=datetime.now(),
                node_name=node_name
            )
            
        except Exception as e:
            # 记录失败历史
            history_record = GenerationHistory(
                generation_id=generation_id,
                timestamp=datetime.now(),
                generation_type="node_content",
                node_name=node_name,
                success=False,
                error_message=str(e)
            )
            self.generation_history.append(history_record)
            raise e
    
    def get_generation_history(self) -> GenerationHistoryResponse:
        """获取生成历史"""
        # 按时间倒序排列
        sorted_history = sorted(
            self.generation_history, 
            key=lambda x: x.timestamp, 
            reverse=True
        )
        
        return GenerationHistoryResponse(
            history=sorted_history,
            total_count=len(sorted_history)
        )
    
    def clear_cache(self, kb_name: Optional[str] = None):
        """清理索引缓存"""
        if kb_name:
            # 清理指定知识库的缓存
            if kb_name in self.index_cache:
                del self.index_cache[kb_name]
            if kb_name in self.retriever_cache:
                del self.retriever_cache[kb_name]
            print(f"🧹 已清理知识库缓存: {kb_name}")
        else:
            # 清理所有缓存
            self.index_cache.clear()
            self.retriever_cache.clear()
            print("🧹 已清理所有索引缓存")

    def get_cache_status(self) -> Dict[str, Any]:
        """获取缓存状态"""
        return {
            "cached_knowledge_bases": list(self.index_cache.keys()),
            "cache_count": len(self.index_cache)
        }

    def get_rag_sources(self, generation_id: str) -> Optional[RAGSourcesResponse]:
        """获取指定生成ID的RAG检索片段"""
        if generation_id not in self.rag_sources_cache:
            return None
        
        # 找到对应的历史记录以获取查询信息
        history_record = next(
            (h for h in self.generation_history if h.generation_id == generation_id),
            None
        )
        
        query = f"生成ID: {generation_id}" if history_record else "unknown"
        
        return RAGSourcesResponse(
            generation_id=generation_id,
            sources=self.rag_sources_cache[generation_id],
            query=query
        )

# 创建全局实例
rag_service = RAGService()
