"""
图谱剪枝服务
基于纯数学/规则驱动的两阶段剪枝策略
"""
import pandas as pd
import networkx as nx
from typing import Tuple, Set


class GraphPruner:
    """
    图谱剪枝器
    
    使用实体重要性评分(EIS)和关系权重进行两阶段剪枝：
    1. 计算每个实体的重要性得分
    2. 根据关系权重和实体得分过滤关系
    3. 保留参与关系的实体
    """
    
    def __init__(
        self,
        alpha: float = 0.5,  # Degree权重
        beta: float = 0.3,   # TimeCentrality权重
        gamma: float = 0.2,  # TypeWeight权重
        entity_threshold: float = 0.45,  # 实体保留阈值
        relationship_weight_threshold: float = 7.0,  # 关系权重阈值
        key_year_weight_threshold: float = 9.0,  # 识别关键年份的关系权重阈值
        heritage_site_min_eis: float = 0.3,  # heritage_site最低EIS阈值
        important_artifact_weight_threshold: float = 7.0  # 重要文物判定的关系权重阈值
    ):
        """
        初始化剪枝器参数
        
        Args:
            alpha: Degree在EIS中的权重系数
            beta: TimeCentrality在EIS中的权重系数
            gamma: TypeWeight在EIS中的权重系数
            entity_threshold: 实体保留的EIS阈值
            relationship_weight_threshold: 关系保留的最低权重
            key_year_weight_threshold: 识别关键年份的关系权重阈值
            heritage_site_min_eis: heritage_site类型实体强制保留的最低EIS
            important_artifact_weight_threshold: 区分重要文物和普通构件的关系权重阈值
        """
        self.alpha = alpha
        self.beta = beta
        self.gamma = gamma
        self.entity_threshold = entity_threshold
        self.relationship_weight_threshold = relationship_weight_threshold
        self.key_year_weight_threshold = key_year_weight_threshold
        self.heritage_site_min_eis = heritage_site_min_eis
        self.important_artifact_weight_threshold = important_artifact_weight_threshold
        
        # 实体类型基础权重
        self.type_weights = {
            "heritage_site": 1.0,
            "person": 0.9,
            "event": 0.9,
            "artifact": 0.8,
            "time_period": 0.6,
            "location": 0.5,
            "concept": 0.2,
            "organization": 0.2
        }
    
    def prune(
        self,
        entities_df: pd.DataFrame,
        relationships_df: pd.DataFrame
    ) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """
        执行图谱剪枝
        
        Args:
            entities_df: 实体DataFrame，需包含列: id, title, type, normalized_date
            relationships_df: 关系DataFrame，需包含列: source, target, weight, relationship_time
            
        Returns:
            (pruned_entities_df, pruned_relationships_df): 剪枝后的实体和关系DataFrame
        """
        # 复制数据避免修改原始DataFrame
        entities = entities_df.copy()
        relationships = relationships_df.copy()
        
        # Step 1: 构建图并计算度数
        G = self._build_graph(relationships)
        degree_dict: dict = dict(G.degree())  # type: ignore
        max_degree: float = max(degree_dict.values()) if len(degree_dict) > 0 else 1.0
        
        # 为实体添加归一化度数
        entities['degree_norm'] = entities['title'].apply(
            lambda x: degree_dict.get(x, 0) / max_degree if max_degree > 0 else 0.0
        )
        
        # Step 2: 识别关键年份
        key_years = self._identify_key_years(relationships)
        
        # Step 3: 计算每个实体的EIS
        entities['EIS'] = entities.apply(
            lambda row: self._calculate_eis(row, key_years, relationships),
            axis=1
        )
        
        # Step 4: 过滤关系
        kept_relationships = self._filter_relationships(relationships, entities)
        
        # Step 5: 过滤实体
        kept_entities = self._filter_entities(entities, kept_relationships)
        
        # 返回剪枝后的数据，移除临时列
        kept_entities = kept_entities.drop(columns=['degree_norm', 'EIS'])
        
        return kept_entities, kept_relationships
    
    def _build_graph(self, relationships_df: pd.DataFrame) -> nx.Graph:
        """
        从关系DataFrame构建NetworkX无向图
        
        Args:
            relationships_df: 关系DataFrame
            
        Returns:
            NetworkX图对象
        """
        G = nx.Graph()
        for _, row in relationships_df.iterrows():
            G.add_edge(row['source'], row['target'])
        return G
    
    def _identify_key_years(self, relationships_df: pd.DataFrame) -> Set[str]:
        """
        从高权重关系中识别关键年份
        
        Args:
            relationships_df: 关系DataFrame
            
        Returns:
            关键年份集合
        """
        key_years = set()
        for _, row in relationships_df.iterrows():
            if row['weight'] >= self.key_year_weight_threshold:
                time_str = str(row.get('relationship_time', '')).strip()
                if time_str and time_str != 'nan':
                    key_years.add(time_str)
        return key_years
    
    def _calculate_time_centrality(
        self,
        normalized_date: str,
        key_years: Set[str]
    ) -> float:
        """
        计算时间中心性得分
        
        Args:
            normalized_date: 实体的标准化日期
            key_years: 关键年份集合
            
        Returns:
            时间中心性得分 (0, 0.5, 或 1.0)
        """
        date_str = str(normalized_date).strip()
        if not date_str or date_str == 'nan':
            return 0.0
        
        if date_str in key_years:
            return 1.0
        else:
            return 0.5
    
    def _calculate_type_weight(
        self,
        entity_type: str,
        entity_title: str,
        relationships_df: pd.DataFrame
    ) -> float:
        """
        计算实体类型权重
        
        对于artifact类型，根据其参与的关系权重判断是重要文物还是普通构件
        
        Args:
            entity_type: 实体类型
            entity_title: 实体标题
            relationships_df: 关系DataFrame
            
        Returns:
            类型权重得分
        """
        # 获取基础权重
        base_weight = self.type_weights.get(entity_type, 0.4)
        
        # 对artifact类型进行特殊处理
        if entity_type == "artifact":
            # 检查是否参与高权重关系
            involved_relations = relationships_df[
                (relationships_df['source'] == entity_title) |
                (relationships_df['target'] == entity_title)
            ]
            has_high_weight = (involved_relations['weight'] >= self.important_artifact_weight_threshold).any()
            
            return 0.8 if has_high_weight else 0.3
        
        return base_weight
    
    def _calculate_eis(
        self,
        entity_row: pd.Series,
        key_years: Set[str],
        relationships_df: pd.DataFrame
    ) -> float:
        """
        计算实体重要性得分 (Entity Importance Score)
        
        EIS = α * Degree + β * TimeCentrality + γ * TypeWeight
        
        Args:
            entity_row: 实体行数据
            key_years: 关键年份集合
            relationships_df: 关系DataFrame
            
        Returns:
            EIS得分 (0到1之间)
        """
        # 计算三个组成部分
        degree_score = entity_row['degree_norm']
        
        time_score = self._calculate_time_centrality(
            entity_row.get('normalized_date', ''),
            key_years
        )
        
        type_score = self._calculate_type_weight(
            entity_row['type'],
            entity_row['title'],
            relationships_df
        )
        
        # 加权求和
        eis = (
            self.alpha * degree_score +
            self.beta * time_score +
            self.gamma * type_score
        )
        
        return eis
    
    def _filter_relationships(
        self,
        relationships_df: pd.DataFrame,
        entities_df: pd.DataFrame
    ) -> pd.DataFrame:
        """
        过滤关系：保留高权重关系或连接两个高EIS实体的关系
        
        Args:
            relationships_df: 关系DataFrame
            entities_df: 带有EIS的实体DataFrame
            
        Returns:
            过滤后的关系DataFrame
        """
        # 创建title到EIS的映射
        title_to_eis = dict(zip(entities_df['title'], entities_df['EIS']))
        
        # 过滤条件：weight >= threshold 或 两端实体EIS都 >= entity_threshold
        def should_keep_relationship(row):
            if row['weight'] >= self.relationship_weight_threshold:
                return True
            
            source_eis = title_to_eis.get(row['source'], 0.0)
            target_eis = title_to_eis.get(row['target'], 0.0)
            
            if source_eis >= self.entity_threshold and target_eis >= self.entity_threshold:
                return True
            
            return False
        
        kept_relationships = relationships_df[
            relationships_df.apply(should_keep_relationship, axis=1)
        ].copy()
        
        return kept_relationships
    
    def _filter_entities(
        self,
        entities_df: pd.DataFrame,
        kept_relationships_df: pd.DataFrame
    ) -> pd.DataFrame:
        """
        过滤实体：保留参与关系的实体 + 高EIS的heritage_site
        
        Args:
            entities_df: 带有EIS的实体DataFrame
            kept_relationships_df: 过滤后的关系DataFrame
            
        Returns:
            过滤后的实体DataFrame
        """
        # 收集参与关系的实体title
        kept_entity_titles = set()
        for _, row in kept_relationships_df.iterrows():
            kept_entity_titles.add(row['source'])
            kept_entity_titles.add(row['target'])
        
        # 确保重要的heritage_site被保留
        for _, entity in entities_df.iterrows():
            if (entity['type'] == 'heritage_site' and 
                entity['EIS'] >= self.heritage_site_min_eis):
                kept_entity_titles.add(entity['title'])
        
        # 过滤实体
        kept_entities = entities_df[
            entities_df['title'].isin(kept_entity_titles)
        ].copy()
        
        return kept_entities


# ==================== 测试代码 ====================
if __name__ == "__main__":
    import os
    from pathlib import Path
    
    # 设置路径
    base_dir = Path(__file__).parent.parent.parent.parent
    input_dir = base_dir / "shared" / "knowledge_bases" / "GraphStore" / "kb_1761556076358_780_1027r1"
    output_dir = base_dir / "shared" / "knowledge_bases" / "GraphStore" / "kb_1761556076358_780_1027r1_pruned"
    
    # 创建输出目录
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print("=" * 60)
    print("图谱剪枝测试")
    print("=" * 60)
    
    # 加载数据
    print(f"\n📂 加载数据从: {input_dir}")
    entities_df = pd.read_csv(input_dir / "entities.csv")
    relationships_df = pd.read_csv(input_dir / "relationships.csv")
    
    print(f"   原始实体数: {len(entities_df)}")
    print(f"   原始关系数: {len(relationships_df)}")
    
    # 创建剪枝器
    print(f"\n⚙️  初始化剪枝器...")
    pruner = GraphPruner(
        alpha=0.5,
        beta=0.0,
        gamma=0.5,
        entity_threshold=0.8,
        relationship_weight_threshold=8.0,
        key_year_weight_threshold=9.5,
        heritage_site_min_eis=0.5, 
        important_artifact_weight_threshold=8.0
    )
    
    print(f"   参数配置:")
    print(f"     - α (Degree权重): {pruner.alpha}")
    print(f"     - β (TimeCentrality权重): {pruner.beta}")
    print(f"     - γ (TypeWeight权重): {pruner.gamma}")
    print(f"     - 实体保留阈值: {pruner.entity_threshold}")
    print(f"     - 关系权重阈值: {pruner.relationship_weight_threshold}")
    
    # 执行剪枝
    print(f"\n🔧 执行剪枝...")
    pruned_entities, pruned_relationships = pruner.prune(
        entities_df,
        relationships_df
    )
    
    print(f"   剪枝后实体数: {len(pruned_entities)}")
    print(f"   剪枝后关系数: {len(pruned_relationships)}")
    print(f"   实体保留率: {len(pruned_entities)/len(entities_df)*100:.1f}%")
    print(f"   关系保留率: {len(pruned_relationships)/len(relationships_df)*100:.1f}%")
    
    # 统计实体类型分布
    print(f"\n📊 剪枝后实体类型分布:")
    type_counts = pruned_entities['type'].value_counts()
    for entity_type, count in type_counts.items():
        print(f"     - {entity_type}: {count}")
    
    # 保存结果
    print(f"\n💾 保存结果到: {output_dir}")
    pruned_entities.to_csv(output_dir / "entities.csv", index=False, encoding='utf-8-sig')
    pruned_relationships.to_csv(output_dir / "relationships.csv", index=False, encoding='utf-8-sig')
    
    print(f"   ✅ entities.csv")
    print(f"   ✅ relationships.csv")
    
    print(f"\n" + "=" * 60)
    print("✨ 剪枝完成！")
    print("=" * 60)
