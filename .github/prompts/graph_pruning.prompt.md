### ✅ 实现方案：**基于图重要性 + 语义聚类的两阶段剪枝与大纲骨架提取**

目标：从原始图中提取一个**高信息密度、低冗余、保留核心叙事路径**的子图。

##### 步骤 1.1：构建知识图谱（图 G = (V, E)）
- 节点 V = entities.csv 中所有实体（用 `title` 作为节点名，保留 `id` 作为属性）
- 边 E = relationships.csv 中所有关系（用 `source` → `target`，保留 `id`，权重 = `weight`，其中权重在数据中是1-10的整数，这里构建的时候应将其归一化，即除以10）

##### 步骤 1.2：计算节点重要性（使用图论指标）
对每个节点计算 **综合重要性得分**，公式如下：

```python
importance(v) = α * degree_centrality(v) + β * weighted_degree(v) + γ * theme_similarity(v)
```

- `degree_centrality(v)`：节点度数（连接多少关系）→ 衡量“枢纽性”。但是这里不用直接的度数，而是用对数进行归一化，范围在0，1之间。请自行设计公式。
- `weighted_degree(v)`：所有邻接边的 weight 的平均数 → 衡量“事实强度”。
- `theme_similarity(v)`：节点自带的属性，表示与主题的相关性。

> α, β, γ 可设为 (0.3, 0.5, 0.2)，或根据任务微调。**完全可配置，无需训练**。

##### 步骤 1.3：筛选 Top-K 核心实体
- 按 `importance` 排序，取前 N 个节点（N作为参数，根据 API token 预算动态调整）

##### 步骤 1.4：提取子图 G_sub
- 仅保留选中的节点及其之间的边（边也需 weight ≥ 6，过滤弱关联）

##### 步骤 1.5：汇总为dataframe
- 将选中的节点和边，按照id从原文件中查找挑选，生成新的 entities_sub.csv 和 relationships_sub.csv。