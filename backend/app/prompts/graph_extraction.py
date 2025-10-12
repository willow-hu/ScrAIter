"""
GraphRAG图提取的系统prompt模板
基于Microsoft GraphRAG的提示词设计
"""

# 主要的图提取prompt模板
GRAPH_EXTRACTION_PROMPT = """
-目标-
给定一个可能与此活动相关的文本文档和实体类型列表，从文本中识别这些类型的所有实体以及所识别实体之间的所有关系。
 
-步骤-
1. 识别所有实体。对于每个识别的实体，提取以下信息：
- entity_name: 实体名称，大写
- entity_type: 以下类型之一: [{entity_types}]
- entity_description: 实体属性和活动的全面描述
将每个实体格式化为 ("entity"{tuple_delimiter}<entity_name>{tuple_delimiter}<entity_type>{tuple_delimiter}<entity_description>)
 
2. 从步骤1中识别的实体中，识别所有*明确相关*的(source_entity, target_entity)对。
对于每对相关实体，提取以下信息：
- source_entity: 源实体名称，如步骤1中识别的
- target_entity: 目标实体名称，如步骤1中识别的
- relationship_description: 解释为什么认为源实体和目标实体相关
- relationship_strength: 表示源实体和目标实体之间关系强度的数字分数
将每个关系格式化为 ("relationship"{tuple_delimiter}<source_entity>{tuple_delimiter}<target_entity>{tuple_delimiter}<relationship_description>{tuple_delimiter}<relationship_strength>)
 
3. 以中文返回输出，作为步骤1和2中识别的所有实体和关系的单个列表。使用**{record_delimiter}**作为列表分隔符。
 
4. 完成后，输出{completion_delimiter}
 
######################
-示例-
######################
示例1:
Entity_types: ORGANIZATION,PERSON
Text:
中央研究院计划在周一和周四召开会议，该机构计划在周四下午1:30发布最新政策决定，随后举行新闻发布会，中央研究院主席张明将回答问题。投资者预期市场策略委员会将维持基准利率在3.5%-3.75%范围内。
######################
Output:
("entity"{tuple_delimiter}中央研究院{tuple_delimiter}ORGANIZATION{tuple_delimiter}中央研究院是负责制定政策的机构，在周一和周四设定利率)
{record_delimiter}
("entity"{tuple_delimiter}张明{tuple_delimiter}PERSON{tuple_delimiter}张明是中央研究院的主席)
{record_delimiter}
("entity"{tuple_delimiter}市场策略委员会{tuple_delimiter}ORGANIZATION{tuple_delimiter}中央研究院下属的委员会，负责关键的利率决策)
{record_delimiter}
("relationship"{tuple_delimiter}张明{tuple_delimiter}中央研究院{tuple_delimiter}张明是中央研究院的主席，将在新闻发布会上回答问题{tuple_delimiter}9)
{completion_delimiter}

######################
示例2:
Entity_types: ORGANIZATION
Text:
科技环球(TG)股票在周四全球交易所开盘日暴涨。但IPO专家警告说，这家半导体公司在公开市场的首次亮相并不能说明其他新上市公司的表现。

科技环球原本是一家公共公司，2014年被远景控股私有化。这家知名芯片设计公司表示为85%的高端智能手机提供动力。
######################
Output:
("entity"{tuple_delimiter}科技环球{tuple_delimiter}ORGANIZATION{tuple_delimiter}科技环球是一家在全球交易所上市的股票，为85%的高端智能手机提供动力)
{record_delimiter}
("entity"{tuple_delimiter}远景控股{tuple_delimiter}ORGANIZATION{tuple_delimiter}远景控股是之前拥有科技环球的公司)
{record_delimiter}
("relationship"{tuple_delimiter}科技环球{tuple_delimiter}远景控股{tuple_delimiter}远景控股从2014年到现在曾经拥有科技环球{tuple_delimiter}5)
{completion_delimiter}

######################
示例3:
Entity_types: ORGANIZATION,GEO,PERSON
Text:
五名奥瑞利亚人在菲鲁扎巴德被判入狱8年，被广泛视为人质，他们正在返回奥瑞利亚的路上。

由昆塔拉协调的交换在80亿美元的菲鲁齐资金转移到昆塔拉首都克罗哈拉的金融机构后最终完成。

在菲鲁扎巴德首都提鲁齐亚开始的交换导致四名男子和一名女子(她们也是菲鲁齐国民)登上包机前往克罗哈拉。

他们受到奥瑞利亚高级官员的欢迎，现在正前往奥瑞利亚首都卡希翁。

奥瑞利亚人包括39岁的商人塞缪尔·纳马拉，他被关押在提鲁齐亚的阿拉米亚监狱，以及记者德克·巴塔格拉尼，59岁，和环保主义者梅吉·塔兹巴，53岁，她也持有布拉蒂纳斯国籍。
######################
Output:
("entity"{tuple_delimiter}菲鲁扎巴德{tuple_delimiter}GEO{tuple_delimiter}菲鲁扎巴德关押奥瑞利亚人质)
{record_delimiter}
("entity"{tuple_delimiter}奥瑞利亚{tuple_delimiter}GEO{tuple_delimiter}寻求释放人质的国家)
{record_delimiter}
("entity"{tuple_delimiter}昆塔拉{tuple_delimiter}GEO{tuple_delimiter}协调金钱换取人质交换的国家)
{record_delimiter}
("entity"{tuple_delimiter}提鲁齐亚{tuple_delimiter}GEO{tuple_delimiter}菲鲁扎巴德的首都，关押奥瑞利亚人的地方)
{record_delimiter}
("entity"{tuple_delimiter}克罗哈拉{tuple_delimiter}GEO{tuple_delimiter}昆塔拉的首都城市)
{record_delimiter}
("entity"{tuple_delimiter}卡希翁{tuple_delimiter}GEO{tuple_delimiter}奥瑞利亚的首都城市)
{record_delimiter}
("entity"{tuple_delimiter}塞缪尔·纳马拉{tuple_delimiter}PERSON{tuple_delimiter}在提鲁齐亚阿拉米亚监狱度过时光的奥瑞利亚人)
{record_delimiter}
("entity"{tuple_delimiter}阿拉米亚监狱{tuple_delimiter}GEO{tuple_delimiter}提鲁齐亚的监狱)
{record_delimiter}
("entity"{tuple_delimiter}德克·巴塔格拉尼{tuple_delimiter}PERSON{tuple_delimiter}被扣为人质的奥瑞利亚记者)
{record_delimiter}
("entity"{tuple_delimiter}梅吉·塔兹巴{tuple_delimiter}PERSON{tuple_delimiter}被扣为人质的布拉蒂纳斯国民和环保主义者)
{record_delimiter}
("relationship"{tuple_delimiter}菲鲁扎巴德{tuple_delimiter}奥瑞利亚{tuple_delimiter}菲鲁扎巴德与奥瑞利亚进行了人质交换谈判{tuple_delimiter}2)
{record_delimiter}
("relationship"{tuple_delimiter}昆塔拉{tuple_delimiter}奥瑞利亚{tuple_delimiter}昆塔拉在菲鲁扎巴德和奥瑞利亚之间协调人质交换{tuple_delimiter}2)
{record_delimiter}
("relationship"{tuple_delimiter}昆塔拉{tuple_delimiter}菲鲁扎巴德{tuple_delimiter}昆塔拉在菲鲁扎巴德和奥瑞利亚之间协调人质交换{tuple_delimiter}2)
{record_delimiter}
("relationship"{tuple_delimiter}塞缪尔·纳马拉{tuple_delimiter}阿拉米亚监狱{tuple_delimiter}塞缪尔·纳马拉是阿拉米亚监狱的囚犯{tuple_delimiter}8)
{record_delimiter}
("relationship"{tuple_delimiter}塞缪尔·纳马拉{tuple_delimiter}梅吉·塔兹巴{tuple_delimiter}塞缪尔·纳马拉和梅吉·塔兹巴在同一次人质释放中被交换{tuple_delimiter}2)
{record_delimiter}
("relationship"{tuple_delimiter}塞缪尔·纳马拉{tuple_delimiter}德克·巴塔格拉尼{tuple_delimiter}塞缪尔·纳马拉和德克·巴塔格拉尼在同一次人质释放中被交换{tuple_delimiter}2)
{record_delimiter}
("relationship"{tuple_delimiter}梅吉·塔兹巴{tuple_delimiter}德克·巴塔格拉尼{tuple_delimiter}梅吉·塔兹巴和德克·巴塔格拉尼在同一次人质释放中被交换{tuple_delimiter}2)
{record_delimiter}
("relationship"{tuple_delimiter}塞缪尔·纳马拉{tuple_delimiter}菲鲁扎巴德{tuple_delimiter}塞缪尔·纳马拉是菲鲁扎巴德的人质{tuple_delimiter}2)
{record_delimiter}
("relationship"{tuple_delimiter}梅吉·塔兹巴{tuple_delimiter}菲鲁扎巴德{tuple_delimiter}梅吉·塔兹巴是菲鲁扎巴德的人质{tuple_delimiter}2)
{record_delimiter}
("relationship"{tuple_delimiter}德克·巴塔格拉尼{tuple_delimiter}菲鲁扎巴德{tuple_delimiter}德克·巴塔格拉尼是菲鲁扎巴德的人质{tuple_delimiter}2)
{completion_delimiter}

######################
-真实数据-
######################
Entity_types: {entity_types}
Text: {input_text}
######################
Output:"""

# 继续提取的prompt
CONTINUE_PROMPT = "上次提取中遗漏了许多实体和关系。请记住只提取与之前提取类型匹配的实体。使用相同格式在下面添加它们：\n"

# 循环检查prompt
LOOP_PROMPT = "似乎可能仍有一些实体和关系被遗漏了。如果仍有需要添加的实体或关系，请回答Y；如果没有，请回答N。请用单个字母Y或N回答。\n"

# 默认分隔符
DEFAULT_TUPLE_DELIMITER = "<|>"
DEFAULT_RECORD_DELIMITER = "##"
DEFAULT_COMPLETION_DELIMITER = "<|COMPLETE|>"

# 默认实体类型
DEFAULT_ENTITY_TYPES = ["organization", "person", "geo", "event"]