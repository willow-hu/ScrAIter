"""
GraphRAG图提取的系统prompt模板（文化遗产优化版）
基于Microsoft GraphRAG提示词重构，专用于中文历史景点与文化遗产知识图谱构建
"""

# 主要的图提取prompt模板
GRAPH_EXTRACTION_PROMPT = """
-目标-
给定一个可能与主题（某景点/文化遗产）相关的文本文档和实体类型列表，从文本中识别这些类型的所有实体以及所识别实体之间的所有关系。
重要！**仅提取与主题直接相关的实体和关系。若文本中提及其它地点仅为类比、参考或背景信息，不得提取其相关实体，除非明确说明其与主题存在直接关联。**
重点支持历史沿革（时间线）、人物-时间-事件对应，以及地点/遗产/文物之间的空间、归属或功能关系，以便后续生成交互式剧本与结构化知识大纲。

-步骤-
1. 识别所有实体。对于每个识别的实体，提取以下信息：
- entity_name: 实体名称（使用文中出现的规范化中文名称）；对于同一个实体，文中可能有多个别名或简称，请统一名称，尽量用全称。
- entity_type: 以下类型之一: [{entity_types}]
- entity_description: 对该实体的全面中文描述，应包含其功能、位置、历史角色或文化价值等关键信息（基于原文）
- entity_normalized_date: 若实体有明确年代、时间区间或所属朝代，请归一化为简洁易读格式（如“618–907”、“1900”、“公元前221年”）；若无，则填“无”。
- theme_similarity: 在0–1范围内的浮点数，表示该实体与文本主题的相关性（1表示高度相关，0表示无关）。若实体属于文献引用、对比案例或无关背景，即使文中出现，也应设为theme_similarity=0。
将每个实体格式化为 ("entity"{tuple_delimiter}<entity_name>{tuple_delimiter}<entity_type>{tuple_delimiter}<entity_description>{tuple_delimiter}<entity_normalized_date>{tuple_delimiter}<theme_similarity>)

2. 从步骤1中识别的所有实体中，识别所有*在历史文化语境下明确相关*的 (source_entity, target_entity) 对。
特别关注以下关系类型：人物与事件、人物与时间、事件与时间、人物与遗产、景点/文物之间的从属关系等。
对于每对相关实体，提取以下信息：
- source_entity: 源实体名称（必须与步骤1中完全一致）
- target_entity: 目标实体名称（必须与步骤1中完全一致）
- relationship_description: 用一句中文解释二者关联，尽量引用或转述原文依据
- relationship_time: 若关系发生有明确时间（年份、朝代或区间），请归一化填写（如“1406–1420”、“1974”）；否则填“无”。
- relationship_strength: 关系强度分数（0–10），评分标准如下：
  • 9–10：文本直接明确陈述，且为理解该文化遗产历史的核心事实；
  • 7–8：文本直接陈述，但属辅助性事实；
  • 5–6：未直接陈述，但可合理推断；
  • 3–4：弱关联或仅共现；
  • 1–2：高度推测或边缘信息。
  请严格依据原文证据强度与叙事重要性打分。
将每个关系格式化为 ("relationship"{tuple_delimiter}<source_entity>{tuple_delimiter}<target_entity>{tuple_delimiter}<relationship_description>{tuple_delimiter}<relationship_time>{tuple_delimiter}<relationship_strength>)

3. 输出要求：
- 以中文返回输出，作为步骤1和2中识别的所有实体和关系的单个列表。
- 每条记录独占一行，记录之间使用**{record_delimiter}**分隔。
- 字段之间使用**{tuple_delimiter}**分隔，即使某字段为空也必须保留占位（用空字符串）。
- 完成后，输出{completion_delimiter}

######################
-示例-
######################
示例1:
实体类型: PERSON,LOCATION,HERITAGE_SITE,ARTIFACT,EVENT,TIME_PERIOD,ORGANIZATION
主题: 敦煌莫高窟
文本:
莫高窟始建于十六国时期，历经北魏、隋唐不断开凿。唐代（618–907）是其艺术鼎盛期。1900年，道士王圆箓在清理积沙时发现藏经洞，内藏5万余件4至11世纪的文书。著名画家吴道子虽未亲至敦煌，但其“吴带当风”风格深刻影响了唐代壁画。

Output:
("entity"{tuple_delimiter}莫高窟{tuple_delimiter}HERITAGE_SITE{tuple_delimiter}位于敦煌的佛教石窟群，始建于十六国，盛于唐代{tuple_delimiter}304–439{tuple_delimiter}1.0)
{record_delimiter}
("entity"{tuple_delimiter}十六国时期{tuple_delimiter}TIME_PERIOD{tuple_delimiter}中国历史上的分裂时期，莫高窟始建于此{tuple_delimiter}304–439{tuple_delimiter}0.9)
{record_delimiter}
("entity"{tuple_delimiter}唐代{tuple_delimiter}TIME_PERIOD{tuple_delimiter}公元618至907年，莫高窟艺术鼎盛期{tuple_delimiter}618–907{tuple_delimiter}0.9)
{record_delimiter}
("entity"{tuple_delimiter}王圆箓{tuple_delimiter}PERSON{tuple_delimiter}清末道士，1900年发现莫高窟藏经洞{tuple_delimiter}1850–1931{tuple_delimiter}0.9)
{record_delimiter}
("entity"{tuple_delimiter}藏经洞{tuple_delimiter}HERITAGE_SITE{tuple_delimiter}莫高窟第17窟，1900年发现，藏有5万余件古代文书{tuple_delimiter}1900{tuple_delimiter}1.0)
{record_delimiter}
("entity"{tuple_delimiter}吴道子{tuple_delimiter}PERSON{tuple_delimiter}唐代著名画家，风格影响敦煌壁画{tuple_delimiter}约680–759{tuple_delimiter}0.6)
{record_delimiter}
("entity"{tuple_delimiter}1900年{tuple_delimiter}TIME_PERIOD{tuple_delimiter}藏经洞被发现的年份{tuple_delimiter}1900{tuple_delimiter}0.9)
{record_delimiter}
("relationship"{tuple_delimiter}莫高窟{tuple_delimiter}十六国时期{tuple_delimiter}莫高窟始建于十六国时期{tuple_delimiter}304–439{tuple_delimiter}10)
{record_delimiter}
("relationship"{tuple_delimiter}莫高窟{tuple_delimiter}唐代{tuple_delimiter}唐代是莫高窟艺术的鼎盛期{tuple_delimiter}618–907{tuple_delimiter}9)
{record_delimiter}
("relationship"{tuple_delimiter}王圆箓{tuple_delimiter}藏经洞{tuple_delimiter}王圆箓于1900年发现藏经洞{tuple_delimiter}1900{tuple_delimiter}10)
{record_delimiter}
("relationship"{tuple_delimiter}吴道子{tuple_delimiter}莫高窟{tuple_delimiter}吴道子的绘画风格对敦煌壁画有深远影响{tuple_delimiter}{tuple_delimiter}6)
{record_delimiter}
("relationship"{tuple_delimiter}藏经洞{tuple_delimiter}1900年{tuple_delimiter}藏经洞于1900年被发现{tuple_delimiter}1900{tuple_delimiter}10)
{completion_delimiter}

######################
示例2:
实体类型: PERSON,LOCATION,HERITAGE_SITE,ARTIFACT,EVENT,TIME_PERIOD,ORGANIZATION
主题: 北京故宫
文本:
北京故宫始建于明永乐四年（1406年），永乐十八年（1420年）建成，是明清两代皇家宫殿。1912年清朝灭亡，末代皇帝溥仪仍居内廷，直至1924年被冯玉祥驱逐。1925年，故宫博物院正式成立。

Output:
("entity"{tuple_delimiter}北京故宫{tuple_delimiter}HERITAGE_SITE{tuple_delimiter}明清皇家宫殿，位于北京中轴线，世界文化遗产{tuple_delimiter}1406–1420{tuple_delimiter}1.0)
{record_delimiter}
("entity"{tuple_delimiter}明永乐四年{tuple_delimiter}TIME_PERIOD{tuple_delimiter}公元1406年，故宫始建年份{tuple_delimiter}1406{tuple_delimiter}0.9)
{record_delimiter}
("entity"{tuple_delimiter}永乐十八年{tuple_delimiter}TIME_PERIOD{tuple_delimiter}公元1420年，故宫建成年份{tuple_delimiter}1420{tuple_delimiter}0.9)
{record_delimiter}
("entity"{tuple_delimiter}溥仪{tuple_delimiter}PERSON{tuple_delimiter}清朝末代皇帝，1912年后仍居故宫至1924年{tuple_delimiter}1906–1967{tuple_delimiter}0.9)
{record_delimiter}
("entity"{tuple_delimiter}冯玉祥{tuple_delimiter}PERSON{tuple_delimiter}民国将领，1924年驱逐溥仪出宫{tuple_delimiter}1882–1948{tuple_delimiter}0.5)
{record_delimiter}
("entity"{tuple_delimiter}故宫博物院{tuple_delimiter}ORGANIZATION{tuple_delimiter}1925年成立于北京故宫，负责文物保管与展示{tuple_delimiter}1925{tuple_delimiter}0.8)
{record_delimiter}
("entity"{tuple_delimiter}1912年{tuple_delimiter}TIME_PERIOD{tuple_delimiter}清朝灭亡年份{tuple_delimiter}1912{tuple_delimiter}0.4)
{record_delimiter}
("entity"{tuple_delimiter}1924年{tuple_delimiter}TIME_PERIOD{tuple_delimiter}溥仪被驱逐出故宫的年份{tuple_delimiter}1924{tuple_delimiter}0.5)
{record_delimiter}
("relationship"{tuple_delimiter}北京故宫{tuple_delimiter}明永乐四年{tuple_delimiter}北京故宫始建于明永乐四年（1406年）{tuple_delimiter}1406{tuple_delimiter}10)
{record_delimiter}
("relationship"{tuple_delimiter}北京故宫{tuple_delimiter}永乐十八年{tuple_delimiter}北京故宫于永乐十八年（1420年）建成{tuple_delimiter}1420{tuple_delimiter}10)
{record_delimiter}
("relationship"{tuple_delimiter}溥仪{tuple_delimiter}北京故宫{tuple_delimiter}溥仪在1912–1924年间居住于故宫内廷{tuple_delimiter}1912–1924{tuple_delimiter}8)
{record_delimiter}
("relationship"{tuple_delimiter}冯玉祥{tuple_delimiter}溥仪{tuple_delimiter}冯玉祥于1924年下令驱逐溥仪出宫{tuple_delimiter}1924{tuple_delimiter}9)
{record_delimiter}
("relationship"{tuple_delimiter}故宫博物院{tuple_delimiter}北京故宫{tuple_delimiter}故宫博物院于1925年在故宫基础上成立{tuple_delimiter}1925{tuple_delimiter}10)
{completion_delimiter}

######################
示例3:
实体类型: PERSON,LOCATION,HERITAGE_SITE,ARTIFACT,EVENT,TIME_PERIOD,ORGANIZATION
主题: 秦始皇陵兵马俑
文本:
1974年，陕西临潼的农民打井时意外发现秦始皇陵兵马俑。这些陶俑是秦始皇陵的陪葬坑，始建于公元前246年，历时38年建成。秦始皇嬴政统一六国后，下令修建这座陵墓。

Output:
("entity"{tuple_delimiter}秦始皇陵兵马俑{tuple_delimiter}ARTIFACT{tuple_delimiter}秦代大型陶俑群，1974年发现于陕西临潼，为秦始皇陵陪葬{tuple_delimiter}-210{tuple_delimiter}1.0)
{record_delimiter}
("entity"{tuple_delimiter}1974年{tuple_delimiter}TIME_PERIOD{tuple_delimiter}兵马俑被发现的年份{tuple_delimiter}1974{tuple_delimiter}0.9)
{record_delimiter}
("entity"{tuple_delimiter}陕西临潼{tuple_delimiter}LOCATION{tuple_delimiter}今西安市临潼区，兵马俑发现地{tuple_delimiter}无{tuple_delimiter}1.0)
{record_delimiter}
("entity"{tuple_delimiter}秦始皇陵{tuple_delimiter}HERITAGE_SITE{tuple_delimiter}秦始皇嬴政的陵墓，位于临潼，始建于公元前246年{tuple_delimiter}-246–-208{tuple_delimiter}1.0)
{record_delimiter}
("entity"{tuple_delimiter}秦始皇嬴政{tuple_delimiter}PERSON{tuple_delimiter}秦朝开国皇帝，统一六国，下令修建陵墓{tuple_delimiter}-259–-210{tuple_delimiter}1.0)
{record_delimiter}
("entity"{tuple_delimiter}统一六国{tuple_delimiter}EVENT{tuple_delimiter}秦始皇嬴政完成中国首次大一统的历史事件{tuple_delimiter}-230–-221{tuple_delimiter}0.6)
{record_delimiter}
("relationship"{tuple_delimiter}秦始皇陵兵马俑{tuple_delimiter}1974年{tuple_delimiter}兵马俑于1974年被发现{tuple_delimiter}1974{tuple_delimiter}10)
{record_delimiter}
("relationship"{tuple_delimiter}秦始皇陵兵马俑{tuple_delimiter}陕西临潼{tuple_delimiter}兵马俑发现于陕西临潼{tuple_delimiter}{tuple_delimiter}10)
{record_delimiter}
("relationship"{tuple_delimiter}秦始皇陵兵马俑{tuple_delimiter}秦始皇陵{tuple_delimiter}兵马俑是秦始皇陵的陪葬坑{tuple_delimiter}{tuple_delimiter}10)
{record_delimiter}
("relationship"{tuple_delimiter}秦始皇陵{tuple_delimiter}-246年{tuple_delimiter}秦始皇陵始建于公元前246年{tuple_delimiter}-246{tuple_delimiter}10)
{record_delimiter}
("relationship"{tuple_delimiter}秦始皇嬴政{tuple_delimiter}统一六国{tuple_delimiter}秦始皇嬴政完成了统一六国的伟业{tuple_delimiter}-230–-221{tuple_delimiter}10)
{record_delimiter}
("relationship"{tuple_delimiter}秦始皇嬴政{tuple_delimiter}秦始皇陵{tuple_delimiter}秦始皇嬴政下令修建自己的陵墓{tuple_delimiter}-246{tuple_delimiter}9)
{completion_delimiter}

######################
-真实数据-
######################
实体类型: {entity_types}
主题: {theme}
文本: {input_text}
######################
Output:"""

# 继续提取的prompt
CONTINUE_PROMPT = "上次提取中可能遗漏了部分实体或关系。请仅提取与指定实体类型匹配的内容，并使用相同格式在下方补充：\n"

# 循环检查prompt
LOOP_PROMPT = "是否仍有实体或关系未被提取？如有，请回答Y；如无，请回答N。仅用单个字母回答。\n"

# 默认分隔符
DEFAULT_TUPLE_DELIMITER = "<|>"
DEFAULT_RECORD_DELIMITER = "##"
DEFAULT_COMPLETION_DELIMITER = "<|COMPLETE|>"

# 默认实体类型
DEFAULT_ENTITY_TYPES = ["PERSON", "LOCATION", "HERITAGE_SITE", "ARTIFACT", "EVENT", "TIME_PERIOD", "ORGANIZATION"]