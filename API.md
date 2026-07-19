# 🔌 API 接口文档

## 接口汇总

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

## 接口分类

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

## 认证方式

所有需要登录的接口，请求头必须携带：

```
Authorization: Bearer <token>
```

其中 `<token>` 为登录成功后返回的 JWT Token，有效期为 24 小时。

---

## 📝 API 接口详情

### 1. 用户注册

**接口名称**：用户注册

**请求方式**：POST

**URL 路径**：`/api/register`

**请求头**：
- Content-Type: application/json

**请求参数**：

```json
{
  "username": "string (3-50字符)",
  "password": "string (至少6字符)"
}
```

**成功响应**（HTTP 201）：

```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "testuser",
    "created_at": 1620000000,
    "avatar": null
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**失败响应**：

```json
// 400 - 参数错误
{
  "success": false,
  "error": "用户名和密码不能为空"
}

// 400 - 用户名长度不符合要求
{
  "success": false,
  "error": "用户名长度必须在3-50个字符之间"
}

// 409 - 用户名已存在
{
  "success": false,
  "error": "用户名已存在"
}
```

---

### 2. 用户登录

**接口名称**：用户登录

**请求方式**：POST

**URL 路径**：`/api/login`

**请求头**：
- Content-Type: application/json

**请求参数**：

```json
{
  "username": "string",
  "password": "string"
}
```

**成功响应**（HTTP 200）：

```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "testuser",
    "created_at": 1620000000,
    "avatar": null
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**失败响应**：

```json
// 400 - 参数错误
{
  "success": false,
  "error": "用户名和密码不能为空"
}

// 401 - 用户名或密码错误
{
  "success": false,
  "error": "用户名或密码错误"
}
```

---

### 3. 获取会话列表

**接口名称**：获取会话列表

**请求方式**：GET

**URL 路径**：`/api/sessions`

**请求头**：
- Authorization: Bearer <token>

**请求参数**：无

**成功响应**（HTTP 200）：

```json
{
  "success": true,
  "sessions": [
    {
      "id": "uuid-string",
      "title": "新对话",
      "created_at": 1620000000,
      "updated_at": 1620000000,
      "is_pinned": false
    }
  ]
}
```

**失败响应**：

```json
// 401 - 未登录
{
  "success": false,
  "error": "请先登录"
}
```

---

### 4. 创建新会话

**接口名称**：创建新会话

**请求方式**：POST

**URL 路径**：`/api/sessions`

**请求头**：
- Authorization: Bearer <token>

**请求参数**：无

**成功响应**（HTTP 200）：

```json
{
  "success": true,
  "session": {
    "id": "uuid-string",
    "title": "新对话",
    "created_at": 1620000000,
    "updated_at": 1620000000,
    "is_pinned": false
  }
}
```

**失败响应**：

```json
// 401 - 未登录
{
  "success": false,
  "error": "请先登录"
}
```

---

### 5. 更新会话

**接口名称**：更新会话（修改标题/置顶）

**请求方式**：PUT

**URL 路径**：`/api/sessions/<session_id>`

**请求头**：
- Authorization: Bearer <token>
- Content-Type: application/json

**请求参数**：

```json
{
  "title": "string (可选，新标题)",
  "is_pinned": true (可选，是否置顶)
}
```

**成功响应**（HTTP 200）：

```json
{
  "success": true,
  "session": {
    "id": "uuid-string",
    "title": "修改后的标题",
    "created_at": 1620000000,
    "updated_at": 1620001000,
    "is_pinned": true
  }
}
```

**失败响应**：

```json
// 401 - 未登录
{
  "success": false,
  "error": "请先登录"
}

// 404 - 会话不存在
{
  "success": false,
  "error": "会话不存在"
}
```

---

### 6. 删除会话

**接口名称**：删除会话

**请求方式**：DELETE

**URL 路径**：`/api/sessions/<session_id>`

**请求头**：
- Authorization: Bearer <token>

**请求参数**：无

**成功响应**（HTTP 200）：

```json
{
  "success": true
}
```

**失败响应**：

```json
// 401 - 未登录
{
  "success": false,
  "error": "请先登录"
}

// 404 - 会话不存在
{
  "success": false,
  "error": "会话不存在"
}
```

---

### 7. 聊天接口（流式）

**接口名称**：聊天接口（SSE 流式响应）

**请求方式**：POST

**URL 路径**：`/api/chat`

**请求头**：
- Authorization: Bearer <token>
- Content-Type: application/json

**请求参数**：

```json
{
  "message": "string (用户提问)",
  "session_id": "string (会话ID，必填)",
  "use_rag": true (可选，是否使用知识库检索，默认true),
  "is_focus_mode": false (可选，是否专注模式，默认false)
}
```

**成功响应**（SSE 流式响应）：

```
data: {"chunk": "你"}

data: {"chunk": "好"}

data: {"chunk": "！"}

data: {"message_id": 123}

data: {"chunk": "[END]"}
```

**失败响应**：

```json
// 400 - 缺少 session_id
{
  "success": false,
  "error": "session_id is required"
}

// 401 - 未登录
{
  "success": false,
  "error": "请先登录"
}
```

---

### 8. 生成会话标题

**接口名称**：生成会话标题

**请求方式**：POST

**URL 路径**：`/api/chat/generate_title`

**请求头**：
- Authorization: Bearer <token>
- Content-Type: application/json

**请求参数**：

```json
{
  "session_id": "string (会话ID，必填)",
  "content": "string (用于生成标题的内容，必填)"
}
```

**成功响应**（HTTP 200）：

```json
{
  "success": true,
  "title": "Python 基础语法讲解"
}
```

**失败响应**：

```json
// 400 - 参数缺失
{
  "success": false,
  "error": "session_id and content are required"
}

// 401 - 未登录
{
  "success": false,
  "error": "请先登录"
}
```

---

### 9. 插入上下文断点

**接口名称**：插入上下文断点

**请求方式**：POST

**URL 路径**：`/api/chat/breakpoint`

**请求头**：
- Authorization: Bearer <token>
- Content-Type: application/json

**请求参数**：

```json
{
  "session_id": "string (会话ID，必填)"
}
```

**成功响应**（HTTP 200）：

```json
{
  "success": true
}
```

**失败响应**：

```json
// 400 - 缺少 session_id
{
  "success": false,
  "error": "session_id is required"
}

// 401 - 未登录
{
  "success": false,
  "error": "请先登录"
}
```

---

### 10. 获取历史消息

**接口名称**：获取历史消息

**请求方式**：GET

**URL 路径**：`/api/history?session_id=<session_id>`

**请求头**：
- Authorization: Bearer <token>

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| session_id | string | 是 | 会话 ID |

**成功响应**（HTTP 200）：

```json
{
  "success": true,
  "history": [
    {
      "id": 1,
      "user_id": 1,
      "session_id": "uuid-string",
      "role": "assistant",
      "content": "你好！我是你的AI学习助手...",
      "timestamp": 1620000000,
      "is_focus_mode": false,
      "is_favorited": false,
      "is_liked": false,
      "is_disliked": false
    },
    {
      "id": 2,
      "user_id": 1,
      "session_id": "uuid-string",
      "role": "user",
      "content": "你好",
      "timestamp": 1620000001,
      "is_focus_mode": false,
      "is_favorited": false,
      "is_liked": false,
      "is_disliked": false
    }
  ]
}
```

**失败响应**：

```json
// 400 - 缺少 session_id
{
  "success": false,
  "error": "session_id is required"
}

// 401 - 未登录
{
  "success": false,
  "error": "请先登录"
}
```

---

### 11. 删除历史消息

**接口名称**：删除历史消息

**请求方式**：DELETE

**URL 路径**：`/api/history?session_id=<session_id>`

**请求头**：
- Authorization: Bearer <token>

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| session_id | string | 否 | 会话 ID，不传则删除当前用户所有历史 |

**成功响应**（HTTP 200）：

```json
{
  "status": "success"
}
```

**失败响应**：

```json
// 401 - 未登录
{
  "success": false,
  "error": "请先登录"
}
```

---

### 12. 获取用户基本信息

**接口名称**：获取用户基本信息

**请求方式**：GET

**URL 路径**：`/api/user/info`

**请求头**：
- Authorization: Bearer <token>

**请求参数**：无

**成功响应**（HTTP 200）：

```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "testuser",
    "created_at": 1620000000,
    "avatar": null
  }
}
```

**失败响应**：

```json
// 401 - 未登录
{
  "success": false,
  "error": "请先登录"
}
```

---

### 13. 获取用户详细资料

**接口名称**：获取用户详细资料

**请求方式**：GET

**URL 路径**：`/api/user/profile`

**请求头**：
- Authorization: Bearer <token>

**请求参数**：无

**成功响应**（HTTP 200）：

```json
{
  "success": true,
  "id": 1,
  "username": "testuser",
  "created_at": 1620000000,
  "avatar": "data:image/png;base64,iVBORw0KGgo..."
}
```

**失败响应**：

```json
// 401 - 未登录
{
  "success": false,
  "error": "请先登录"
}
```

---

### 14. 更新用户资料

**接口名称**：更新用户资料

**请求方式**：PUT

**URL 路径**：`/api/user/profile`

**请求头**：
- Authorization: Bearer <token>
- Content-Type: application/json

**请求参数**：

```json
{
  "username": "string (可选，新用户名)",
  "avatar": "string (可选，Base64 编码的头像图片)"
}
```

**成功响应**（HTTP 200）：

```json
{
  "success": true,
  "id": 1,
  "username": "newusername",
  "created_at": 1620000000,
  "avatar": "data:image/png;base64,iVBORw0KGgo..."
}
```

**失败响应**：

```json
// 400 - 用户名为空
{
  "success": false,
  "error": "用户名不能为空"
}

// 400 - 用户名已被使用
{
  "success": false,
  "error": "该用户名已被使用"
}

// 401 - 未登录
{
  "success": false,
  "error": "请先登录"
}
```

---

### 15. 修改密码

**接口名称**：修改密码

**请求方式**：POST

**URL 路径**：`/api/user/change-password`

**请求头**：
- Authorization: Bearer <token>
- Content-Type: application/json

**请求参数**：

```json
{
  "old_password": "string (原密码，必填)",
  "new_password": "string (新密码，至少6字符，必填)"
}
```

**成功响应**（HTTP 200）：

```json
{
  "success": true,
  "message": "密码修改成功，请重新登录"
}
```

**失败响应**：

```json
// 400 - 参数缺失
{
  "success": false,
  "error": "原密码和新密码不能为空"
}

// 400 - 新密码长度不足
{
  "success": false,
  "error": "新密码长度至少6个字符"
}

// 400 - 原密码错误
{
  "success": false,
  "error": "原密码输入错误"
}

// 401 - 未登录
{
  "success": false,
  "error": "请先登录"
}
```

---

### 16. 删除用户账号

**接口名称**：删除用户账号

**请求方式**：DELETE

**URL 路径**：`/api/user/account`

**请求头**：
- Authorization: Bearer <token>

**请求参数**：无

**成功响应**（HTTP 200）：

```json
{
  "success": true,
  "message": "账号已成功注销"
}
```

**失败响应**：

```json
// 401 - 未登录
{
  "success": false,
  "error": "请先登录"
}
```

---

### 17. 获取用户学习统计

**接口名称**：获取用户学习统计

**请求方式**：GET

**URL 路径**：`/api/user/stats`

**请求头**：
- Authorization: Bearer <token>

**请求参数**：无

**成功响应**（HTTP 200）：

```json
{
  "success": true,
  "total_chats": 100,
  "learning_days": 15,
  "last_7_days": [5, 3, 8, 2, 10, 6, 4]
}
```

**失败响应**：

```json
// 401 - 未登录
{
  "success": false,
  "error": "请先登录"
}
```

---

### 18. 导出用户数据

**接口名称**：导出用户数据

**请求方式**：GET

**URL 路径**：`/api/user/export`

**请求头**：
- Authorization: Bearer <token>

**请求参数**：无

**成功响应**（HTTP 200）：

```json
{
  "success": true,
  "data": [
    {
      "role": "user",
      "content": "你好",
      "timestamp": 1620000000
    },
    {
      "role": "assistant",
      "content": "你好！我是你的AI学习助手...",
      "timestamp": 1620000001
    }
  ]
}
```

**失败响应**：

```json
// 401 - 未登录
{
  "success": false,
  "error": "请先登录"
}
```

---

### 19. 获取全局统计数据

**接口名称**：获取全局统计数据

**请求方式**：GET

**URL 路径**：`/api/stats`

**请求头**：
- Authorization: Bearer <token>

**请求参数**：无

**成功响应**（HTTP 200）：

```json
{
  "total_chats": 100,
  "ai_words": 5000,
  "topic_stats": [
    {"name": "编程技术", "value": 40},
    {"name": "数理逻辑", "value": 20},
    {"name": "语言学习", "value": 25},
    {"name": "综合通识", "value": 15}
  ]
}
```

**失败响应**：

```json
// 401 - 未登录
{
  "success": false,
  "error": "请先登录"
}
```

---

### 20. 添加收藏

**接口名称**：添加收藏

**请求方式**：POST

**URL 路径**：`/api/favorites`

**请求头**：
- Authorization: Bearer <token>
- Content-Type: application/json

**请求参数**：

```json
{
  "title": "string (收藏标题，必填)",
  "content": "string (收藏内容，必填)",
  "session_id": "string (会话ID，可选)"
}
```

**成功响应**（HTTP 200）：

```json
{
  "success": true,
  "id": 1
}
```

**失败响应**：

```json
// 400 - 参数缺失
{
  "success": false,
  "error": "标题和内容不能为空"
}

// 401 - 未登录
{
  "success": false,
  "error": "请先登录"
}
```

---

### 21. 获取收藏列表

**接口名称**：获取收藏列表

**请求方式**：GET

**URL 路径**：`/api/favorites`

**请求头**：
- Authorization: Bearer <token>

**请求参数**：无

**成功响应**（HTTP 200）：

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "session_id": "uuid-string",
      "title": "Python 基础",
      "content": "Python 是一种高级编程语言...",
      "timestamp": 1620000000
    }
  ]
}
```

**失败响应**：

```json
// 401 - 未登录
{
  "success": false,
  "error": "请先登录"
}
```

---

### 22. 按内容删除收藏

**接口名称**：按内容删除收藏

**请求方式**：DELETE

**URL 路径**：`/api/favorites`

**请求头**：
- Authorization: Bearer <token>
- Content-Type: application/json

**请求参数**：

```json
{
  "content": "string (收藏内容，必填)"
}
```

**成功响应**（HTTP 200）：

```json
{
  "success": true
}
```

**失败响应**：

```json
// 400 - 参数缺失
{
  "success": false,
  "error": "content is required"
}

// 404 - 收藏不存在
{
  "success": false,
  "error": "收藏不存在"
}

// 401 - 未登录
{
  "success": false,
  "error": "请先登录"
}
```

---

### 23. 按 ID 删除收藏

**接口名称**：按 ID 删除收藏

**请求方式**：DELETE

**URL 路径**：`/api/favorites/<id>`

**请求头**：
- Authorization: Bearer <token>

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | int | 是 | 收藏记录 ID（URL 路径参数） |

**成功响应**（HTTP 200）：

```json
{
  "success": true
}
```

**失败响应**：

```json
// 404 - 收藏不存在
{
  "success": false,
  "error": "收藏不存在"
}

// 401 - 未登录
{
  "success": false,
  "error": "请先登录"
}
```

---

### 24. 上传 PDF 构建知识库

**接口名称**：上传 PDF 构建知识库

**请求方式**：POST

**URL 路径**：`/api/knowledge/upload`

**请求头**：
- Authorization: Bearer <token>
- Content-Type: multipart/form-data

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| file | File | 是 | PDF 文件（最大 100MB） |

**成功响应**（HTTP 200）：

```json
{
  "success": true,
  "chunks_count": 42,
  "file_name": "document.pdf"
}
```

**失败响应**：

```json
// 400 - 未上传文件
{
  "success": false,
  "error": "未上传文件"
}

// 400 - 文件格式错误
{
  "success": false,
  "error": "仅支持 PDF 文件"
}

// 400 - 无法提取文本
{
  "success": false,
  "error": "无法从 PDF 中提取文本"
}

// 401 - 未登录
{
  "success": false,
  "error": "请先登录"
}
```

---

### 25. 消息反馈（点赞/点踩）

**接口名称**：消息反馈（点赞/点踩）

**请求方式**：POST

**URL 路径**：`/api/messages/<message_id>/feedback`

**请求头**：
- Authorization: Bearer <token>
- Content-Type: application/json

**请求参数**：

```json
{
  "type": "like" | "dislike" (反馈类型，必填)
}
```

**成功响应**（HTTP 200）：

```json
{
  "success": true,
  "is_liked": true,
  "is_disliked": false
}
```

**失败响应**：

```json
// 400 - 无效的反馈类型
{
  "success": false,
  "error": "无效的反馈类型"
}

// 404 - 消息不存在
{
  "success": false,
  "error": "消息不存在"
}

// 401 - 未登录
{
  "success": false,
  "error": "请先登录"
}
```

---

### 26. 搜索历史消息

**接口名称**：搜索历史消息

**请求方式**：GET

**URL 路径**：`/api/search?q=<keyword>`

**请求头**：
- Authorization: Bearer <token>

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| q | string | 是 | 搜索关键词 |

**成功响应**（HTTP 200）：

```json
{
  "success": true,
  "results": [
    {
      "content": "Python 是一种高级编程语言...",
      "role": "assistant",
      "chatId": "uuid-string",
      "createdAt": 1620000000
    }
  ]
}
```

**失败响应**：

```json
// 401 - 未登录
{
  "success": false,
  "error": "请先登录"
}
```

---

## 错误码说明

| HTTP 状态码 | 说明 | 典型场景 |
|-------------|------|----------|
| 200 | 请求成功 | 正常响应 |
| 201 | 创建成功 | 用户注册成功 |
| 400 | 请求参数错误 | 参数缺失、格式错误、长度不符合要求 |
| 401 | 未授权 | 未登录、Token 无效或过期 |
| 404 | 资源不存在 | 会话不存在、消息不存在、收藏不存在 |
| 409 | 冲突 | 用户名已存在 |
| 500 | 服务器错误 | 数据库操作失败、第三方 API 调用失败 |

---

## 使用示例

### cURL 示例

**登录获取 Token**：
```bash
curl -X POST http://localhost:5000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"test123"}'
```

**发送聊天消息（流式）**：
```bash
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{"message":"你好","session_id":"<session-id>"}'
```

**获取历史消息**：
```bash
curl -X GET "http://localhost:5000/api/history?session_id=<session-id>" \
  -H "Authorization: Bearer <your-token>"
```

---

*文档版本：v1.0*  
*最后更新：2026年7月*
