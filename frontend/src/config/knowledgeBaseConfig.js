/**
 * 知识库构建配置
 * 开发者可以在这里调整构建参数
 */

export const KNOWLEDGE_BASE_CONFIG = {
  // 文本处理参数
  textProcessing: {
    chunk_size: 300,           // 文本分块大小 (建议: 500-2000)
    chunk_overlap: 80,         // 分块重叠大小 (建议: chunk_size的10-20%)
    chunking_method: "recursive" // 分块方法: "recursive", "sentence", "paragraph"
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
  
  // 元数据
  metadata: {
    description: null,          // 知识库描述
    tags: []                    // 标签列表
  },
  
  // 性能参数
  performance: {
    batch_size: 32,             // 批处理大小 (建议: 16-64)
    max_workers: 1              // 最大工作线程数 (建议: 2-8)
  },
  
  // 文件类型
  file_type: 'mixed'            // 文件类型: "structured", "unstructured", "mixed"
};

/**
 * 根据文档规模调整参数的预设配置
 */
export const PRESET_CONFIGS = {
  // 小规模 (< 100 文档)
  small: {
    ...KNOWLEDGE_BASE_CONFIG,
    textProcessing: {
      ...KNOWLEDGE_BASE_CONFIG.textProcessing,
      chunk_size: 800,
      chunk_overlap: 160
    },
    performance: {
      batch_size: 16,
      max_workers: 2
    }
  },
  
  // 中等规模 (100-1000 文档)
  medium: {
    ...KNOWLEDGE_BASE_CONFIG,
    textProcessing: {
      ...KNOWLEDGE_BASE_CONFIG.textProcessing,
      chunk_size: 1000,
      chunk_overlap: 200
    },
    performance: {
      batch_size: 32,
      max_workers: 4
    }
  },
  
  // 大规模 (> 1000 文档)
  large: {
    ...KNOWLEDGE_BASE_CONFIG,
    textProcessing: {
      ...KNOWLEDGE_BASE_CONFIG.textProcessing,
      chunk_size: 1200,
      chunk_overlap: 240
    },
    performance: {
      batch_size: 64,
      max_workers: 6
    }
  }
};

/**
 * 博物馆特定的优化配置
 */
export const MUSEUM_CONFIG = {
  ...KNOWLEDGE_BASE_CONFIG,
  textProcessing: {
    chunk_size: 800,            // 适合文物描述的长度
    chunk_overlap: 150,         // 保持上下文连贯
    chunking_method: "recursive"
  },
  embedding: {
    embedding_model: "dashscope", // 中文效果好
    vector_dimension: null
  },
  indexing: {
    index_type: "faiss",
    similarity_metric: "cosine"   // 语义相似度
  },
  metadata: {
    description: "博物馆文物知识库",
    tags: ["museum", "artifacts", "cultural_heritage"]
  }
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
    
    description: config.metadata.description,
    tags: config.metadata.tags,
    
    batch_size: config.performance.batch_size,
    max_workers: config.performance.max_workers,
    
    file_type: config.file_type
  };
}
