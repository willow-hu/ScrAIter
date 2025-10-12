"""
LLM客户端模块
支持多种LLM服务调用，包括OpenAI、DashScope等
"""
import os
import logging
import asyncio
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Dict, Any, List, Optional
import json

logger = logging.getLogger(__name__)


@dataclass
class ModelResponse:
    """LLM模型响应结果"""
    content: str
    history: List[Dict[str, str]] = None
    cache_hit: bool = False
    
    def __post_init__(self):
        if self.history is None:
            self.history = []


class BaseLLMClient(ABC):
    """LLM客户端基类"""
    
    @abstractmethod
    async def achat(self, prompt: str, **kwargs) -> ModelResponse:
        """异步聊天请求"""
        pass
    
    def chat(self, prompt: str, **kwargs) -> ModelResponse:
        """同步聊天请求"""
        return asyncio.run(self.achat(prompt, **kwargs))


class DashScopeLLMClient(BaseLLMClient):
    """阿里云DashScope LLM客户端"""
    
    def __init__(self, 
                 api_key: str = None,
                 model: str = "qwen-turbo",
                 max_tokens: int = 4000,
                 temperature: float = 0.0):
        self.api_key = api_key or os.getenv("DASHSCOPE_API_KEY")
        self.model = model
        self.max_tokens = max_tokens
        self.temperature = temperature
        
        if not self.api_key:
            logger.warning("未提供DashScope API密钥，LLM提取功能将不可用")
        
        # 尝试导入DashScope
        try:
            import dashscope
            dashscope.api_key = self.api_key
            self.dashscope = dashscope
        except ImportError:
            logger.error("DashScope库未安装，请安装: pip install dashscope")
            self.dashscope = None
    
    async def achat(self, prompt: str, **kwargs) -> ModelResponse:
        """异步发送DashScope请求"""
        if not self.dashscope:
            raise RuntimeError("DashScope客户端未初始化")
        
        try:
            from dashscope import Generation
            
            messages = [{"role": "user", "content": prompt}]
            
            response = Generation.call(
                model=self.model,
                messages=messages,
                max_tokens=kwargs.get('max_tokens', self.max_tokens),
                temperature=kwargs.get('temperature', self.temperature),
                result_format='message'
            )
            
            if response.status_code == 200:
                content = response.output.choices[0].message.content
                
                return ModelResponse(
                    content=content,
                    history=messages + [{"role": "assistant", "content": content}]
                )
            else:
                raise RuntimeError(f"DashScope API错误: {response.message}")
                
        except Exception as e:
            logger.error(f"DashScope API调用失败: {e}")
            raise
    
    def chat(self, prompt: str, **kwargs) -> ModelResponse:
        """同步发送DashScope请求"""
        if not self.dashscope:
            raise RuntimeError("DashScope客户端未初始化")
        
        try:
            from dashscope import Generation
            
            messages = [{"role": "user", "content": prompt}]
            
            response = Generation.call(
                model=self.model,
                messages=messages,
                max_tokens=kwargs.get('max_tokens', self.max_tokens),
                temperature=kwargs.get('temperature', self.temperature),
                result_format='message'
            )
            
            if response.status_code == 200:
                content = response.output.choices[0].message.content
                
                return ModelResponse(
                    content=content,
                    history=messages + [{"role": "assistant", "content": content}]
                )
            else:
                raise RuntimeError(f"DashScope API错误: {response.message}")
                
        except Exception as e:
            logger.error(f"DashScope API调用失败: {e}")
            raise


class OpenAIClient(BaseLLMClient):
    """OpenAI API客户端"""
    
    def __init__(self, 
                 api_key: str = None,
                 model: str = "gpt-3.5-turbo",
                 base_url: str = None,
                 max_tokens: int = 4000,
                 temperature: float = 0.0):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.model = model
        self.base_url = base_url
        self.max_tokens = max_tokens
        self.temperature = temperature
        
        if not self.api_key:
            logger.warning("未提供OpenAI API密钥，LLM提取功能将不可用")
        
        # 尝试导入OpenAI
        try:
            import openai
            self.openai = openai
            if self.base_url:
                self.client = openai.OpenAI(api_key=self.api_key, base_url=self.base_url)
            else:
                self.client = openai.OpenAI(api_key=self.api_key)
        except ImportError:
            logger.error("OpenAI库未安装，请安装: pip install openai")
            self.client = None
    
    async def achat(self, prompt: str, **kwargs) -> ModelResponse:
        """异步发送OpenAI请求"""
        if not self.client:
            raise RuntimeError("OpenAI客户端未初始化")
        
        try:
            messages = [{"role": "user", "content": prompt}]
            
            response = await self.client.chat.completions.acreate(
                model=self.model,
                messages=messages,
                max_tokens=kwargs.get('max_tokens', self.max_tokens),
                temperature=kwargs.get('temperature', self.temperature),
                **{k: v for k, v in kwargs.items() if k not in ['max_tokens', 'temperature']}
            )
            
            content = response.choices[0].message.content
            
            return ModelResponse(
                content=content,
                history=messages + [{"role": "assistant", "content": content}]
            )
            
        except Exception as e:
            logger.error(f"OpenAI API错误: {e}")
            raise
    
    def chat(self, prompt: str, **kwargs) -> ModelResponse:
        """同步发送OpenAI请求"""
        if not self.client:
            raise RuntimeError("OpenAI客户端未初始化")
        
        try:
            messages = [{"role": "user", "content": prompt}]
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=kwargs.get('max_tokens', self.max_tokens),
                temperature=kwargs.get('temperature', self.temperature),
                **{k: v for k, v in kwargs.items() if k not in ['max_tokens', 'temperature']}
            )
            
            content = response.choices[0].message.content
            
            return ModelResponse(
                content=content,
                history=messages + [{"role": "assistant", "content": content}]
            )
            
        except Exception as e:
            logger.error(f"OpenAI API错误: {e}")
            raise


class MockLLMClient(BaseLLMClient):
    """模拟LLM客户端，用于测试"""
    
    def __init__(self, model: str = "mock-model"):
        self.model = model
        logger.info("使用模拟LLM客户端 - 响应将被模拟生成")
    
    async def achat(self, prompt: str, **kwargs) -> ModelResponse:
        """生成模拟响应"""
        return self._generate_mock_response(prompt)
    
    def _generate_mock_response(self, prompt: str) -> ModelResponse:
        """生成模拟的图提取响应"""
        # 检查是否是图提取prompt
        if "Entity_types:" in prompt and "Text:" in prompt:
            # 从prompt中提取实体类型和文本
            lines = prompt.split('\n')
            entity_types = []
            text = ""
            
            for i, line in enumerate(lines):
                if line.startswith("Entity_types:"):
                    entity_types_str = line.replace("Entity_types:", "").strip()
                    entity_types = [t.strip().lower() for t in entity_types_str.split(',')]
                elif line.startswith("Text:") and i < len(lines) - 1:
                    # 获取Text:后的文本
                    text = lines[i + 1].strip()
                    break
            
            # 生成模拟实体和关系
            mock_response = self._generate_mock_extraction(text, entity_types)
            return ModelResponse(content=mock_response)
        
        # 默认模拟响应
        return ModelResponse(content="模拟响应: " + prompt[:100] + "...")
    
    def _generate_mock_extraction(self, text: str, entity_types: List[str]) -> str:
        """生成模拟的实体提取响应"""
        # 简单的模拟提取 - 查找大写词汇
        import re
        capitalized_words = re.findall(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b', text)
        
        entities = []
        relationships = []
        
        entity_id = 0
        for word in capitalized_words[:5]:  # 限制到5个实体
            if len(word) > 2:  # 跳过短词
                # 分配随机实体类型
                entity_type = entity_types[entity_id % len(entity_types)] if entity_types else "organization"
                entities.append(f'("entity"<|>{word.upper()}<|>{entity_type.upper()}<|>在文本中提到的{entity_type})')
                entity_id += 1
        
        # 生成一些模拟关系
        if len(entities) >= 2:
            relationships.append(f'("relationship"<|>{capitalized_words[0].upper()}<|>{capitalized_words[1].upper()}<|>这些实体在文本中相关<|>5)')
        
        # 组合实体和关系
        all_records = entities + relationships
        response = "##\n".join(all_records)
        if response:
            response += "\n<|COMPLETE|>"
        else:
            response = "<|COMPLETE|>"
        
        return response


def create_llm_client(config: Dict[str, Any]) -> BaseLLMClient:
    """根据配置创建LLM客户端"""
    provider = config.get("provider", "dashscope").lower()
    
    if provider == "dashscope":
        return DashScopeLLMClient(
            api_key=config.get("api_key"),
            model=config.get("model", "qwen-turbo"),
            max_tokens=config.get("max_tokens", 4000),
            temperature=config.get("temperature", 0.0)
        )
    elif provider == "openai":
        return OpenAIClient(
            api_key=config.get("api_key"),
            model=config.get("model", "gpt-3.5-turbo"),
            base_url=config.get("base_url"),
            max_tokens=config.get("max_tokens", 4000),
            temperature=config.get("temperature", 0.0)
        )
    elif provider == "mock":
        return MockLLMClient(model=config.get("model", "mock-model"))
    else:
        raise ValueError(f"不支持的LLM提供商: {provider}")


def run_async(coro):
    """同步运行异步函数"""
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    
    return loop.run_until_complete(coro)