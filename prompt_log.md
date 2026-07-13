# AI 学习助手 - 考核项目记录文档

## 📅 Day 1：项目基础框架搭建与首页开发

### 1. 初始化前后端分离项目框架
* **原始 Prompt：** “我是一个纯小白，现在需要你帮我搭建一个前后端分离的项目。
  1、请在当前目录下，帮我用 Next.js 初始化前端项目（放在 frontend 文件夹里），并配置好 Tailwind CSS。
  2、请在当前目录下，帮我初始化一个 Flask 后端项目（放在 backend 文件夹里），并帮我写好基础的启动文件。 请一步步告诉我需要能在终端运行的命令，不要跳步，等待我执行完再进行下一步。”
* **功能标注：** 初始化前端基础框架 (Next.js) 与 Flask 后端基础骨架
* **过程记录：** ![项目框架生成命令记录](image.png)

### 2. 构建后端虚拟环境
* **原始 Prompt：** “第一步我已经执行成功了，前端代码跑通了。请继续告诉我第二步初始化 Flask 后端的命令。”
* **功能标注：** 初始化 Flask 后端框架与虚拟环境 `(venv)`，隔离系统级全局 Python 依赖。
* **过程记录：** ![后端环境搭建命令](image-1.png) 以及 ![虚拟环境创建完毕确认](image-2.png)

### 3. 生成后端核心接口骨架
* **原始 Prompt：** “后端环境我已经装好了。现在请接管后端开发，直接在 backend 文件夹下帮我创建 app.py，并写好 /api/login、/api/chat、/api/history 这三个 API 接口的初始代码。要求符合 Flask 规范，写完后请告诉我如何启动这个后端服务。”
* **功能标注：** 利用 AI 自动生成 Flask 后端的三个核心 API 接口骨架 (`backend/app.py`)
* **过程记录：** ![后端核心API接口生成](image-3.png)

### 4. 前端高颜值首页开发
* **原始 Prompt：** 帮我编写一份极简高级感（暗黑科技风）的项目欢迎首页代码，要求完全符合 Tailwind CSS 规范。
* **功能标注：** 修改 `frontend/src/app/page.tsx`，完成项目高颜值首页 (`/`) 的 UI 界面开发
* **过程记录：** ![首页对话记录](image-4.png) 与 ![首页实际渲染效果](image-5.png)

---

## 📅 Day 2：核心对话大厅开发与前后端数据联调

### 1. 前端聊天室 UI 界面精装修
* **原始 Prompt：** 帮我设计一个包含响应式侧边栏历史记录列表、ChatGPT 同款对话气泡流以及底部精美输入框的实时聊天室前端 UI 界面。
* **功能标注：** 新建 `frontend/src/app/chat/page.tsx`，完成聊天室交互大厅的 UI 界面开发与静态状态模拟调试。
* **过程记录：** ![聊天室开发对话](image-6.png) 与 ![聊天室静态效果测试](image-7.png)

### 2. 后端真实业务逻辑与跨域配置
* **原始 Prompt：**
  “我的前端聊天页 UI 已经搭建完毕。现在请完全接管开发，帮我把后端的真实逻辑跑起来：
  1、修改 backend/app.py：实现两个真实接口：
  - /api/history (GET)：返回一个初始的历史对话列表（可以先用 Python 的数组模拟存储）。
  - /api/chat (POST)：接收前端发来的用户问题，模拟返回一个 AI 智能助手的回答，并把这轮对话存入历史记录数组中。
  2、开启跨域支持： 确保安装并配置好 flask_cors，允许前端 3000 端口访问后端的接口。
  请自动创建/修改文件并完成代码编写，写完后请告诉我，并给出在虚拟环境下启动 Flask 后端的命令。”
* **功能标注：** 修改 `backend/app.py`，实现后端真实对话接口与历史记录 API，集成跨域支持。
* **过程记录：** ![后端真实业务逻辑实现](image-8.png)

### 3. 联调报错异常处理（CORS与依赖缺失）
* **遇到问题：** 启动后端服务时，终端抛出错误 `ModuleNotFoundError: No module named 'flask_cors'`。
* **原因分析：** 虚拟环境中缺少跨域处理插件 `flask-cors`。
* **解决策略：** 保持虚拟环境激活状态，在终端执行 `pip install flask-cors` 手动补齐依赖，并成功启动后端服务。
* **过程记录：** ![效果测试](image-10.png) ➔ ![依赖安装与成功启动](image-9.png)

### 4. 前端后全线联调测试
* **核心工作：** 改写前端 `page.tsx` 代码，利用 `fetch` 异步请求后端的 `/api/chat` 和 `/api/history` 接口，将静态模拟数据替换为动态后端流水。
* **功能标注：** 改写 `frontend/src/app/chat/page.tsx`，完成前后端全线联调测试。
* **联调结果：** 页面首次加载能完美读取 Flask 历史记录；输入关键词（如“编程”、“学习”），能精准获得并渲染后端返回的智能答复，全数据链路彻底闭环。
* **过程记录：** ![遇到问题](image-11.png) 与 ![AI解决问题](image-12.png)

---

## 📅 Day 2 拓展：后端数据持久化（JSON文件系统升级）

### 1. 内存临时存储升级为数据真持久化
* **原始 Prompt：** > “目前我们的 Flask 后端是将聊天记录存在内存数组里的，服务一重启数据就全丢了。为了提高项目的完整性和健壮性，请我升级 backend/app.py：
  > 1、引入 JSON 文件存储：在 backend 文件夹下自动维护一个 history.json 文件。
  > 2、改造 /api/history 接口：当页面加载时，从 history.json 文件中读取并返回历史记录；如果文件不存在，则初始化一个包含 AI 欢迎语的默认列表并写入文件。
  > 3、改造 /api/chat 接口：当收到用户新消息并生成 AI 回复后，将最新的对话追加到 history.json 文件中保存。
  > 4、保持跨域配置：确保 flask_cors 依然正常工作。
  > 请完全接管并自动修改代码，完成后请告诉我。”
* **功能标注：** 重构后端 I/O 模块，利用 Python 的 `json` 内置库实现非易失性文件系统级存储，防止因进程关闭导致用户数据丢失。
* **过程记录：** 后端数据持久化逻辑由 Trae 自动接管并重写成功。![JSON数据持久化重构指令](image-13.png) ➔ ![JSON文件落盘与回显效果](image-14.png)+![效果测试](image-15.png)

---

## 📅 Day 2 终极进阶：依赖冲突强杀与 SQL 关系型数据库蜕变

### 1. 克服环境底层编译冲突（安装 Flask-SQLAlchemy）
* **遇到问题：** 在安装大厂级 ORM 数据库管理工具时，终端抛出严重红字阻塞：`error: Microsoft Visual C++ 14.0 or greater is required`，导致底层依赖 `greenlet` 编译失败。
* **原因分析：** 1. 初始虚拟环境自带的包管理工具 `pip` 版本过旧，无法正确识别云端已打包好的免编译二进制文件（`.whl` 轮子包）。
  2. 传统机制下系统自动降级尝试本地编译源码，由于 Windows 环境缺乏 C++ 编译环境而直接崩溃。
* **解决策略：** 顶住压力不下载几 GB 的庞大编译工具，采取职业程序员的“强制免编译路径”。在激活的 `(venv)` 虚拟环境下，顺序执行以下三剑客命令：

![依赖强杀与启动命令](image-15.png)
![关系型数据库落盘效果](image-16.png)

```bash
# 1. 强刷升级 pip 工具链至最新版本
python -m pip install --upgrade pip -i [https://pypi.tuna.tsinghua.edu.cn/simple](https://pypi.tuna.tsinghua.edu.cn/simple)
# 2. 绕过本地编译，强制指定下载全现成二进制包
pip install greenlet --only-binary=:all: -i [https://pypi.tuna.tsinghua.edu.cn/simple](https://pypi.tuna.tsinghua.edu.cn/simple)
# 3. 顺畅安装核心 ORM 框架
pip install flask-sqlalchemy -i [https://pypi.tuna.tsinghua.edu.cn/simple](https://pypi.tuna.tsinghua.edu.cn/simple)
