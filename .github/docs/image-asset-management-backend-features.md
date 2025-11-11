# 图片素材管理功能 - 后端需求清单

## 当前状态分析

### 已实现功能
1. ✅ 知识库图片管理（用于知识库的图片）
   - 上传图片到知识库
   - 获取知识库图片列表
   - 获取/删除知识库图片
   - 路径：`shared/projects/<kb_name>/images/`

2. ✅ 基础图片服务类 (`ImageService`)
   - 图片格式验证（jpg, jpeg, png）
   - 文件大小限制（5MB）
   - 图片有效性验证
   - 元数据管理

3. ✅ 项目目录结构
   - 项目创建时自动创建 `assets` 目录
   - 路径：`shared/projects/<project_id>/assets/`

---

## 需要添加的后端功能

### 一、API 端点（`backend/app/api/v1/images.py`）

#### 1. NPC立绘管理
- **`POST /api/v1/projects/{project_id}/assets/npc/upload`**
  - 功能：上传NPC立绘
  - 输入：project_id, file
  - 输出：ImageUploadResponse
  - 存储路径：`shared/projects/<project_id>/assets/npc/`
  - 说明：保留原始文件名或生成规范命名

- **`GET /api/v1/projects/{project_id}/assets/npc/list`**
  - 功能：获取项目的NPC立绘列表
  - 输入：project_id
  - 输出：ImageListResponse
  - 说明：返回所有NPC立绘的元数据信息

- **`GET /api/v1/projects/{project_id}/assets/npc/{filename}`**
  - 功能：获取特定NPC立绘文件
  - 输入：project_id, filename
  - 输出：文件流（FileResponse）
  - 说明：用于前端预览和显示

- **`DELETE /api/v1/projects/{project_id}/assets/npc/{filename}`**
  - 功能：删除NPC立绘
  - 输入：project_id, filename
  - 输出：DeleteImageResponse
  - 说明：同时更新元数据和删除物理文件

#### 2. 背景图片管理
- **`POST /api/v1/projects/{project_id}/assets/bg/upload`**
  - 功能：上传背景图片
  - 输入：project_id, file
  - 输出：ImageUploadResponse
  - 存储路径：`shared/projects/<project_id>/assets/bg/`
  - 说明：自动生成规范命名（bg_001, bg_002...）

- **`GET /api/v1/projects/{project_id}/assets/bg/list`**
  - 功能：获取项目的背景图片列表
  - 输入：project_id
  - 输出：ImageListResponse
  - 说明：返回所有背景图片的元数据信息

- **`GET /api/v1/projects/{project_id}/assets/bg/{filename}`**
  - 功能：获取特定背景图片文件
  - 输入：project_id, filename
  - 输出：文件流（FileResponse）
  - 说明：用于前端预览和显示

- **`DELETE /api/v1/projects/{project_id}/assets/bg/{filename}`**
  - 功能：删除背景图片
  - 输入：project_id, filename
  - 输出：DeleteImageResponse
  - 说明：同时更新元数据和删除物理文件

#### 3. 项目资产统计（可选）
- **`GET /api/v1/projects/{project_id}/assets/summary`**
  - 功能：获取项目所有资产的统计信息
  - 输入：project_id
  - 输出：包含NPC立绘和背景图片数量、总大小等信息
  - 说明：用于项目管理页面的资产概览

---

### 二、服务层方法（`backend/app/services/image_service.py`）

#### 1. NPC立绘相关方法
- **`get_npc_dir(project_id: str) -> str`**
  - 获取NPC立绘目录路径
  - 自动创建目录（如不存在）

- **`upload_npc_image(project_id: str, file: UploadFile) -> ImageUploadResponse`**
  - 上传NPC立绘
  - 验证文件（类型、大小、有效性）
  - 保存到指定目录
  - 更新元数据

- **`list_npc_images(project_id: str) -> ImageListResponse`**
  - 获取NPC立绘列表
  - 读取元数据文件
  - 验证文件实际存在

- **`get_npc_image_path(project_id: str, filename: str) -> Optional[str]`**
  - 获取NPC立绘文件路径
  - 验证文件存在

- **`delete_npc_image(project_id: str, filename: str) -> DeleteImageResponse`**
  - 删除NPC立绘
  - 删除物理文件
  - 更新元数据

#### 2. 背景图片相关方法
- **`get_bg_dir(project_id: str) -> str`**
  - 获取背景图片目录路径
  - 自动创建目录（如不存在）

- **`upload_bg_image(project_id: str, file: UploadFile) -> ImageUploadResponse`**
  - 上传背景图片
  - 验证文件（类型、大小、有效性）
  - 生成唯一文件名（bg_001, bg_002...）
  - 保存到指定目录
  - 更新元数据

- **`list_bg_images(project_id: str) -> ImageListResponse`**
  - 获取背景图片列表
  - 读取元数据文件
  - 验证文件实际存在

- **`get_bg_image_path(project_id: str, filename: str) -> Optional[str]`**
  - 获取背景图片文件路径
  - 验证文件存在

- **`delete_bg_image(project_id: str, filename: str) -> DeleteImageResponse`**
  - 删除背景图片
  - 删除物理文件
  - 更新元数据

#### 3. 元数据管理方法
- **`get_asset_metadata_path(project_id: str, asset_type: str) -> str`**
  - 获取资产元数据文件路径
  - asset_type: "npc" 或 "bg"

- **`load_asset_metadata(project_id: str, asset_type: str) -> Dict`**
  - 加载资产元数据
  - 如不存在则返回空结构

- **`save_asset_metadata(project_id: str, asset_type: str, metadata: Dict)`**
  - 保存资产元数据
  - 包含上传时间、文件信息等

#### 4. 文件名生成方法
- **`generate_bg_filename(project_id: str, file_extension: str) -> str`**
  - 为背景图片生成唯一文件名
  - 格式：bg_001.jpg, bg_002.png...
  - 自动递增编号

---

### 三、数据模型扩展（`backend/app/models/image_models.py`）

#### 可选的新模型
- **`ProjectAssetSummary`**
  ```python
  class ProjectAssetSummary(BaseModel):
      project_id: str
      npc_count: int
      npc_total_size: int
      bg_count: int
      bg_total_size: int
      total_assets: int
      total_size: int
  ```

---

### 四、项目服务扩展（`backend/app/services/project_service.py`）

#### 可选的增强功能
- **在 `_ensure_project_dir` 中自动创建 npc 和 bg 子目录**
  ```python
  os.makedirs(os.path.join(assets_dir, "npc"), exist_ok=True)
  os.makedirs(os.path.join(assets_dir, "bg"), exist_ok=True)
  ```

- **在项目删除时同步删除所有资产**
  - 删除项目时清理 assets 目录下的所有文件

---

### 五、导出服务集成（`backend/app/services/export_service.py`）

#### 需要确保的功能
- **导出项目时包含所有资产文件**
  - 将 `assets/npc/` 中的所有NPC立绘打包
  - 将 `assets/bg/` 中的所有背景图片打包
  - 在导出包中保持相同的目录结构

- **可选：资产完整性检查**
  - 检查脚本中引用的资产文件是否都存在
  - 生成资产清单文件

---

## 实现优先级建议

### 🔴 高优先级（核心功能）
1. ✅ NPC立绘上传 API
2. ✅ NPC立绘列表/获取/删除 API
3. ✅ 背景图片上传 API
4. ✅ 背景图片列表/获取/删除 API
5. ✅ ImageService 中的对应方法实现
6. ✅ 元数据管理

### 🟡 中优先级（增强功能）
7. 项目创建时自动创建 npc/bg 子目录
8. 导出服务中包含资产文件
9. 文件名冲突处理
10. 批量上传支持

### 🟢 低优先级（可选功能）
11. 资产统计 API
12. 资产完整性检查
13. 图片预览缩略图生成
14. 批量删除支持

---

## 技术细节说明

### 1. 目录结构
```
shared/projects/<project_id>/
├── assets/
│   ├── npc/          # NPC立绘
│   │   ├── character1.png
│   │   ├── character2.jpg
│   │   └── metadata.json
│   └── bg/           # 背景图片
│       ├── bg_001.jpg
│       ├── bg_002.png
│       └── metadata.json
├── project_info.json
└── script.json
```

### 2. 元数据格式
```json
{
  "images": {
    "character1.png": {
      "original_name": "emperor.png",
      "file_size": 1024000,
      "upload_time": "2025-11-11T10:30:00",
      "dimensions": {"width": 512, "height": 1024},
      "related_character": "皇帝"  // 可选：关联的角色名
    }
  }
}
```

### 3. 文件命名规则
- **NPC立绘**：保留原始文件名（用户上传的名称）
- **背景图片**：自动生成规范命名（bg_001, bg_002...）

### 4. 文件类型和大小限制
- 支持格式：`.jpg`, `.jpeg`, `.png`
- 最大文件大小：5MB
- 推荐尺寸：
  - NPC立绘：512x1024 或 1024x2048
  - 背景图片：1920x1080 或更高

---

## 与现有功能的关系

1. **与知识库图片管理的区别**
   - 知识库图片：用于知识库的参考资料图片
   - 项目资产图片：用于剧本项目的游戏素材

2. **与项目管理的集成**
   - 项目创建时初始化资产目录
   - 项目删除时清理资产文件
   - 项目导出时打包资产文件

3. **与导出功能的集成**
   - 确保导出包含所有资产文件
   - 保持目录结构一致性

---

## 实现建议

### 代码复用
- 可以复用现有的 `ImageService` 中的验证逻辑
- 元数据管理可以使用相似的模式
- 文件操作可以共用工具函数

### 错误处理
- 项目不存在时返回 404
- 文件不存在时返回 404
- 文件格式/大小不符合要求时返回 400
- 服务器错误时返回 500

### 日志记录
- 记录所有资产上传/删除操作
- 记录文件大小和上传时间
- 便于问题排查和统计分析
