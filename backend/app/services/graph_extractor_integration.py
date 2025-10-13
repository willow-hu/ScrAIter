"""
GraphRAG实体关系提取集成器
使用内置的LLM和规则方法进行实体关系提取
"""
import pandas as pd
from typing import Tuple, Dict, Any
import logging

from .llm_graph_extractor import LLMGraphExtractor

logger = logging.getLogger(__name__)

class GraphExtractorIntegration:
    """GraphRAG实体关系提取集成器"""
    
    def __init__(self, llm_config: Dict[str, Any] | None = None):
        """初始化图提取器
        
        Args:
            llm_config: LLM配置，如果提供将使用LLM提取，否则使用规则方法
        """
        # 初始化LLM图提取器
        self.graph_extractor = LLMGraphExtractor(llm_config=llm_config)
        
        logger.info("GraphRAG实体关系提取器初始化成功")
    
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
        从文本单元中提取实体和关系
        
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
            
            # 使用内置的图提取器
            entities_df, relationships_df = self.graph_extractor.extract_graph(text_units)
            
            logger.info(f"提取完成: {len(entities_df)} 个实体, {len(relationships_df)} 个关系")
            
            return entities_df, relationships_df
            
        except Exception as e:
            logger.error(f"实体关系提取失败: {e}")
            return self._empty_dataframes()
    
    def _empty_dataframes(self) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """返回空的实体和关系DataFrame"""
        entities_df = pd.DataFrame(columns=[
            'id', 'title', 'type', 'description', 'text_unit_ids', 'degree', 'community'
        ])
        relationships_df = pd.DataFrame(columns=[
            'id', 'source', 'target', 'description', 'weight', 'text_unit_ids'
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
        required_columns = ['id', 'title', 'type', 'description', 'text_unit_ids']
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
        required_columns = ['id', 'source', 'target', 'description', 'weight', 'text_unit_ids']
        for col in required_columns:
            if col not in relationships_df.columns:
                if col == 'weight':
                    relationships_df[col] = 1.0
                else:
                    relationships_df[col] = None
        
        # 转换text_unit_ids为JSON字符串格式
        if 'text_unit_ids' in relationships_df.columns:
            relationships_df['text_unit_ids'] = relationships_df['text_unit_ids'].apply(
                lambda x: str(x) if x is not None else "[]"
            )
        
        return relationships_df

# 创建全局实例（使用规则方法作为默认）
try:
    graph_extractor_integration = GraphExtractorIntegration()
except Exception as e:
    graph_extractor_integration = None
    logger.warning(f"GraphExtractorIntegration初始化失败: {e}")