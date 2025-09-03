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
        try:
            # 使用指定的知识库，如果没有指定则使用默认的
            kb_name = kb_name or self.default_kb_name
            db_path = os.path.join(self.kb_path, "VectorStore", kb_name)
            
            if not os.path.exists(db_path):
                print(f"知识库不存在: {db_path}")
                return "", []
            
            # 加载索引
            storage_context = StorageContext.from_defaults(persist_dir=db_path)
            index = load_index_from_storage(storage_context)
            
            # 检索
            retriever = index.as_retriever(similarity_top_k=20)
            retrieved_nodes = retriever.retrieve(query)
            
            # 重排序
            reranker = DashScopeRerank(top_n=chunk_cnt, return_documents=True)
            ranked_nodes = reranker.postprocess_nodes(retrieved_nodes, query_str=query)
            
            # 构建结果
            context_str = ""
            rag_sources = []
            
            for node in ranked_nodes:
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
    
    def generate_script_structure(self, project_name: Optional[str] = None) -> Dict[str, Any]:
        """生成剧本结构"""
        generation_id = str(uuid.uuid4())
        
        try:
            # 如果指定了项目名，尝试从项目文件加载
            if project_name:
                tree_data = script_file_service.load_tree_structure(project_name)
                if tree_data:
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
                        "structure": tree_data.get("structure", []),
                        "global_context": tree_data.get("global_context", {}),
                        "message": f"从项目 '{project_name}' 加载剧本结构成功"
                    }
            
            # 如果没有项目或项目文件不存在，尝试从遗留配置加载
            legacy_path = os.path.join(self.configs_path, "structure", "twin_pagoda", "anchor_tree.json")
            if os.path.exists(legacy_path):
                with open(legacy_path, 'r', encoding='utf-8') as f:
                    anchor_tree = json.load(f)
                
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
                    "structure": anchor_tree["structure"],
                    "global_context": anchor_tree["global_context"],
                    "message": "从遗留配置加载剧本结构成功"
                }
            
            # 如果都没有，返回错误
            raise FileNotFoundError("没有找到可用的剧本结构文件")
            
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
