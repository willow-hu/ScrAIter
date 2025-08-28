"""
node_expansion.py 用于测试单个节点的生成效果。
"""
import os
import json
from openai import OpenAI
from llama_index.core import StorageContext, load_index_from_storage, Settings
from llama_index.embeddings.dashscope import (
    DashScopeEmbedding,
    DashScopeTextEmbeddingModels,
    DashScopeTextEmbeddingType,
)
from llama_index.postprocessor.dashscope_rerank import DashScopeRerank

# =============================
# 配置路径
# =============================
DB_PATH = "VectorStore"
STRUCTURE_DIR = "./structure/twin_pagoda"  # 可改为参数传入
GLOBAL_CONTEXT_FILE = os.path.join(STRUCTURE_DIR, "global_context.json")
NODE_FILE = os.path.join(STRUCTURE_DIR, "node.json")

PROMPT_TEMPLATE_PATH = "prompts/node_expansion.txt"

EMBED_MODEL = DashScopeEmbedding(
    model_name=DashScopeTextEmbeddingModels.TEXT_EMBEDDING_V2,
    text_type=DashScopeTextEmbeddingType.TEXT_TYPE_DOCUMENT,
)
Settings.embed_model = EMBED_MODEL


# =============================
# 工具函数
# =============================
def load_json_file(filepath):
    """安全加载 JSON 文件"""
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"配置文件未找到：{filepath}")
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)


def load_prompt_template():
    """加载提示词模板，支持 {global_context} 和 {user_input} 占位符"""
    if not os.path.exists(PROMPT_TEMPLATE_PATH):
        raise FileNotFoundError(f"提示词模板文件未找到：{PROMPT_TEMPLATE_PATH}")
    with open(PROMPT_TEMPLATE_PATH, 'r', encoding='utf-8') as f:
        return f.read().strip()


# =============================
# RAG 检索函数
# =============================
def retrieve_relevant_chunks(prompt, db_name="twin_pagoda", similarity_threshold=0.5, chunk_cnt=3):
    """使用 llama_index 检索相关知识片段"""
    try:
        storage_context = StorageContext.from_defaults(persist_dir=os.path.join(DB_PATH, db_name))
        index = load_index_from_storage(storage_context)
        retriever = index.as_retriever(similarity_top_k=20)
        retrieved_nodes = retriever.retrieve(prompt)

        # 重排序
        reranker = DashScopeRerank(top_n=chunk_cnt, return_documents=True)
        ranked_nodes = reranker.postprocess_nodes(retrieved_nodes, query_str=prompt)

        # 拼接文本
        context_str = ""
        for node in ranked_nodes:
            if node.score >= similarity_threshold:
                context_str += node.text + "\n\n"
        return context_str.strip()

    except Exception as e:
        print(f"[警告] RAG 检索失败：{e}")
        return ""


# =============================
# 主生成函数
# =============================
def expand_node():
    """主函数：加载配置 → 构建 prompt → 调用 LLM 生成脚本"""
    # 1. 加载配置文件
    global_context = load_json_file(GLOBAL_CONTEXT_FILE)
    node_info = load_json_file(NODE_FILE)

    # 2. 加载提示词模板
    prompt_template = load_prompt_template()

    # 3. 注入变量到模板
    try:
        filled_prompt = prompt_template.format(
            global_context=json.dumps(global_context, ensure_ascii=False, indent=2),
            node_info=json.dumps(node_info, ensure_ascii=False, indent=2)
        )
    except KeyError as e:
        raise ValueError(f"提示词模板中的占位符缺失：{e}")

    # 4. 使用 RAG 增强上下文
    retrieval_query = f"{node_info['user']}"
    context_knowledge = retrieve_relevant_chunks(retrieval_query)

    # 将检索到的知识插入 prompt（可选：在 prompt 中预留 {context}）
    if "{context}" in filled_prompt:
        final_prompt = filled_prompt.format(context=context_knowledge)
    else:
        # 否则直接拼接在 prompt 后
        final_prompt = filled_prompt + "\n\n参考知识：\n" + context_knowledge

    # 5. 调用 LLM
    client = OpenAI(
        api_key=os.getenv("DASHSCOPE_API_KEY"),
        base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
    )

    messages = [
        {"role": "system", "content": "你是一位经验丰富的交互剧情游戏设计师，严格按照要求生成对话脚本。"},
        {"role": "user", "content": final_prompt}
    ]

    try:
        completion = client.chat.completions.create(
            model="qwen-max",  # 可配置
            messages=messages,
            temperature=0.7,
            max_tokens=512,
            stream=False
        )
        response = completion.choices[0].message.content.strip()
        print("🎮 生成的对话脚本：\n")
        print(response)
        return response

    except Exception as e:
        error_msg = f"调用模型失败：{str(e)}"
        print(error_msg)
        return error_msg


# =============================
# 入口点
# =============================
if __name__ == "__main__":
    # 确保环境变量已设置
    if not os.getenv("DASHSCOPE_API_KEY"):
        raise EnvironmentError("请设置环境变量 DASHSCOPE_API_KEY")

    # 执行生成
    expand_node()