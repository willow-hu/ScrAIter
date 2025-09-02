/**
 * 知识库构建配置
 * 开发者可以在这里调整构建参数
 */

export const KNOWLEDGE_BASE_CONFIG = {  
  // 文本处理参数
  textProcessing: {
    chunk_size: 300,           // 文本分块大小
    chunk_overlap: 80,        // 分块重叠大小
    chunking_method: "recursive" // 分块方法
  },
  
  // 嵌入参数
  embedding: {
    embedding_model: "dashscope", // 嵌入模型: "dashscope", "local"
    vector_dimension: null       // 向量维度 (null表示自动推断)
  },
  
  // 索引参数
  indexing: {
    index_type: "faiss",        // 索引类型: "faiss"
    similarity_metric: "cosine"  // 相似度算法: "cosine", "euclidean", "dot_product"
  },
  
  // 性能参数
  performance: {
    batch_size: 8,             // 批处理大小 (建议: 16-64)
    max_workers: 1              // 最大工作线程数 (建议: 2-8)
  },
  
  // 文件类型
  file_type: 'mixed'            // 文件类型: "structured", "unstructured", "mixed"
};

/**
 * 获取展平的配置对象，用于API调用
 */
export function getFlattenedConfig(config = KNOWLEDGE_BASE_CONFIG) {
  return {
    // 展平所有嵌套属性
    chunk_size: config.textProcessing.chunk_size,
    chunk_overlap: config.textProcessing.chunk_overlap,
    chunking_method: config.textProcessing.chunking_method,
    
    embedding_model: config.embedding.embedding_model,
    vector_dimension: config.embedding.vector_dimension,
    
    index_type: config.indexing.index_type,
    similarity_metric: config.indexing.similarity_metric,
    
    batch_size: config.performance.batch_size,
    max_workers: config.performance.max_workers,
    
    file_type: config.file_type
  };
}
