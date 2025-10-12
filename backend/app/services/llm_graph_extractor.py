"""
基于LLM的图提取器
使用大语言模型进行实体和关系提取
"""
import logging
import re
import hashlib
from typing import List, Dict, Any, Tuple
import pandas as pd

from ..core.llm_client import BaseLLMClient, create_llm_client
from ..prompts.graph_extraction import (
    GRAPH_EXTRACTION_PROMPT,
    CONTINUE_PROMPT,
    LOOP_PROMPT,
    DEFAULT_TUPLE_DELIMITER,
    DEFAULT_RECORD_DELIMITER,
    DEFAULT_COMPLETION_DELIMITER,
    DEFAULT_ENTITY_TYPES
)

logger = logging.getLogger(__name__)


class LLMGraphExtractor:
    """基于LLM的图提取器"""
    
    def __init__(self, 
                 llm_client: BaseLLMClient = None,
                 llm_config: Dict[str, Any] = None,
                 max_gleanings: int = 1,
                 entity_types: List[str] = None):
        """初始化LLM图提取器
        
        Args:
            llm_client: LLM客户端，如果为None将从配置创建
            llm_config: LLM客户端配置
            max_gleanings: 最大额外提取轮数
            entity_types: 要提取的实体类型列表
        """
        if llm_client is None:
            if llm_config is None:
                # 使用模拟客户端作为后备
                llm_config = {"provider": "mock"}
            self.llm_client = create_llm_client(llm_config)
        else:
            self.llm_client = llm_client
        
        self.max_gleanings = max_gleanings
        self.entity_types = entity_types or DEFAULT_ENTITY_TYPES
        
        # Prompt参数
        self.tuple_delimiter = DEFAULT_TUPLE_DELIMITER
        self.record_delimiter = DEFAULT_RECORD_DELIMITER
        self.completion_delimiter = DEFAULT_COMPLETION_DELIMITER
    
    def extract_graph(self, text_units: pd.DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """使用LLM从文本单元中提取实体和关系"""
        logger.info(f"使用LLM从{len(text_units)}个文本单元中提取图数据")
        
        all_entities = []
        all_relationships = []
        
        for idx, text_unit in text_units.iterrows():
            text = text_unit['text']
            text_unit_id = text_unit['id']
            
            try:
                logger.info(f"处理文本单元 {idx + 1}/{len(text_units)}")
                
                # 从此文本单元提取实体和关系
                entities, relationships = self._extract_from_text(text, text_unit_id)
                
                all_entities.extend(entities)
                all_relationships.extend(relationships)
                
            except Exception as e:
                logger.error(f"处理文本单元{text_unit_id}时出错: {e}")
                continue
        
        # 转换为DataFrame并合并重复项
        entities_df = self._merge_entities(all_entities)
        relationships_df = self._merge_relationships(all_relationships)
        
        logger.info(f"使用LLM提取完成: {len(entities_df)}个实体, {len(relationships_df)}个关系")
        
        return entities_df, relationships_df
    
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
        
        # 初始提取
        response = self.llm_client.chat(prompt)
        results = response.content or ""
        
        # 如果配置了额外收集轮次
        if self.max_gleanings > 0:
            history = response.history
            
            for i in range(self.max_gleanings):
                # 要求更多实体
                continue_response = self.llm_client.chat(CONTINUE_PROMPT)
                additional_results = continue_response.content or ""
                results += "\n" + additional_results
                
                # 检查是否应该继续
                if i < self.max_gleanings - 1:  # 最后一次迭代不检查
                    loop_response = self.llm_client.chat(LOOP_PROMPT)
                    if loop_response.content.strip().upper() != "Y":
                        break
        
        # 解析结果
        entities, relationships = self._parse_llm_response(results, text_unit_id)
        
        return entities, relationships
    
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
                
                entity = {
                    'id': self._generate_entity_id(entity_name, entity_type),
                    'title': entity_name,
                    'type': entity_type,
                    'description': entity_description,
                    'text_unit_ids': [text_unit_id]
                }
                entities.append(entity)
            
            elif record_type == "relationship" and len(parts) >= 5:
                source = parts[1].strip().strip('"')
                target = parts[2].strip().strip('"')
                description = parts[3].strip().strip('"')
                
                # 尝试解析权重/强度
                try:
                    weight = float(parts[4].strip())
                except (ValueError, IndexError):
                    weight = 1.0
                
                relationship = {
                    'id': self._generate_relationship_id(source, target),
                    'source': source,
                    'target': target,
                    'description': description,
                    'weight': weight,
                    'text_unit_ids': [text_unit_id]
                }
                relationships.append(relationship)
        
        return entities, relationships
    
    def _merge_entities(self, entities: List[Dict[str, Any]]) -> pd.DataFrame:
        """合并重复实体"""
        if not entities:
            return pd.DataFrame(columns=['id', 'title', 'type', 'description', 'text_unit_ids'])
        
        df = pd.DataFrame(entities)
        
        # 按title和type分组，合并descriptions和text_unit_ids
        merged = df.groupby(['title', 'type']).agg({
            'id': 'first',
            'description': lambda x: '. '.join(set(x)),
            'text_unit_ids': lambda x: list(set([item for sublist in x for item in (sublist if isinstance(sublist, list) else [sublist])]))
        }).reset_index()
        
        # 添加计算字段
        merged['degree'] = merged['text_unit_ids'].apply(len)
        merged['community'] = None  # 将由社区检测填充
        
        return merged
    
    def _merge_relationships(self, relationships: List[Dict[str, Any]]) -> pd.DataFrame:
        """合并重复关系"""
        if not relationships:
            return pd.DataFrame(columns=['id', 'source', 'target', 'description', 'text_unit_ids', 'weight'])
        
        df = pd.DataFrame(relationships)
        
        # 按source和target分组，合并descriptions并求和weights
        merged = df.groupby(['source', 'target']).agg({
            'id': 'first',
            'description': lambda x: '. '.join(set(x)),
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


class RuleBasedGraphExtractor:
    """基于规则的图提取器，作为LLM的后备方案"""
    
    def __init__(self):
        # 简单的实体模式
        self.entity_patterns = {
            'person': r'\b[A-Z][a-z]+ [A-Z][a-z]+\b',
            'organization': r'\b[A-Z][a-z]+ (?:公司|集团|研究院|大学|医院|机构|Inc|Corp|Company|Ltd|LLC|Organization)\b',
            'geo': r'\b[A-Z][a-z]+ (?:市|省|县|国|城|City|County|State|Country|University|Hospital)\b',
            'event': r'\b[A-Z][a-z]+ (?:会议|峰会|研讨会|活动|Conference|Meeting|Summit|Workshop|Event)\b'
        }
        
        # 关系模式
        self.relationship_patterns = [
            r'(\w+(?:\s+\w+)*)\s+(?:在|工作于|就职于|works?\s+(?:at|for)|is\s+employed\s+by)\s+(\w+(?:\s+\w+)*)',
            r'(\w+(?:\s+\w+)*)\s+(?:创建了|建立了|founded|established|created)\s+(\w+(?:\s+\w+)*)',
            r'(\w+(?:\s+\w+)*)\s+(?:位于|居住在|is\s+located\s+in|resides\s+in|lives\s+in)\s+(\w+(?:\s+\w+)*)',
            r'(\w+(?:\s+\w+)*)\s+(?:参加了|出席了|attended|participated\s+in|joined)\s+(\w+(?:\s+\w+)*)'
        ]
    
    def extract_graph(self, text_units: pd.DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """使用规则从文本单元中提取实体和关系"""
        logger.info(f"使用规则方法从{len(text_units)}个文本单元中提取图数据")
        
        all_entities = []
        all_relationships = []
        
        for _, text_unit in text_units.iterrows():
            text = text_unit['text']
            text_unit_id = text_unit['id']
            
            # 从此文本单元提取实体
            entities = self._extract_entities(text, text_unit_id)
            all_entities.extend(entities)
            
            # 从此文本单元提取关系
            relationships = self._extract_relationships(text, text_unit_id)
            all_relationships.extend(relationships)
        
        # 转换为DataFrame并合并重复项
        entities_df = self._merge_entities(all_entities)
        relationships_df = self._merge_relationships(all_relationships)
        
        logger.info(f"规则提取完成: {len(entities_df)}个实体, {len(relationships_df)}个关系")
        
        return entities_df, relationships_df
    
    def _extract_entities(self, text: str, text_unit_id: str) -> List[Dict[str, Any]]:
        """使用简单模式匹配从文本中提取实体"""
        entities = []
        
        for entity_type, pattern in self.entity_patterns.items():
            matches = re.findall(pattern, text, re.IGNORECASE)
            
            for match in matches:
                entity = {
                    'title': match.strip(),
                    'type': entity_type.lower(),
                    'description': f"在文本中提到的{entity_type}",
                    'text_unit_ids': [text_unit_id],
                    'id': self._generate_entity_id(match.strip(), entity_type)
                }
                entities.append(entity)
        
        return entities
    
    def _extract_relationships(self, text: str, text_unit_id: str) -> List[Dict[str, Any]]:
        """使用简单模式匹配从文本中提取关系"""
        relationships = []
        
        for pattern in self.relationship_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            
            for match in matches:
                if len(match) == 2:
                    source, target = match
                    source = source.strip()
                    target = target.strip()
                    
                    relationship = {
                        'source': source,
                        'target': target,
                        'description': f"{source}和{target}之间的关系",
                        'text_unit_ids': [text_unit_id],
                        'weight': 1.0,
                        'id': self._generate_relationship_id(source, target)
                    }
                    relationships.append(relationship)
        
        return relationships
    
    def _merge_entities(self, entities: List[Dict[str, Any]]) -> pd.DataFrame:
        """合并重复实体"""
        if not entities:
            return pd.DataFrame(columns=['id', 'title', 'type', 'description', 'text_unit_ids'])
        
        df = pd.DataFrame(entities)
        
        # 按title和type分组，合并text_unit_ids和descriptions
        merged = df.groupby(['title', 'type']).agg({
            'id': 'first',
            'description': lambda x: '. '.join(set(x)),
            'text_unit_ids': lambda x: list(set([item for sublist in x for item in (sublist if isinstance(sublist, list) else [sublist])]))
        }).reset_index()
        
        # 添加一些计算字段
        merged['degree'] = merged['text_unit_ids'].apply(len)
        merged['community'] = None  # 将由社区检测填充
        
        return merged
    
    def _merge_relationships(self, relationships: List[Dict[str, Any]]) -> pd.DataFrame:
        """合并重复关系"""
        if not relationships:
            return pd.DataFrame(columns=['id', 'source', 'target', 'description', 'text_unit_ids', 'weight'])
        
        df = pd.DataFrame(relationships)
        
        # 按source和target分组，合并descriptions并求和weights
        merged = df.groupby(['source', 'target']).agg({
            'id': 'first',
            'description': lambda x: '. '.join(set(x)),
            'text_unit_ids': lambda x: list(set([item for sublist in x for item in (sublist if isinstance(sublist, list) else [sublist])])),
            'weight': 'sum'
        }).reset_index()
        
        return merged
    
    def _generate_entity_id(self, title: str, entity_type: str) -> str:
        """为实体生成唯一ID"""
        content = f"{title}_{entity_type}".lower()
        return hashlib.md5(content.encode()).hexdigest()
    
    def _generate_relationship_id(self, source: str, target: str) -> str:
        """为关系生成唯一ID"""
        # 排序以确保无论顺序如何都有一致的ID
        sorted_names = sorted([source.lower(), target.lower()])
        content = f"{sorted_names[0]}_{sorted_names[1]}"
        return hashlib.md5(content.encode()).hexdigest()


class HybridGraphExtractor:
    """混合图提取器，可以在LLM和规则方法之间切换"""
    
    def __init__(self, 
                 llm_config: Dict[str, Any] = None,
                 use_llm: bool = True,
                 fallback_to_rules: bool = True):
        """初始化混合提取器
        
        Args:
            llm_config: LLM客户端配置
            use_llm: 是否优先尝试LLM提取
            fallback_to_rules: LLM失败时是否回退到规则方法
        """
        self.use_llm = use_llm
        self.fallback_to_rules = fallback_to_rules
        
        if self.use_llm:
            try:
                self.llm_extractor = LLMGraphExtractor(llm_config=llm_config)
            except Exception as e:
                logger.warning(f"初始化LLM提取器失败: {e}")
                self.llm_extractor = None
                if not self.fallback_to_rules:
                    raise
        else:
            self.llm_extractor = None
        
        if self.fallback_to_rules or not self.use_llm:
            self.rule_extractor = RuleBasedGraphExtractor()
    
    def extract_graph(self, text_units: pd.DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """使用可用方法提取图数据"""
        
        # 如果可用，首先尝试LLM提取
        if self.use_llm and self.llm_extractor:
            try:
                logger.info("尝试使用LLM进行图提取")
                entities, relationships = self.llm_extractor.extract_graph(text_units)
                
                # 检查是否得到合理的结果
                if len(entities) > 0 or len(relationships) > 0:
                    logger.info("LLM提取成功")
                    return entities, relationships
                else:
                    logger.warning("LLM提取未返回结果")
            
            except Exception as e:
                logger.error(f"LLM提取失败: {e}")
        
        # 回退到基于规则的提取
        if self.fallback_to_rules:
            logger.info("使用基于规则的图提取")
            return self.rule_extractor.extract_graph(text_units)
        
        # 如果执行到这里，说明所有方法都失败了
        logger.error("所有提取方法都失败了")
        return pd.DataFrame(), pd.DataFrame()