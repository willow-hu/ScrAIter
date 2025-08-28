# chat.py
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
from create_kb import *



DB_PATH = "VectorStore"
TMP_NAME = "tmp_abcd"

PROMPT_TEMPLATE_PATH = "prompts/prompt_template.txt"
FEW_SHOT_EXAMPLE_PATH = "examples/example.json"

EMBED_MODEL = DashScopeEmbedding(
    model_name=DashScopeTextEmbeddingModels.TEXT_EMBEDDING_V2,
    text_type=DashScopeTextEmbeddingType.TEXT_TYPE_DOCUMENT,
)

# 若使用本地嵌入模型，请取消以下注释：
# from langchain_community.embeddings import ModelScopeEmbeddings
# from llama_index.embeddings.langchain import LangchainEmbedding
# embeddings = ModelScopeEmbeddings(model_id="modelscope/iic/nlp_gte_sentence-embedding_chinese-large")
# EMBED_MODEL = LangchainEmbedding(embeddings)

Settings.embed_model = EMBED_MODEL

def load_prompt_template():
    """加载 prompt 模板，支持 {context} 和 {question} 占位符"""
    if not os.path.exists(PROMPT_TEMPLATE_PATH):
        # 默认模板（如果文件不存在）
        return "请参考以下内容：\n{context}\n\n问题：{question}\n请以合适的语气回答。"
    with open(PROMPT_TEMPLATE_PATH, 'r', encoding='utf-8') as f:
        return f.read().strip()

def load_few_shot_examples():
    """加载 few-shot 示例，格式应为 {"examples": [{"input": "", "output": ""}, ...]}"""
    if not os.path.exists(FEW_SHOT_EXAMPLE_PATH):
        return []
    try:
        with open(FEW_SHOT_EXAMPLE_PATH, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return data.get("examples", [])
    except Exception as e:
        print(f"加载 few-shot 示例失败：{e}")
        return []

def build_final_prompt(prompt_template, context_str, question, examples=None):
    """
    构建最终 prompt
    :param prompt_template: 包含 {context} 和 {question} 的模板
    :param context_str: 检索到的上下文文本
    :param question: 用户问题
    :param examples: few-shot 示例列表，每个是 dict: {"input": "...", "output": "..."}
    :return: 最终 prompt 字符串
    """
    # 插入上下文和问题
    filled_prompt = prompt_template.format(context=context_str, question=question)

    # 如果有 few-shot 示例，插入到 context 之后、问题之前（或根据模板设计灵活调整）
    if examples:
        example_str = "\n\n参考示例：\n"
        for ex in examples:
            example_str += f"\n用户：{ex['input']}\n助手：{ex['output']}\n"
        # 在 {context} 后插入示例（假设模板中 {context} 和 {question} 是分开的）
        filled_prompt = filled_prompt.replace(
            "{context}", f"{context_str}{example_str}"
        ).replace("{context}", "")  # 防止重复替换，直接替换一次即可

    return filled_prompt

def get_model_response(multi_modal_input, history, model, temperature, max_tokens, history_round, db_name, similarity_threshold, chunk_cnt):
    prompt = history[-1][0]
    tmp_files = multi_modal_input['files']

    if os.path.exists(os.path.join("File", TMP_NAME)):
        db_name = TMP_NAME
    else:
        if tmp_files:
            create_tmp_kb(tmp_files)
            db_name = TMP_NAME

    print(f"prompt: {prompt}, tmp_files: {tmp_files}, db_name: {db_name}")

    try:
        dashscope_rerank = DashScopeRerank(top_n=chunk_cnt, return_documents=True)
        storage_context = StorageContext.from_defaults(
            persist_dir=os.path.join(DB_PATH, db_name)
        )
        index = load_index_from_storage(storage_context)
        print("index获取完成")

        retriever_engine = index.as_retriever(similarity_top_k=20)
        retrieve_chunk = retriever_engine.retrieve(prompt)
        print(f"原始chunk为：{retrieve_chunk}")

        try:
            results = dashscope_rerank.postprocess_nodes(retrieve_chunk, query_str=prompt)
            print(f"rerank成功，重排后的chunk为：{results}")
        except Exception as e:
            print(f"rerank失败: {e}")
            results = retrieve_chunk[:chunk_cnt]

        # 构建 context
        chunk_text = ""
        chunk_show = ""
        for i, node in enumerate(results):
            if node.score >= similarity_threshold:
                chunk_text += f"## {i+1}:\n{node.text}\n\n"
                chunk_show += f"## {i+1}:\n{node.text}\nscore: {round(node.score, 2)}\n\n"

        print(f"已获取chunk：{chunk_text.strip()}")

        prompt_template = load_prompt_template()
        few_shot_examples = load_few_shot_examples()

        prompt_template_with_examples = build_final_prompt(
            prompt_template=prompt_template,
            context_str=chunk_text.strip(),
            question=prompt,
            examples=few_shot_examples if few_shot_examples else None
        )

    except Exception as e:
        print(f"检索/构建 prompt 异常：{e}")
        prompt_template_with_examples = prompt  # fallback
        chunk_show = ""

    history[-1][-1] = ""
    client = OpenAI(
        api_key=os.getenv("DASHSCOPE_API_KEY"),
        base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
    )

    system_message = {'role': 'system', 'content': 'You are a helpful assistant.'}
    messages = []
    actual_rounds = min(len(history), history_round)
    for i in range(actual_rounds):
        messages.append({'role': 'user', 'content': history[-actual_rounds + i][0]})
        messages.append({'role': 'assistant', 'content': history[-actual_rounds + i][1]})

    messages.append({'role': 'user', 'content': prompt_template_with_examples})
    messages = [system_message] + messages

    try:
        completion = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True
        )
        assistant_response = ""
        for chunk in completion:
            delta = chunk.choices[0].delta.content
            if delta:
                assistant_response += delta
                history[-1][-1] = assistant_response
                yield history, chunk_show
    except Exception as e:
        error_msg = f"调用模型失败：{str(e)}"
        history[-1][-1] = error_msg
        yield history, chunk_show