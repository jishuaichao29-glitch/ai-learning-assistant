# AI 智能学习助手

> 一个基于大语言模型的全栈智能聊天系统，具备流式对话、上下文管理、RAG 知识库、用户反馈等核心能力。

---
### 🌐 线上公网访问与源码留痕 (Grader Quick Access)

* **项目 GitHub 源码仓库 (查看 Git 提交历史)**：[点击跳转 GitHub 仓库](https://github.com/jishuaichao29-glitch/ai-learning-assistant)
* **项目演示录屏视频 (百度网盘)**：[点击跳转观看演示视频](https://pan.baidu.com/s/1rbsnSS2VtthbkTO2ZCShPw?pwd=b4iv) （提取码: b4iv）
* **前端公网访问地址**：[https://ai-learning-assistant-1-52qt.onrender.com](https://ai-learning-assistant-1-52qt.onrender.com)
* **后端公网访问地址**：[https://ai-learning-assistant-6hw0.onrender.com](https://ai-learning-assistant-6hw0.onrender.com)

> 💡 **⚠️ 评分友情提示 (Grader Note)**：
> 本项目全栈服务均托管于 **Render 免费云端服务器**。由于 Render 免费层存在容器自动休眠机制（Spin Down），若项目处于闲置状态，**首次点开网页或首次点击【注册/登录】按钮时，后端需要约 50 秒的冷启动唤醒时间**。
> **阅卷测试时若遇到界面卡顿或“请稍候”，请耐心等待约 1 分钟热身，或者刷新页面重新输入即可恢复秒级正常流式响应。**

---

## 📋 项目介绍

### 核心业务

本系统是一个面向学习者的 AI 智能聊天助手，用户可以：

- 💬 **智能对话**：与 AI 进行自然语言交互，获取编程、数学、语言学习等多领域的知识解答
- 📚 **知识库问答**：上传 PDF 文档构建私有知识库，AI 将基于文档内容进行精准回答（RAG 模式）
- 📁 **会话管理**：创建、删除、置顶、重命名多个对话会话，支持跨会话切换
- ❤️ **反馈机制**：对 AI 回答进行点赞/点踩，数据持久化存储，刷新后状态保持
- 🔍 **全文搜索**：全局防抖模糊搜索历史聊天记录，快速定位过往对话
- 🎯 **专注模式**：番茄钟学习时段，AI 化身严厉教官，确保学习专注度
- 🧹 **上下文断点**：手动插入记忆断点，后续对话将"轻装上阵"，不受历史拖累

### 技术亮点

| 特性 | 技术实现 | 价值 |
|------|----------|------|
| **流式传输对话** | Server-Sent Events (SSE) | 实时响应，用户体验流畅，避免长等待 |
| **上下文断点续接** | 断点标记 + 历史截断 | 灵活控制对话上下文，降低 Token 消耗 |
| **全局防抖模糊搜索** | 300ms 防抖 + 正则匹配 | 减少无效请求，提升搜索性能 |
| **双表点赞/点踩持久化** | `LikedMessage` + `DislikedMessage` 独立表 | 支持互斥逻辑，数据结构清晰 |
| **RAG 知识库** | LangChain + FAISS + Sentence Transformers | 私有化知识问答，数据安全可控 |
| **沉浸式宽屏收纳** | Tailwind CSS 过渡动画 | 丝滑的侧边栏折叠/展开体验 |
| **划词悬浮追问** | React Portal + 全局事件监听 | 打破线性交互，知识随时深挖 |
| **语音输入** | Web Speech API | 便捷的语音交互方式 |

---

## 🛠️ 技术栈

### 前端

| 技术 | 版本 | 用途 |
|------|------|------|
| Next.js | 14.2.14 | 全栈 React 框架，SSR/SSG 支持 |
| React | 18 | UI 组件库 |
| TypeScript | 5 | 类型安全 |
| Tailwind CSS | 3.4.1 | 原子化 CSS 框架 |
| Lucide React | 1.24.0 | 图标组件库 |
| React Markdown | 10.1.0 | Markdown 内容渲染 |

### 后端

| 技术 | 版本 | 用途 |
|------|------|------|
| Python | 3.x | 后端开发语言 |
| Flask | 3.0.3 | Web 框架 |
| Flask-SQLAlchemy | 3.1.1 | ORM 数据库操作 |
| Flask-CORS | 4.0.1 | 跨域资源共享 |
| SQLite | - | 轻量级数据库（默认） |
| LangChain | 0.2.12 | RAG 知识库框架 |
| FAISS-CPU | 1.8.0 | 向量数据库 |
| Sentence Transformers | 3.0.1 | 文本向量化模型 |
| PyPDF2 | 3.0.1 | PDF 文件解析 |
| Transformers | 4.45.1 | 大模型推理 |
| PyTorch | 2.4.0 | 深度学习框架 |

### 大模型服务

- **服务商**：火山引擎（Volcano Engine）
- **兼容协议**：OpenAI API 兼容接口
- **模型**：豆包 Seed（Doubao Seed）系列

---

## 🚀 安装与运行指南

### 环境要求

- **Node.js**：>= 18.x（推荐 20.x）
- **Python**：>= 3.8（推荐 3.10+）
- **内存**：>= 8GB（向量模型加载需要）

---

### 1. 克隆项目

```bash
git clone <repository-url>
cd ai-learning-assistant
```

---

### 2. 后端配置与启动

#### 2.1 创建虚拟环境

```bash
cd backend

# Windows (PowerShell)
python -m venv venv
.\venv\Scripts\Activate.ps1

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

#### 2.2 安装依赖

```bash
pip install -r requirements.txt
```

> ⚠️ **注意**：首次安装可能需要较长时间（特别是 `torch`、`transformers`、`sentence-transformers` 等深度学习库），请耐心等待。

#### 2.3 配置环境变量

创建或编辑 `backend/.env` 文件：

```env
# backend/.env

# 火山引擎 API 密钥（请替换为你的密钥）
OPENAI_API_KEY=your-volc-api-key

# 火山引擎 API 基础地址（保持不变）
OPENAI_API_BASE=https://ark.cn-beijing.volces.com/api/v3

# 模型推理接入点 ID（请替换为你的接入点）
VOLC_MODEL_ENDPOINT=your-model-endpoint-id
```

**获取方式**：
1. 注册火山引擎账号：https://console.volcengine.com/
2. 创建豆包大模型应用，获取 API Key
3. 创建推理接入点（Endpoint），获取接入点 ID

#### 2.4 初始化数据库

数据库会在应用启动时自动创建。首次启动时，系统会自动生成 `database.db` 文件。

#### 2.5 启动后端服务

```bash
python app.py
```

启动成功后，后端服务将运行在：`http://localhost:5000`

验证服务是否正常：

```bash
curl http://localhost:5000/api/sessions
```

> 预期返回：`{"success":false,"error":"请先登录"}`（说明服务正常运行，需要认证）

---

### 3. 前端配置与启动

#### 3.1 安装依赖

```bash
cd frontend
npm install
```

#### 3.2 启动开发服务器

```bash
npm run dev
```

启动成功后，前端页面将运行在：`http://localhost:3000`

---

### 4. 访问应用

1. 打开浏览器访问：`http://localhost:3000`
2. 点击"注册"按钮，创建账号
3. 使用注册的账号登录
4. 开始与 AI 聊天！

---

### 5. 测试知识库功能

1. 登录后，点击左侧边栏的"上传 PDF 文档"按钮
2. 选择一个 PDF 文件（支持拖拽上传）
3. 等待文档解析和向量化完成
4. 在聊天输入框旁，确保"检索上传文档"开关已开启
5. 提问与文档相关的问题，AI 将基于文档内容回答

---

## 📁 项目结构

```
ai-learning-assistant/
├── frontend/                    # 前端代码
│   ├── src/
│   │   ├── app/
│   │   │   ├── chat/           # 聊天页面
│   │   │   ├── dashboard/      # 数据看板
│   │   │   ├── notebook/       # 知识卡片
│   │   │   ├── focus/          # 专注空间
│   │   │   ├── login/          # 登录页面
│   │   │   ├── profile/        # 个人中心
│   │   │   └── fonts/          # 字体文件
│   │   ├── components/         # 公共组件
│   │   └── providers/          # 上下文提供者
│   ├── package.json
│   └── tailwind.config.js
│
├── backend/                    # 后端代码
│   ├── app.py                  # 主入口文件
│   ├── .env                    # 环境变量配置
│   ├── requirements.txt        # Python 依赖
│   ├── database.db             # SQLite 数据库
│   └── vector_store/           # 向量存储目录
│
└── README.md                   # 项目文档
```

---

## 🔌 API 接口文档

### 接口汇总

| 序号 | 请求方式 | 接口路径 | 功能描述 | 是否需要登录 |
|------|----------|----------|----------|--------------|
| 1 | POST | `/api/register` | 用户注册 | ❌ |
| 2 | POST | `/api/login` | 用户登录 | ❌ |
| 3 | GET | `/api/sessions` | 获取会话列表 | ✅ |
| 4 | POST | `/api/sessions` | 创建新会话 | ✅ |
| 5 | PUT | `/api/sessions/<session_id>` | 更新会话（修改标题/置顶） | ✅ |
| 6 | DELETE | `/api/sessions/<session_id>` | 删除会话 | ✅ |
| 7 | POST | `/api/chat` | 聊天接口（SSE 流式响应） | ✅ |
| 8 | POST | `/api/chat/generate_title` | 生成会话标题 | ✅ |
| 9 | POST | `/api/chat/breakpoint` | 插入上下文断点 | ✅ |
| 10 | GET | `/api/history` | 获取历史消息 | ✅ |
| 11 | DELETE | `/api/history` | 删除历史消息 | ✅ |
| 12 | GET | `/api/user/info` | 获取用户基本信息 | ✅ |
| 13 | GET | `/api/user/profile` | 获取用户详细资料 | ✅ |
| 14 | PUT | `/api/user/profile` | 更新用户资料 | ✅ |
| 15 | POST | `/api/user/change-password` | 修改密码 | ✅ |
| 16 | DELETE | `/api/user/account` | 删除用户账号 | ✅ |
| 17 | GET | `/api/user/stats` | 获取用户学习统计 | ✅ |
| 18 | GET | `/api/user/export` | 导出用户数据 | ✅ |
| 19 | GET | `/api/stats` | 获取全局统计数据 | ✅ |
| 20 | POST | `/api/favorites` | 添加收藏 | ✅ |
| 21 | GET | `/api/favorites` | 获取收藏列表 | ✅ |
| 22 | DELETE | `/api/favorites` | 按内容删除收藏 | ✅ |
| 23 | DELETE | `/api/favorites/<id>` | 按 ID 删除收藏 | ✅ |
| 24 | POST | `/api/knowledge/upload` | 上传 PDF 构建知识库 | ✅ |
| 25 | POST | `/api/messages/<message_id>/feedback` | 消息反馈（点赞/点踩） | ✅ |
| 26 | GET | `/api/search` | 搜索历史消息 | ✅ |

### 接口分类

| 模块 | 接口数量 | 说明 |
|------|----------|------|
| 用户认证 | 2 | 注册、登录（公开接口） |
| 会话管理 | 4 | CRUD 操作 |
| 聊天功能 | 3 | 对话、标题生成、断点 |
| 消息历史 | 2 | 获取、删除 |
| 用户管理 | 6 | 资料、密码、账号管理 |
| 统计分析 | 3 | 用户统计、全局统计、数据导出 |
| 收藏功能 | 4 | 添加、列表、删除 |
| 知识库 | 1 | PDF 上传 |
| 消息反馈 | 1 | 点赞/点踩 |
| 搜索功能 | 1 | 历史搜索 |

### 认证方式

所有需要登录的接口，请求头必须携带：

```
Authorization: Bearer <token>
```

其中 `<token>` 为登录成功后返回的 JWT Token，有效期为 24 小时。

---

## 📝 API 接口详情

### 1. 用户注册

**请求**：
```
POST /api/register
Content-Type: application/json

{
  "username": "string (3-50字符)",
  "password": "string (至少6字符)"
}
```

**响应**：
```json
{
  "success": true,
  "user": { "id": 1, "username": "xxx", "created_at": 1620000000 },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 2. 用户登录

**请求**：
```
POST /api/login
Content-Type: application/json

{
  "username": "string",
  "password": "string"
}
```

**响应**：
```json
{
  "success": true,
  "user": { "id": 1, "username": "xxx", "created_at": 1620000000 },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 3. 创建会话

**请求**：
```
POST /api/sessions
Authorization: Bearer <token>
```

**响应**：
```json
{
  "success": true,
  "session": { "id": "uuid", "title": "新对话", "created_at": 1620000000 }
}
```

### 4. 聊天接口（流式）

**请求**：
```
POST /api/chat
Authorization: Bearer <token>
Content-Type: application/json

{
  "message": "string (用户提问)",
  "session_id": "string (会话ID)",
  "use_rag": true,
  "is_focus_mode": false
}
```

**响应**：SSE 流式响应
```
data: {"chunk": "你"}

data: {"chunk": "好"}

data: {"chunk": "！"}

data: {"message_id": 123}

data: {"chunk": "[END]"}
```

### 5. 上传知识库

**请求**：
```
POST /api/knowledge/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <PDF文件>
```

**响应**：
```json
{
  "success": true,
  "chunks_count": 42,
  "file_name": "document.pdf"
}
```

### 6. 消息反馈

**请求**：
```
POST /api/messages/<message_id>/feedback
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "like" | "dislike"
}
```

**响应**：
```json
{
  "success": true,
  "is_liked": true,
  "is_disliked": false
}
```

---

## 📊 数据库表结构

> **说明**：SQLAlchemy 默认表名为类名小写，以下为实际生成的表名。

### 用户表（user）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键，自增 |
| username | VARCHAR(50) | 用户名，唯一 |
| password_hash | VARCHAR(255) | 密码哈希 |
| created_at | INTEGER | 创建时间戳 |
| avatar | TEXT | 头像 URL |

### 会话表（session）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | VARCHAR(36) | UUID 主键 |
| title | VARCHAR(100) | 会话标题 |
| created_at | INTEGER | 创建时间戳 |
| updated_at | INTEGER | 更新时间戳 |
| is_pinned | BOOLEAN | 是否置顶 |
| user_id | INTEGER | 用户 ID（外键） |

### 聊天记录表（chat_history）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键，自增 |
| user_id | INTEGER | 用户 ID（外键） |
| session_id | VARCHAR(36) | 会话 ID（外键） |
| role | VARCHAR(20) | 用户/助手/断点 |
| content | TEXT | 消息内容 |
| timestamp | INTEGER | 时间戳 |
| is_focus_mode | BOOLEAN | 是否专注模式 |
| feedback | VARCHAR(10) | 反馈类型 |

### 收藏表（favorite_item）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键，自增 |
| session_id | VARCHAR(36) | 会话 ID（外键） |
| user_id | INTEGER | 用户 ID（外键） |
| title | VARCHAR(200) | 收藏标题 |
| content | TEXT | 收藏内容 |
| timestamp | INTEGER | 创建时间戳 |

### 点赞表（liked_message）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键，自增 |
| user_id | INTEGER | 用户 ID（外键） |
| message_id | INTEGER | 消息 ID（外键） |
| created_at | INTEGER | 创建时间戳 |

### 点踩表（disliked_message）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键，自增 |
| user_id | INTEGER | 用户 ID（外键） |
| message_id | INTEGER | 消息 ID（外键） |
| created_at | INTEGER | 创建时间戳 |

---

## 🐛 常见问题

### 1. 后端启动失败 - 模型下载超时

**问题**：首次启动时，`sentence-transformers` 模型下载失败。

**解决**：
- 检查网络连接
- 确保已配置正确的代理（如果需要）
- 手动下载模型到 `~/.cache/huggingface/hub` 目录

### 2. 前端无法连接后端

**问题**：前端报错"网络请求失败"。

**解决**：
- 确认后端服务已启动（`http://localhost:5000`）
- 检查防火墙设置，确保 5000 端口未被占用
- 确认前端 API 地址配置正确

### 3. PDF 上传失败

**问题**：上传 PDF 后提示"解析失败"。

**解决**：
- 确保文件为有效的 PDF 格式
- 检查文件大小（最大支持 50MB）
- 确认 `PyPDF2` 库已正确安装

---

## 📄 许可证

MIT License

---

## 📞 联系方式

如有问题或建议，请通过以下方式联系：
- 提交 Issue：GitHub Issues
- 发送邮件：contact@example.com

---

*项目开发完成于 2026 年*
