# 系统任务
前一步系统已从提供的知识库中提取出了实体和关系，并检测了社区。整体图谱构建任务已完成，你的任务是设计一个图的剪枝算法，保留核心的信息，删去过于细节的部分。
这一步的结果将提供给LLM，让大模型根据知识结构生成一个交互式对话游戏的剧本大纲。
要求剪枝算法不可以使用LLM，而是使用简单的数学方法，减少对计算资源的消耗。

# 文件说明
这三个文件分别是从知识库中提取出来的实体、关系、和社区（社区是对实体的聚类，社区下的实体属于同一主题）。
`entities.csv`：实体列表
- title: 实体名称
- type: 实体类型
- id: 实体对应的唯一id
- description: 对该实体的全面中文描述，应包含其功能、位置、历史角色或文化价值等关键信息
- normalized_date: 实体的年代、时间区间或所属朝代。空字符串表示无明确时间指示
其余列不重要，可以忽略。

`relationships.csv`：关系列表
- source: 源实体名称
- target: 目标实体名称
- id: 关系对应的唯一id
- description: 解释二者的关联
- relationship_time: 关系发生的明确时间（年份、朝代或区间）。空字符串表示无明确时间
- weight: 关系强度分数（0–10），评分标准如下：
  • 9–10：文本直接明确陈述，且为理解该文化遗产历史的核心事实；
  • 7–8：文本直接陈述，但属辅助性事实；
  • 5–6：未直接陈述，但可合理推断；
  • 3–4：弱关联或仅共现；
  • 1–2：高度推测或边缘信息。

`communities.csv`：社区列表
- id: 社区的唯一标识符（MD5哈希值）
- title: 社区的描述性标题，格式为"Community X (Level Y, Z entities)"
- level: 社区的层级（0表示基础层级）
- community: 社区的数字编号（0, 1, 2...）
- parent: 父级社区ID（空表示顶级社区）
- entity_ids: 该社区包含的实体ID列表（用字符串形式存储的数组）
- size: 社区中实体的数量

# 说明
- 以上文件是一个范例，实际文件会根据具体的文化遗产有所不同，请保证你的算法的泛化性。
- 请结合示例中的结构进行分析。例如，我已观察到社区检测的结果中，level 0的社区非常多，意味着社区检测算法可能没有很好地总结知识结构。因此是否可以考虑舍弃社区，只使用实体和关系。


---

## ✅ 剪枝目标
- 保留：**关键历史事件、核心建筑、重要人物、标志性文物、重大时间节点**
- 删除：**过于琐碎的构件（如“覆盆”“管脚榫”）、次要出土物（如“武士俑”）、重复或低信息量实体（如多个相似时间点）**

---

## 🧠 剪枝策略（纯数学/规则驱动，无需LLM）

我们将采用**两阶段剪枝**：

### 第一阶段：实体重要性评分（Entity Importance Score, EIS）

对每个实体 $ e $，计算其重要性得分：

$$
\text{EIS}(e) = \alpha \cdot \text{Degree}(e) + \beta \cdot \text{TimeCentrality}(e) + \gamma \cdot \text{TypeWeight}(e)
$$

其中：

#### 1. **Degree(e)**：该实体在关系图中的度数（连接的关系数量）
- 直接反映“枢纽性”
- 归一化：除以图中最大度数，使值 ∈ [0,1]

#### 2. **TimeCentrality(e)**：
- 若 `normalized_date` 非空，且为**关键历史节点**（如 982年建塔、1860年毁寺、1954年修复），则得分为 1；
- 若为模糊时间（如“宋代”“明清”）或普通年份（如“1135年修塔”），得分为 0.5；
- 若无时间信息，得分为 0。
- *实现方式*：预设一个“关键事件年份集合”（从 relationships 中提取 weight ≥ 9 且有明确年份的关系时间），若实体的 normalized_date 属于该集合，则 TimeCentrality = 1。

#### 3. **TypeWeight(e)**：根据实体类型赋予基础权重
| type | 权重 |
|------|------|
| heritage_site | 1.0 |
| person | 0.9 |
| event | 0.9 |
| artifact（重要文物）| 0.8 |
| time_period（关键年份）| 0.7 |
| location | 0.6 |
| artifact（普通构件）| 0.3 |
| concept / organization（非核心）| 0.4 |

> **如何区分“重要文物” vs “普通构件”**？  
> 简单规则：若该 artifact 在 relationships 中至少有一条 weight ≥ 7 的关系，则视为重要文物，否则为普通构件。

#### 权重系数建议（可调）：
- $\alpha = 0.5$, $\beta = 0.3$, $\gamma = 0.2$

最终 EIS ∈ [0,1]

---

### 第二阶段：关系重要性过滤

对每条关系 $ r = (u, v) $，保留当且仅当：
- $ \text{weight}(r) \geq 7 $ **或**
- $ \text{EIS}(u) \geq T_e $ **且** $ \text{EIS}(v) \geq T_e $

其中 $ T_e $ 是实体保留阈值（如 0.45）

> 这样可保留：  
> - 高权重关系（核心事实）  
> - 两个高重要性实体之间的中等关系（即使 weight=5，也可能有意义）

---

### 第三阶段：实体保留规则

保留实体 $ e $ 当且仅当：
- 它参与了至少一条被保留的关系 **或**
- 它是 **heritage_site** 且 EIS ≥ 0.3（确保主遗址不被误删）

---

## 🛠️ 算法步骤（伪代码）

```python
# Step 1: Load data
entities = load_entities("entities.csv")
relationships = load_relationships("relationships.csv")

# Step 2: Build graph and compute degree
G = build_graph(relationships)
max_degree = max(deg for deg in G.degree().values())
for e in entities:
    e.degree_norm = G.degree(e.id) / max_degree if max_degree > 0 else 0

# Step 3: Identify key years from high-weight relationships
key_years = set()
for r in relationships:
    if r.weight >= 9 and r.relationship_time.strip() != "":
        key_years.add(r.relationship_time)

# Step 4: Compute EIS for each entity
for e in entities:
    # TimeCentrality
    if e.normalized_date in key_years:
        tc = 1.0
    elif e.normalized_date != "":
        tc = 0.5
    else:
        tc = 0.0

    # TypeWeight
    if e.type == "heritage_site":
        tw = 1.0
    elif e.type in ["person", "event"]:
        tw = 0.9
    elif e.type == "artifact":
        # check if involved in any high-weight relation
        high_weight = any(r.weight >= 7 for r in relationships if r.source==e.title or r.target==e.title)
        tw = 0.8 if high_weight else 0.3
    elif e.type == "time_period":
        tw = 0.7
    elif e.type == "location":
        tw = 0.6
    else:
        tw = 0.4

    e.EIS = 0.5 * e.degree_norm + 0.3 * tc + 0.2 * tw

# Step 5: Filter relationships
kept_relations = []
for r in relationships:
    u = get_entity_by_title(r.source)
    v = get_entity_by_title(r.target)
    if r.weight >= 7 or (u.EIS >= 0.45 and v.EIS >= 0.45):
        kept_relations.append(r)

# Step 6: Filter entities
kept_entity_ids = set()
for r in kept_relations:
    kept_entity_ids.add(get_id_by_title(r.source))
    kept_entity_ids.add(get_id_by_title(r.target))

# Ensure main heritage sites are kept
for e in entities:
    if e.type == "heritage_site" and e.EIS >= 0.3:
        kept_entity_ids.add(e.id)

final_entities = [e for e in entities if e.id in kept_entity_ids]
```

---

## ✅ 输出
- 剪枝后的 `entities_pruned.csv`
- 剪枝后的 `relationships_pruned.csv`
