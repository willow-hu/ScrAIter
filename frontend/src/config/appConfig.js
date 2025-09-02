const appConfig = {
  default_project: "twin_pagoda",
  api_base_url: "http://localhost:8000/api/v1",
  supported_file_formats: [".pdf", ".docx", ".txt", ".xlsx", ".csv"],
  max_file_size: 52428800,
  project_workflow: {
    steps: [
      {
        id: 1,
        name: "资料管理",
        description: "上传和管理知识库文件",
        files: []
      },
      {
        id: 2,
        name: "结构生成",
        description: "根据知识库生成剧本树结构",
        files: ["{name}_tree.json"]
      },
      {
        id: 3,
        name: "结构编辑",
        description: "编辑和优化剧本树结构",
        input: "{name}_tree.json",
        output: "{name}_tree.json"
      },
      {
        id: 4,
        name: "内容生成",
        description: "为树结构节点生成具体内容",
        input: "{name}_tree.json",
        output: "{name}_script.json"
      },
      {
        id: 5,
        name: "内容校对",
        description: "校对和完善生成的内容",
        input: "{name}_script.json",
        output: "{name}_reviewed_script.json"
      }
    ]
  }
};

export default appConfig;
