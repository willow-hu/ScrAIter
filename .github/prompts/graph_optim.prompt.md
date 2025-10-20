## 📊 性能瓶颈分析

从日志可以看到：**5个文本单元耗时53.15秒，平均每个10.63秒**。按此计算，100个文本块需要约**17.7分钟**，这确实需要优化。

## 🚀 优化建议

### 1. **并发处理 (最大优化潜力)**

**当前问题：**
- 使用同步循环 `for i, (idx, text_unit) in enumerate(text_units.iterrows())`
- 每个文本单元串行处理，无法利用网络I/O等待时间

**优化方案：**
```python
import asyncio
import aiohttp

# 异步并发处理
async def process_units_concurrently(text_units, max_concurrent=3):
    semaphore = asyncio.Semaphore(max_concurrent)
    tasks = [process_unit_async(unit, semaphore) for unit in text_units]
    results = await asyncio.gather(*tasks, return_exceptions=True)
```

**预期效果：** 3-5倍性能提升

### 2. **批量处理 (减少API调用次数)**

**当前问题：**
- 每个文本单元单独调用LLM
- 5个文本单元 = 5次API调用

**优化方案：**
```python
# 将多个短文本合并为一个请求
def batch_extract(text_units, batch_size=3):
    batched_text = "\n---DOCUMENT_SEPARATOR---\n".join(texts)
    # 一次LLM调用处理多个文档
```

**预期效果：** 减少60-80%的API调用次数

### 3. **智能文本过滤 (跳过无价值文本)**

**当前问题：**
- 所有文本都进行LLM处理，无论长度和质量

**优化方案：**
```python
def should_process_text(text):
    # 跳过过短文本 (< 50字符)
    if len(text.strip()) < 50:
        return False
    # 跳过纯数字/符号文本
    if re.match(r'^[\d\s\-\.,]+$', text):
        return False
    # 跳过重复度高的文本
    return True
```

**预期效果：** 减少20-40%的无效处理

### 4. **缓存机制 (避免重复处理)**

**当前问题：**
- 相似或重复文本重复处理

**优化方案：**
```python
import hashlib

def get_text_hash(text):
    return hashlib.md5(text.encode()).hexdigest()

# 文本相似度缓存
cache = {}
if text_hash in cache:
    return cache[text_hash]
```

**预期效果：** 减少10-30%的重复处理

### 7. **渐进式处理策略**

**当前问题：**
- 一次性处理所有要求

**优化方案：**
```python
# 两阶段处理
# 阶段1：快速实体识别（简单prompt）
# 阶段2：关系提取（只对有实体的文本）
```

**预期效果：** 40-60%的处理时间节省

### 8. **参数调优**

**当前设置：**
```python
max_tokens=4000  # 可能过大
temperature=0.0  # 无随机性，较慢
```

**优化建议：**
```python
max_tokens=1500  # 根据实际需要调整
temperature=0.1  # 轻微随机性，加快生成
```

## 🎯 推荐实施顺序

### 阶段1（立即实施）：
1. **智能文本过滤** - 简单有效
2. **参数调优** - 无代码改动
3. **模型选择优化** - 配置修改

### 阶段2（短期实施）：
1. **Prompt简化** - 提高单次效率
2. **批量处理** - 减少API调用
3. **缓存机制** - 避免重复

### 阶段3（中期实施）：
1. **并发处理** - 最大性能提升
2. **渐进式处理** - 架构优化

## 📈 预期整体效果

实施全部优化后，100个文本块的处理时间预计从**17.7分钟**缩短到：
- **保守估计**: 3-5分钟 (70-85% 改善)
- **乐观估计**: 1-2分钟 (90-95% 改善)

关键是要根据实际业务需求选择合适的优化策略组合！