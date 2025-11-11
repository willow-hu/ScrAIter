"""
剧本大纲生成服务
使用GraphRAG数据（实体、关系）生成剧本大纲
"""
import os
import json
import pandas as pd
from typing import Dict, Any, Optional
from openai import OpenAI
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)

class OutlineGenerationService:
    """大纲生成服务"""
    
    def __init__(self):
        """初始化服务"""
        # OpenAI客户端（使用DashScope兼容接口）
        self.client = OpenAI(
            api_key=os.getenv("DASHSCOPE_API_KEY"),
            base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
        )
        
        # 提示词路径
        self.prompts_path = os.path.join(settings.BASE_DIR, "app", "prompts")
        
        # 知识库路径
        self.kb_path = settings.KNOWLEDGE_BASES_DIR
        
        # 项目输出路径
        self.projects_path = settings.PROJECTS_DIR
    
    def load_prompt_template(self) -> str:
        """加载大纲生成提示词模板"""
        try:
            prompt_file = os.path.join(self.prompts_path, "outline_generation.prompt.md")
            
            if not os.path.exists(prompt_file):
                raise FileNotFoundError(f"提示词文件不存在: {prompt_file}")
            
            with open(prompt_file, 'r', encoding='utf-8') as f:
                template = f.read().strip()
            
            logger.info("成功加载大纲生成提示词模板")
            return template
            
        except Exception as e:
            logger.error(f"加载提示词模板失败: {e}")
            raise
    
    def load_graph_data(self, kb_name: str) -> Dict[str, pd.DataFrame]:
        """
        加载知识库的图数据（实体、关系）
        
        Args:
            kb_name: 知识库名称
            
        Returns:
            包含entities、relationships的字典
        """
        try:
            graph_store_path = os.path.join(self.kb_path, "GraphStore", kb_name)
            
            if not os.path.exists(graph_store_path):
                raise FileNotFoundError(f"知识库 '{kb_name}' 的图数据不存在，请先构建知识图谱")
            
            result = {}
            
            # 加载实体数据
            entities_path = os.path.join(graph_store_path, "entities.csv")
            if os.path.exists(entities_path):
                result['entities'] = pd.read_csv(entities_path, encoding='utf-8-sig')
                logger.info(f"加载实体数据: {len(result['entities'])} 条")
            else:
                raise FileNotFoundError(f"实体文件不存在: {entities_path}")
            
            # 加载关系数据
            relationships_path = os.path.join(graph_store_path, "relationships.csv")
            if os.path.exists(relationships_path):
                result['relationships'] = pd.read_csv(relationships_path, encoding='utf-8-sig')
                logger.info(f"加载关系数据: {len(result['relationships'])} 条")
            else:
                raise FileNotFoundError(f"关系文件不存在: {relationships_path}")
            
            return result
            
        except Exception as e:
            logger.error(f"加载图数据失败: {e}")
            raise
    
    def format_entities_for_prompt(self, entities_df: pd.DataFrame) -> str:
        """
        将实体数据格式化为文本
        
        Args:
            entities_df: 实体数据框
            
        Returns:
            格式化后的文本
        """
        try:
            formatted_text = "## entities.csv\n"
            formatted_text += "```csv\n"
            formatted_text += entities_df.to_csv(index=False, encoding='utf-8')
            formatted_text += "```\n"
            
            return formatted_text
            
        except Exception as e:
            logger.error(f"格式化实体数据失败: {e}")
            raise
    
    def format_relationships_for_prompt(self, relationships_df: pd.DataFrame) -> str:
        """
        将关系数据格式化为文本
        
        Args:
            relationships_df: 关系数据框
            
        Returns:
            格式化后的文本
        """
        try:
            formatted_text = "## relationships.csv\n"
            formatted_text += "```csv\n"
            formatted_text += relationships_df.to_csv(index=False, encoding='utf-8')
            formatted_text += "```\n"
            
            return formatted_text
            
        except Exception as e:
            logger.error(f"格式化关系数据失败: {e}")
            raise
    
    def call_llm_for_outline(self, prompt_template: str, entities_text: str, relationships_text: str) -> str:
        """
        调用大模型生成大纲
        
        Args:
            prompt_template: 提示词模板
            entities_text: 格式化后的实体数据文本
            relationships_text: 格式化后的关系数据文本
            
        Returns:
            生成的JSON字符串
        """
        try:
            logger.info("开始调用大模型生成大纲...")
            
            # 将提示词模板和数据组合成完整的提示词
            full_prompt = f"{prompt_template}\n\n{entities_text}\n{relationships_text}"

            completion = self.client.chat.completions.create(
                model=settings.RAG_MODEL,
                messages=[
                    {"role": "user", "content": full_prompt}
                ],
                temperature=0.0,  # 使用较低的温度以提高一致性
                max_tokens=8192,  # 大纲可能比较长
                stream=False
            )
            
            content = completion.choices[0].message.content
            if content is None:
                raise ValueError("大模型返回内容为空")
            
            logger.info("大模型调用成功")
            return content.strip()
            
        except Exception as e:
            logger.error(f"调用大模型失败: {e}")
            raise
    
    def parse_llm_response(self, response: str) -> list:
        """
        解析大模型返回的JSON
        
        Args:
            response: 大模型返回的文本
            
        Returns:
            解析后的节点列表
        """
        try:
            # 尝试提取JSON部分（移除可能的markdown代码块标记）
            response = response.strip()
            
            # 移除markdown代码块标记
            if response.startswith("```json"):
                response = response[7:]
            elif response.startswith("```"):
                response = response[3:]
            
            if response.endswith("```"):
                response = response[:-3]
            
            response = response.strip()
            
            # 解析JSON - 现在期望是一个列表
            outline_data = json.loads(response)
            
            # 验证是列表
            if not isinstance(outline_data, list):
                raise ValueError("生成的大纲必须是一个列表")
            
            # 验证列表不为空
            if len(outline_data) == 0:
                raise ValueError("生成的大纲列表为空")
            
            logger.info(f"成功解析大模型返回的JSON，共 {len(outline_data)} 个节点")
            return outline_data
            
        except json.JSONDecodeError as e:
            logger.error(f"JSON解析失败: {e}")
            logger.error(f"原始响应: {response[:500]}...")  # 只记录前500字符
            raise ValueError(f"大模型返回的不是有效的JSON格式: {str(e)}")
        except Exception as e:
            logger.error(f"解析响应失败: {e}")
            raise

    def post_process_outline(self, outline_data: list) -> list:
        """
        LLM生成大纲后的后处理函数
        在保存到文件前对大纲数据进行修改和调整
        
        Args:
            outline_data: LLM生成的原始大纲数据（节点列表）
            
        Returns:
            处理后的大纲数据
        """
        for node in outline_data:
            # 添加缺失的字段
            if "role" not in node:
                node["role"] = ""
            if "npc_pic" not in node:
                node["npc_pic"] = ""
            if "bg" not in node:
                node["bg"] = ""
            if "user" not in node:
                node["user"] = ""
        return outline_data
    
    def save_outline(self, project_id: str, outline_data: list) -> str:
        """
        保存大纲到项目目录
        
        Args:
            project_id: 项目ID
            outline_data: 大纲数据（节点列表）
            
        Returns:
            保存的文件路径
        """
        try:
            # 检查项目目录是否存在
            project_dir = os.path.join(self.projects_path, project_id)
            if not os.path.exists(project_dir):
                raise FileNotFoundError(f"项目目录不存在: {project_id}")
            
            # 构建完整的脚本数据结构（只包含structure）
            script_data = {
                "structure": outline_data
            }
            
            # 保存为script.json
            output_path = os.path.join(project_dir, "script.json")
            
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(script_data, f, ensure_ascii=False, indent=2)
            
            logger.info(f"大纲已保存到: {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"保存大纲失败: {e}")
            raise
    
    def generate_outline(self, project_id: str, kb_name: str) -> Dict[str, Any]:
        """
        生成剧本大纲的主流程
        
        Args:
            project_id: 项目ID
            kb_name: 知识库名称
            
        Returns:
            包含成功状态、消息和生成结果的字典
        """
        try:
            logger.info(f"开始为项目 '{project_id}' (知识库: '{kb_name}') 生成大纲")
            
            # 1. 加载提示词模板
            prompt_template = self.load_prompt_template()
            
            # 2. 加载图数据
            graph_data = self.load_graph_data(kb_name)
            
            # 3. 格式化实体和关系数据
            entities_text = self.format_entities_for_prompt(graph_data['entities'])
            relationships_text = self.format_relationships_for_prompt(graph_data['relationships'])
            
            # 4. 调用大模型
            llm_response = self.call_llm_for_outline(prompt_template, entities_text, relationships_text)
            
            # 5. 解析响应 - 现在返回节点列表
            outline_nodes = self.parse_llm_response(llm_response)
            
            # 6. 后处理大纲（在保存前修改）
            outline_nodes = self.post_process_outline(outline_nodes)
            
            # 7. 保存大纲到项目目录
            output_path = self.save_outline(project_id, outline_nodes)
            
            logger.info(f"大纲生成成功: {len(outline_nodes)} 个节点")
            
            return {
                "structure": outline_nodes
            }
            
        except FileNotFoundError as e:
            error_msg = str(e)
            logger.error(f"文件未找到: {error_msg}")
            raise
        except ValueError as e:
            error_msg = str(e)
            logger.error(f"数据验证失败: {error_msg}")
            raise
        except Exception as e:
            error_msg = f"大纲生成失败: {str(e)}"
            logger.error(error_msg)
            raise

# 创建全局实例
outline_generation_service = OutlineGenerationService()
