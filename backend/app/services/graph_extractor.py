"""
图提取器
使用大语言模型进行实体和关系提取，整合了业务逻辑处理
"""
import os
import logging
import re
import hashlib
import concurrent.futures
from typing import List, Dict, Any, Tuple, Optional
import pandas as pd
from openai import OpenAI

from app.core.config import settings
from ..prompts.graph_extraction_ch import (
    GRAPH_EXTRACTION_PROMPT,
    CONTINUE_PROMPT,
    LOOP_PROMPT,
    DEFAULT_TUPLE_DELIMITER,
    DEFAULT_RECORD_DELIMITER,
    DEFAULT_COMPLETION_DELIMITER,
    DEFAULT_ENTITY_TYPES
)

logger = logging.getLogger(__name__)


class GraphExtractor:
    """图提取器"""
    
    def __init__(self, 
                 max_gleanings: int = 0,
                 entity_types: Optional[List[str]] = None):
        """初始化GraphRAG图提取器
        
        Args:
            max_gleanings: 最大额外提取轮数
            entity_types: 要提取的实体类型列表
        """
        # 使用与RAG服务相同的OpenAI客户端配置
        api_key = os.getenv("DASHSCOPE_API_KEY")
        if not api_key:
            raise RuntimeError("未设置DASHSCOPE_API_KEY环境变量，图提取功能无法使用")
        
        # 同步客户端
        self.client = OpenAI(
            api_key=api_key,
            base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
        )
        
        self.max_gleanings = max_gleanings
        self.entity_types = entity_types or DEFAULT_ENTITY_TYPES
        
        # Prompt参数
        self.tuple_delimiter = DEFAULT_TUPLE_DELIMITER
        self.record_delimiter = DEFAULT_RECORD_DELIMITER
        self.completion_delimiter = DEFAULT_COMPLETION_DELIMITER
        
        logger.info(f"图提取器初始化成功，使用DashScope API")
    
    def extract_graph(self, text_units: pd.DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """使用LLM从文本单元中提取实体和关系"""
        try:
            logger.info(f"开始并发图提取，使用LLM从{len(text_units)}个文本单元中提取图数据")
            
            # 使用线程池进行并发处理（避免异步复杂性）
            import concurrent.futures
            
            def process_single_unit(args):
                text, text_unit_id = args
                return self._extract_from_text(text, text_unit_id)
            
            # 准备任务参数
            tasks = [(row['text'], row['id']) for _, row in text_units.iterrows()]
            
            logger.info(f"启动{len(tasks)}个并发任务（使用线程池）")
            
            # 使用线程池并发执行
            all_entities = []
            all_relationships = []
            success_count = 0
            
            with concurrent.futures.ThreadPoolExecutor(max_workers=min(len(tasks), 5)) as executor:
                # 提交所有任务
                future_to_index = {executor.submit(process_single_unit, task): i for i, task in enumerate(tasks)}
                
                # 收集结果
                for future in concurrent.futures.as_completed(future_to_index):
                    index = future_to_index[future]
                    try:
                        entities, relationships = future.result()
                        all_entities.extend(entities)
                        all_relationships.extend(relationships)
                        success_count += 1
                        logger.info(f"任务 {index+1}/{len(tasks)} 完成")
                    except Exception as e:
                        logger.error(f"任务 {index+1} 失败: {e}")
            
            logger.info(f"并发处理完成: {success_count}/{len(tasks)}个任务成功")
            
            # 转换为DataFrame并合并重复项
            entities_df = self._merge_entities(all_entities)
            relationships_df = self._merge_relationships(all_relationships)
            
            # 检查结果
            if len(entities_df) > 0 or len(relationships_df) > 0:
                logger.info(f"LLM并发提取成功: {len(entities_df)}个实体, {len(relationships_df)}个关系")
                return entities_df, relationships_df
            else:
                logger.warning("LLM并发提取未返回结果，可能是文本中没有可识别的实体或关系")
                return entities_df, relationships_df
                
        except Exception as e:
            logger.error(f"LLM提取失败: {e}")
            import traceback
            logger.error(f"详细错误: {traceback.format_exc()}")
            # 返回空结果而不是崩溃
            empty_entities = pd.DataFrame(columns=['id', 'title', 'type', 'description', 'text_unit_ids'])
            empty_relationships = pd.DataFrame(columns=['id', 'source', 'target', 'description', 'text_unit_ids', 'weight'])
            return empty_entities, empty_relationships

    def _extract_from_text(self, text: str, text_unit_id: str) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """使用LLM从单个文本中提取实体和关系"""
        # 准备prompt
        prompt = GRAPH_EXTRACTION_PROMPT.format(
            entity_types=",".join([t.upper() for t in self.entity_types]),
            tuple_delimiter=self.tuple_delimiter,
            record_delimiter=self.record_delimiter,
            completion_delimiter=self.completion_delimiter,
            input_text=text
        )
        
        try:
            # 使用与RAG服务相同的调用方式
            completion = self.client.chat.completions.create(
                model=settings.GRAPH_EXTRACTION_MODEL,
                messages=[
                    {"role": "user", "content": prompt}
                ],
                temperature=settings.GRAPH_EXTRACTION_TEMPERATURE,
                max_tokens=settings.GRAPH_EXTRACTION_MAX_TOKENS,
                stream=False
            )
            
            results = completion.choices[0].message.content or ""
            
            # 如果配置了额外收集轮次
            if self.max_gleanings > 0:
                for i in range(self.max_gleanings):
                    # 要求更多实体
                    continue_completion = self.client.chat.completions.create(
                        model=settings.GRAPH_EXTRACTION_MODEL,
                        messages=[
                            {"role": "user", "content": prompt},
                            {"role": "assistant", "content": results},
                            {"role": "user", "content": CONTINUE_PROMPT}
                        ],
                        temperature=settings.GRAPH_EXTRACTION_TEMPERATURE,
                        max_tokens=settings.GRAPH_EXTRACTION_MAX_TOKENS,
                        stream=False
                    )
                    
                    additional_results = continue_completion.choices[0].message.content or ""
                    results += "\n" + additional_results
                    
                    # 检查是否应该继续
                    if i < self.max_gleanings - 1:  # 最后一次迭代不检查
                        loop_completion = self.client.chat.completions.create(
                            model=settings.GRAPH_EXTRACTION_MODEL,
                            messages=[
                                {"role": "user", "content": LOOP_PROMPT}
                            ],
                            temperature=settings.GRAPH_EXTRACTION_TEMPERATURE,
                            max_tokens=settings.GRAPH_LOOP_DECISION_MAX_TOKENS,
                            stream=False
                        )
                        
                        loop_response = loop_completion.choices[0].message.content
                        if not loop_response or loop_response.strip().upper() != "Y":
                            break
            
            # 解析结果
            entities, relationships = self._parse_llm_response(results, text_unit_id)
            
            return entities, relationships
            
        except Exception as e:
            logger.error(f"LLM调用失败: {e}")
            raise RuntimeError(f"图提取LLM调用失败: {e}") from e
    
    def _parse_llm_response(self, response: str, text_unit_id: str) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """解析LLM响应提取实体和关系"""
        entities = []
        relationships = []
        
        # 按记录分隔符分割
        records = [r.strip() for r in response.split(self.record_delimiter)]
        
        for record in records:
            # 清理记录
            record = re.sub(r'^\(|\)$', '', record.strip())
            record = record.replace(self.completion_delimiter, '')
            
            if not record:
                continue
            
            # 按元组分隔符分割
            parts = record.split(self.tuple_delimiter)
            
            if len(parts) < 2:
                continue
            
            record_type = parts[0].strip().strip('"').lower()
            
            if record_type == "entity" and len(parts) >= 4:
                entity_name = parts[1].strip().strip('"')
                entity_type = parts[2].strip().strip('"').lower()
                entity_description = parts[3].strip().strip('"')
                entity_normalized_date = parts[4].strip().strip('"') if len(parts) > 4 else ""
                
                entity = {
                    'id': self._generate_entity_id(entity_name, entity_type),
                    'title': entity_name,
                    'type': entity_type,
                    'description': entity_description,
                    'normalized_date': entity_normalized_date,
                    'text_unit_ids': [text_unit_id]
                }
                entities.append(entity)
            
            elif record_type == "relationship" and len(parts) >= 5:
                source = parts[1].strip().strip('"')
                target = parts[2].strip().strip('"')
                description = parts[3].strip().strip('"')
                relationship_time = parts[4].strip().strip('"') if len(parts) > 4 else ""
                
                # 尝试解析权重/强度
                try:
                    weight = float(parts[5].strip()) if len(parts) > 5 else 1.0
                except (ValueError, IndexError):
                    weight = 1.0
                
                relationship = {
                    'id': self._generate_relationship_id(source, target),
                    'source': source,
                    'target': target,
                    'description': description,
                    'relationship_time': relationship_time,
                    'weight': weight,
                    'text_unit_ids': [text_unit_id]
                }
                relationships.append(relationship)
        
        return entities, relationships

    def _merge_entities(self, entities: List[Dict[str, Any]]) -> pd.DataFrame:
        """合并重复实体"""
        if not entities:
            return pd.DataFrame(columns=['id', 'title', 'type', 'description', 'normalized_date', 'text_unit_ids'])
        
        df = pd.DataFrame(entities)
        
        # 按title和type分组，合并descriptions和text_unit_ids
        merged = df.groupby(['title', 'type']).agg({
            'id': 'first',
            'description': lambda x: '. '.join(set(x)),
            'normalized_date': 'first',  # 取第一个非空的日期
            'text_unit_ids': lambda x: list(set([item for sublist in x for item in (sublist if isinstance(sublist, list) else [sublist])]))
        }).reset_index()
        
        # 添加计算字段
        merged['degree'] = merged['text_unit_ids'].apply(len)
        merged['community'] = None  # 将由社区检测填充
        
        return merged
    
    def _merge_relationships(self, relationships: List[Dict[str, Any]]) -> pd.DataFrame:
        """合并重复关系"""
        if not relationships:
            return pd.DataFrame(columns=['id', 'source', 'target', 'description', 'relationship_time', 'text_unit_ids', 'weight'])
        
        df = pd.DataFrame(relationships)
        
        # 按source和target分组，合并descriptions并求和weights
        merged = df.groupby(['source', 'target']).agg({
            'id': 'first',
            'description': lambda x: '. '.join(set(x)),
            'relationship_time': 'first',  # 取第一个非空的时间
            'text_unit_ids': lambda x: list(set([item for sublist in x for item in (sublist if isinstance(sublist, list) else [sublist])])),
            'weight': 'sum'
        }).reset_index()
        
        return merged
    
    def _generate_entity_id(self, title: str, entity_type: str) -> str:
        """为实体生成唯一ID"""
        content = f"{title.upper()}_{entity_type.upper()}"
        return hashlib.md5(content.encode()).hexdigest()
    
    def _generate_relationship_id(self, source: str, target: str) -> str:
        """为关系生成唯一ID"""
        # 排序以确保无论顺序如何都有一致的ID
        sorted_names = sorted([source.upper(), target.upper()])
        content = f"{sorted_names[0]}_TO_{sorted_names[1]}"
        return hashlib.md5(content.encode()).hexdigest()

    def create_text_units_from_nodes(self, nodes) -> pd.DataFrame:
        """
        从LlamaIndex节点创建文本单元DataFrame
        
        Args:
            nodes: LlamaIndex文档节点列表
            
        Returns:
            文本单元DataFrame
        """
        try:
            text_units = []
            
            for i, node in enumerate(nodes):
                text_unit = {
                    'id': f"text_unit_{i}",
                    'text': node.text,
                    'n_tokens': len(node.text.split()),  # 简单的token计数
                    'document_ids': [node.metadata.get('file_name', 'unknown')],
                    'chunk_order': i
                }
                text_units.append(text_unit)
            
            df = pd.DataFrame(text_units)
            logger.info(f"创建了 {len(df)} 个文本单元")
            return df
            
        except Exception as e:
            logger.error(f"创建文本单元失败: {e}")
            return pd.DataFrame(columns=['id', 'text', 'n_tokens', 'document_ids', 'chunk_order'])
    
    def extract_entities_and_relationships(self, text_units: pd.DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """
        从文本单元中提取实体和关系（业务接口方法）
        
        Args:
            text_units: 文本单元DataFrame
            
        Returns:
            (entities_df, relationships_df): 实体和关系DataFrame
        """
        try:
            if text_units.empty:
                logger.warning("文本单元为空，跳过实体关系提取")
                return self._empty_dataframes()
            
            logger.info(f"开始从 {len(text_units)} 个文本单元中提取实体和关系")
            
            # 使用核心提取方法
            entities_df, relationships_df = self.extract_graph(text_units)
            
            logger.info(f"提取完成: {len(entities_df)} 个实体, {len(relationships_df)} 个关系")
            
            return entities_df, relationships_df
            
        except Exception as e:
            logger.error(f"实体关系提取失败: {e}")
            return self._empty_dataframes()
    
    def _empty_dataframes(self) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """返回空的实体和关系DataFrame"""
        entities_df = pd.DataFrame(columns=[
            'id', 'title', 'type', 'description', 'normalized_date', 'text_unit_ids', 'degree', 'community'
        ])
        relationships_df = pd.DataFrame(columns=[
            'id', 'source', 'target', 'description', 'relationship_time', 'weight', 'text_unit_ids'
        ])
        
        return entities_df, relationships_df
    
    def format_entities_for_storage(self, entities_df: pd.DataFrame) -> pd.DataFrame:
        """
        格式化实体数据以便存储
        
        Args:
            entities_df: 原始实体DataFrame
            
        Returns:
            格式化后的实体DataFrame
        """
        if entities_df.empty:
            return entities_df
        
        # 确保必要的列存在
        required_columns = ['id', 'title', 'type', 'description', 'normalized_date', 'text_unit_ids']
        for col in required_columns:
            if col not in entities_df.columns:
                entities_df[col] = None
        
        # 转换text_unit_ids为JSON字符串格式以便CSV存储
        if 'text_unit_ids' in entities_df.columns:
            entities_df['text_unit_ids'] = entities_df['text_unit_ids'].apply(
                lambda x: str(x) if x is not None else "[]"
            )
        
        return entities_df
    
    def format_relationships_for_storage(self, relationships_df: pd.DataFrame) -> pd.DataFrame:
        """
        格式化关系数据以便存储
        
        Args:
            relationships_df: 原始关系DataFrame
            
        Returns:
            格式化后的关系DataFrame
        """
        if relationships_df.empty:
            return relationships_df
        
        # 确保必要的列存在
        required_columns = ['id', 'source', 'target', 'description', 'relationship_time', 'weight', 'text_unit_ids']
        for col in required_columns:
            if col not in relationships_df.columns:
                if col == 'weight':
                    relationships_df[col] = 1.0
                elif col == 'relationship_time':
                    relationships_df[col] = ""
                else:
                    relationships_df[col] = None
        
        # 转换text_unit_ids为JSON字符串格式
        if 'text_unit_ids' in relationships_df.columns:
            relationships_df['text_unit_ids'] = relationships_df['text_unit_ids'].apply(
                lambda x: str(x) if x is not None else "[]"
            )
        
        return relationships_df


# 创建全局实例
try:
    from app.core.config import settings
    graph_extractor = GraphExtractor(max_gleanings=settings.GRAPH_MAX_GLEANINGS)
except Exception as e:
    graph_extractor = None
    logger.warning(f"GraphExtractor初始化失败: {e}")