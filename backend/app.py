from flask import Flask, request, jsonify, Response, stream_with_context, g
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
import time
import json
import os
import traceback

os.environ['HF_ENDPOINT'] = 'https://hf-mirror.com'
os.environ['NO_PROXY'] = '*'
os.environ['no_proxy'] = '*'

proxy_vars = ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy', 'ALL_PROXY', 'all_proxy']
for var in proxy_vars:
    if var in os.environ:
        del os.environ[var]

import requests

def create_no_proxy_session():
    session = requests.Session()
    session.trust_env = False
    session.max_redirects = 10
    adapter = requests.adapters.HTTPAdapter(max_retries=3)
    session.mount('https://', adapter)
    session.mount('http://', adapter)
    return session

try:
    import huggingface_hub.file_download as file_download_module
    import huggingface_hub.utils._http as http_module

    original_get_session = http_module.get_session

    def patched_get_session():
        return create_no_proxy_session()

    http_module.get_session = patched_get_session

    original_get_metadata_or_catch_error = file_download_module._get_metadata_or_catch_error

    def patched_get_metadata_or_catch_error(*, repo_id, filename, repo_type, revision, endpoint, proxies, etag_timeout, headers, token, local_files_only, relative_filename=None, storage_folder=None):
        session = http_module.get_session()
        base_url = endpoint or 'https://hf-mirror.com'
        full_url = f"{base_url}/{repo_id}/resolve/{revision}/{filename}"

        try:
            response = session.head(full_url, headers=headers, timeout=etag_timeout, allow_redirects=True)
            response.raise_for_status()

            raw_etag = response.headers.get('etag', '').strip('"\'')
            raw_commit = response.headers.get('x-repo-commit') or response.headers.get('x-huggingface-commit') or 'unknown'
            commit_hash = raw_commit.strip('"\'')
            content_length = int(response.headers.get('content-length', 0))

            return_url = f"{base_url}/{repo_id}/resolve/{revision}/{filename}"
            return (return_url, raw_etag, commit_hash, content_length, None, None)

        except Exception as head_e:
            try:
                response = session.get(full_url, headers=headers, timeout=etag_timeout, allow_redirects=True)
                response.raise_for_status()

                raw_etag = response.headers.get('etag', '').strip('"\'')
                raw_commit = response.headers.get('x-repo-commit') or response.headers.get('x-huggingface-commit') or 'unknown'
                commit_hash = raw_commit.strip('"\'')
                content_length = len(response.content)

                return_url = f"{base_url}/{repo_id}/resolve/{revision}/{filename}"
                return (return_url, raw_etag, commit_hash, content_length, None, None)

            except Exception as get_e:
                return (None, None, None, 0, None, get_e)

    file_download_module._get_metadata_or_catch_error = patched_get_metadata_or_catch_error
    print("✅ huggingface_hub 已被 Patch 以支持 hf-mirror.com")
except Exception as e:
    print(f"⚠️ huggingface_hub Patch 失败: {e}")

import uuid
import base64
import hashlib
import datetime
import hmac
from PyPDF2 import PdfReader
from langchain.text_splitter import RecursiveCharacterTextSplitter
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True, methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])

basedir = os.path.abspath(os.path.dirname(__file__))
DATABASE_PATH = os.path.join(basedir, 'database.db')
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{DATABASE_PATH}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'your-secret-key-change-in-production-2024'

LLM_API_KEY = os.environ.get('LLM_API_KEY', '')
LLM_API_BASE = os.environ.get('LLM_API_BASE', 'https://open.bigmodel.cn/api/paas/v4/chat/completions')
LLM_MODEL = os.environ.get('LLM_MODEL', 'glm-4-flash')

print(f"数据库连接路径: {DATABASE_PATH}")
print(f"大模型配置 - API_BASE: {LLM_API_BASE}, MODEL: {LLM_MODEL}, API_KEY: {'已配置' if LLM_API_KEY else '未配置'}")

VECTOR_STORE_DIR = os.path.join(basedir, 'vector_store')
if not os.path.exists(VECTOR_STORE_DIR):
    os.makedirs(VECTOR_STORE_DIR)
print(f"向量存储目录: {VECTOR_STORE_DIR}")

db = SQLAlchemy(app)

EMBEDDING_MODEL = None

def _pre_download_model():
    import requests
    import json
    
    session = requests.Session()
    session.trust_env = False
    
    cache_base = os.path.expanduser('~/.cache/huggingface/hub')
    repo_cache = os.path.join(cache_base, 'models--sentence-transformers--all-MiniLM-L6-v2')
    snapshot_dir = os.path.join(repo_cache, 'snapshots', '1110a243fdf4706b3f48f1d95db1a4f5529b4d41')
    
    os.makedirs(snapshot_dir, exist_ok=True)
    
    files_to_download = [
        'modules.json',
        'config_sentence_transformers.json',
        'config.json',
        'tokenizer.json',
        'tokenizer_config.json',
        'vocab.txt',
        'pytorch_model.bin',
        'special_tokens_map.json',
        '1_Pooling/config.json',
    ]
    
    all_success = True
    for filename in files_to_download:
        url = f"https://hf-mirror.com/sentence-transformers/all-MiniLM-L6-v2/resolve/main/{filename}"
        try:
            response = session.get(url, timeout=60, allow_redirects=True)
            response.raise_for_status()
            
            content = response.content
            snapshot_path = os.path.join(snapshot_dir, filename)
            os.makedirs(os.path.dirname(snapshot_path), exist_ok=True)
            
            with open(snapshot_path, 'wb') as f:
                f.write(content)
                
        except Exception as e:
            all_success = False
            print(f"预下载 {filename} 失败: {e}")
    
    normalize_dir = os.path.join(snapshot_dir, '2_Normalize')
    os.makedirs(normalize_dir, exist_ok=True)
    normalize_config = {
        "idx": 2,
        "name": "2",
        "path": "2_Normalize",
        "type": "sentence_transformers.models.Normalize",
        "params": {"p": 2, "dim": None}
    }
    with open(os.path.join(normalize_dir, 'config.json'), 'w') as f:
        json.dump(normalize_config, f, indent=2)
    
    refs_dir = os.path.join(repo_cache, 'refs')
    os.makedirs(refs_dir, exist_ok=True)
    with open(os.path.join(refs_dir, 'main'), 'w') as f:
        f.write('1110a243fdf4706b3f48f1d95db1a4f5529b4d41')
    
    return all_success

def get_embedding_model():
    global EMBEDDING_MODEL
    if EMBEDDING_MODEL is None:
        try:
            EMBEDDING_MODEL = SentenceTransformer('all-MiniLM-L6-v2')
        except Exception as e:
            print(f"模型加载失败，尝试预下载: {e}")
            
            try:
                print("开始预下载模型文件...")
                _pre_download_model()
                print("预下载完成，尝试本地加载...")
                snapshot_dir = os.path.join(os.path.expanduser('~/.cache/huggingface/hub'), 'models--sentence-transformers--all-MiniLM-L6-v2', 'snapshots', '1110a243fdf4706b3f48f1d95db1a4f5529b4d41')
                EMBEDDING_MODEL = SentenceTransformer(snapshot_dir)
                print("✅ 模型通过预下载成功加载！")
            except Exception as pre_e:
                print(f"预下载也失败: {pre_e}")
                traceback.print_exc()
                raise RuntimeError("AI 向量化模型下载失败，请检查网络代理或稍后重试。")
    return EMBEDDING_MODEL

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(50), nullable=False, unique=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.Integer, nullable=False)
    avatar = db.Column(db.Text, nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'created_at': self.created_at,
            'avatar': self.avatar
        }

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Session(db.Model):
    id = db.Column(db.String(36), primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.Integer, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'created_at': self.created_at
        }

class ChatHistory(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    session_id = db.Column(db.String(36), db.ForeignKey('session.id'), nullable=False)
    role = db.Column(db.String(20), nullable=False)
    content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.Integer, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'session_id': self.session_id,
            'role': self.role,
            'content': self.content,
            'timestamp': self.timestamp
        }

def base64url_encode(data):
    if isinstance(data, str):
        data = data.encode('utf-8')
    encoded = base64.urlsafe_b64encode(data).decode('utf-8')
    return encoded.rstrip('=')

def base64url_decode(data):
    padding = 4 - (len(data) % 4)
    data += '=' * padding
    return base64.urlsafe_b64decode(data).decode('utf-8')

def generate_token(user_id):
    header = json.dumps({'alg': 'HS256', 'typ': 'JWT'})
    payload = json.dumps({'user_id': user_id, 'exp': time.time() + 24 * 60 * 60})
    
    encoded_header = base64url_encode(header)
    encoded_payload = base64url_encode(payload)
    
    signing_input = f"{encoded_header}.{encoded_payload}"
    signature = hmac.new(
        app.config['SECRET_KEY'].encode('utf-8'),
        signing_input.encode('utf-8'),
        hashlib.sha256
    ).digest()
    encoded_signature = base64url_encode(signature)
    
    return f"{encoded_header}.{encoded_payload}.{encoded_signature}"

def decode_token(token):
    try:
        parts = token.split('.')
        if len(parts) != 3:
            return None
        
        encoded_header, encoded_payload, encoded_signature = parts
        
        signing_input = f"{encoded_header}.{encoded_payload}"
        expected_signature = hmac.new(
            app.config['SECRET_KEY'].encode('utf-8'),
            signing_input.encode('utf-8'),
            hashlib.sha256
        ).digest()
        
        if base64url_encode(expected_signature) != encoded_signature:
            return None
        
        payload = json.loads(base64url_decode(encoded_payload))
        return payload
    
    except Exception:
        return None

def login_required(f):
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'success': False, 'error': '请先登录'}), 401
        
        try:
            token = auth_header.split(' ')[1]
            payload = decode_token(token)
            
            if not payload:
                return jsonify({'success': False, 'error': '无效的Token'}), 401
            
            user_id = payload.get('user_id')
            exp = payload.get('exp')
            
            if not user_id or (exp and time.time() > exp):
                return jsonify({'success': False, 'error': 'Token已过期'}), 401
            
            user = User.query.get(user_id)
            if not user:
                return jsonify({'success': False, 'error': '用户不存在'}), 401
            
            g.user = user
            g.user_id = user_id
            
        except Exception as e:
            return jsonify({'success': False, 'error': f'认证失败: {str(e)}'}), 401
        
        return f(*args, **kwargs)
    
    decorated_function.__name__ = f.__name__
    return decorated_function

@app.route('/api/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        username = data.get('username', '').strip()
        password = data.get('password', '')

        if not username or not password:
            return jsonify({'success': False, 'error': '用户名和密码不能为空'}), 400
        
        if len(username) < 3 or len(username) > 50:
            return jsonify({'success': False, 'error': '用户名长度必须在3-50个字符之间'}), 400
        
        if len(password) < 6:
            return jsonify({'success': False, 'error': '密码长度至少6个字符'}), 400

        existing_user = User.query.filter_by(username=username).first()
        if existing_user:
            return jsonify({'success': False, 'error': '用户名已存在'}), 409

        new_user = User(
            username=username,
            created_at=int(time.time())
        )
        new_user.set_password(password)
        
        db.session.add(new_user)
        db.session.commit()

        token = generate_token(new_user.id)
        
        return jsonify({
            'success': True,
            'user': new_user.to_dict(),
            'token': token
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"注册失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        username = data.get('username', '').strip()
        password = data.get('password', '')

        if not username or not password:
            return jsonify({'success': False, 'error': '用户名和密码不能为空'}), 400

        user = User.query.filter_by(username=username).first()
        if not user:
            return jsonify({'success': False, 'error': '用户名或密码错误'}), 401
        
        if not user.check_password(password):
            return jsonify({'success': False, 'error': '用户名或密码错误'}), 401

        token = generate_token(user.id)

        return jsonify({
            'success': True,
            'user': user.to_dict(),
            'token': token
        })

    except Exception as e:
        print(f"登录失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

def retrieve_knowledge(user_id, query, top_k=3):
    user_id_str = str(user_id)
    index_path = os.path.join(VECTOR_STORE_DIR, f'{user_id_str}.faiss')
    chunks_path = os.path.join(VECTOR_STORE_DIR, f'{user_id_str}_chunks.json')
    
    if not os.path.exists(index_path) or not os.path.exists(chunks_path):
        return None
    
    try:
        index = faiss.read_index(index_path)
        
        with open(chunks_path, 'r', encoding='utf-8') as f:
            chunks = json.load(f)
        
        model = get_embedding_model()
        query_embedding = model.encode([query])
        
        distances, indices = index.search(np.array(query_embedding), top_k)
        
        retrieved_chunks = []
        for idx in indices[0]:
            if idx < len(chunks):
                retrieved_chunks.append(chunks[idx])
        
        print("===== 检索到的文本 =====")
        for i, chunk in enumerate(retrieved_chunks):
            print(f"{i+1}. {chunk}")
        print("===== 检索结束 =====")
        
        return retrieved_chunks if retrieved_chunks else None
    
    except Exception as e:
        print(f"知识库检索失败: {e}")
        traceback.print_exc()
        return None

def call_llm(messages):
    print("===== 发送给大模型的 Messages =====")
    for msg in messages:
        print(f"role: {msg['role']}")
        print(f"content: {msg['content'][:200]}..." if len(msg['content']) > 200 else f"content: {msg['content']}")
        print()
    print("===== Messages 结束 =====")
    
    if not LLM_API_KEY:
        return generate_fallback_response(messages)
    
    try:
        session = requests.Session()
        session.trust_env = False
        
        payload = {
            'model': LLM_MODEL,
            'messages': messages,
            'stream': False
        }
        
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {LLM_API_KEY}'
        }
        
        response = session.post(LLM_API_BASE, json=payload, headers=headers, timeout=60)
        response.raise_for_status()
        
        result = response.json()
        
        if 'choices' in result and result['choices']:
            return result['choices'][0]['message']['content']
        
        return "抱歉，我暂时无法回答这个问题。"
    
    except Exception as e:
        print(f"大模型调用失败: {e}")
        traceback.print_exc()
        return generate_fallback_response(messages)

def generate_fallback_response(messages):
    system_content = ""
    user_message = ""
    
    for msg in messages:
        if msg['role'] == 'system':
            system_content = msg['content']
        elif msg['role'] == 'user':
            user_message = msg['content']
    
    if '参考资料' in system_content:
        import re
        match = re.search(r'参考资料：\n(.+)', system_content, re.DOTALL)
        if match:
            reference_text = match.group(1).strip()
            
            cleaned_message = user_message.replace('？', '').replace('？', '')
            
            single_chars = re.findall(r'[\u4e00-\u9fa5]', cleaned_message)
            keywords = []
            for i in range(len(single_chars) - 1):
                keywords.append(single_chars[i] + single_chars[i+1])
            
            if keywords:
                for sentence in reference_text.split('\n'):
                    if any(keyword in sentence for keyword in keywords):
                        return sentence
            
            return '知识库中未找到相关内容'
    
    responses = {
        '你好': '你好呀！😊 很高兴见到你！',
        '你是谁': '我是你的AI学习助手，专门帮助你解答各种问题！',
        '谢谢': '不客气！有任何问题随时来找我！',
        '再见': '再见！祝你学习进步！👋',
        '学习': '学习是一件很棒的事情！你想学习哪方面的知识呢？',
        '编程': '编程很有趣！你想学习哪种编程语言？Python、JavaScript还是其他？',
        '数学': '数学是科学的基础！有什么数学问题我可以帮你解答吗？',
        '英语': '英语学习需要坚持！你可以每天背单词、看英文电影来提高！',
    }
    
    for keyword, response in responses.items():
        if keyword in user_message:
            return response
    
    return f'这是一个很好的问题！关于「{user_message}」，我可以为你提供一些学习建议。首先，你可以通过查阅相关资料来了解基础知识，然后通过实践来加深理解。如果有具体的问题，随时可以问我！'

def generate_messages(message, context=None):
    messages = []
    
    if context:
        retrieved_texts = '\n'.join([f'- {chunk}' for chunk in context])
        system_content = f"""你是一个聪明且严谨的私有知识库助手。
请结合【参考资料】与你的逻辑推理能力，来回答用户的问题。
如果用户的问题基于资料可以推导、计算或总结，请给出合理的推导结果（例如数学计算）。
只有当用户问的问题与资料完全风马牛不相及、或者资料中找不到任何线索时，才回答'知识库中未找到相关内容'。

参考资料：
{retrieved_texts}"""
        messages.append({'role': 'system', 'content': system_content})
    else:
        messages.append({'role': 'system', 'content': '你是一个专业的 AI 学习助手，帮助用户解答各种学习相关的问题。'})
    
    messages.append({'role': 'user', 'content': message})
    
    return messages

@app.route('/api/sessions', methods=['GET'])
@login_required
def get_sessions():
    try:
        sessions = Session.query.filter_by(user_id=g.user_id).order_by(Session.created_at.desc()).all()
        return jsonify({
            'success': True,
            'sessions': [session.to_dict() for session in sessions]
        })
    except Exception as e:
        print(f"获取会话列表失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/sessions', methods=['POST'])
@login_required
def create_session():
    try:
        session_id = str(uuid.uuid4())
        new_session = Session(
            id=session_id,
            title='新对话',
            created_at=int(time.time()),
            user_id=g.user_id
        )
        db.session.add(new_session)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'session': new_session.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        print(f"创建会话失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/sessions/<session_id>', methods=['DELETE'])
@login_required
def delete_session(session_id):
    try:
        session = Session.query.filter_by(id=session_id, user_id=g.user_id).first()
        if not session:
            return jsonify({'success': False, 'error': '会话不存在'}), 404
        
        ChatHistory.query.filter_by(session_id=session_id, user_id=g.user_id).delete()
        db.session.delete(session)
        db.session.commit()
        
        print(f"已删除会话: id={session_id}, title={session.title}")
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        print(f"删除会话失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/chat', methods=['POST'])
@login_required
def chat():
    data = request.get_json()
    message = data.get('message', '')
    session_id = data.get('session_id', '')
    
    if not session_id:
        return jsonify({'success': False, 'error': 'session_id is required'}), 400
    
    context = retrieve_knowledge(g.user_id, message, top_k=3)
    if context:
        print(f"✅ 检索到 {len(context)} 个相关文本块")
        for i, chunk in enumerate(context):
            print(f"  文本块 {i+1}: {chunk[:100]}...")
    else:
        print("ℹ️ 未找到用户的知识库索引，使用默认对话模式")
    
    messages = generate_messages(message, context)
    print(f"📨 发送给大模型的 messages: {json.dumps(messages, ensure_ascii=False)}")
    
    ai_response = call_llm(messages)
    
    def generate():
        full_response = ""
        for char in ai_response:
            full_response += char
            chunk_data = json.dumps({'chunk': char})
            yield f"data: {chunk_data}\n\n"
            time.sleep(0.05)
        
        current_time = int(time.time())
        
        try:
            try:
                chat_user_id = int(g.user_id)
            except (ValueError, TypeError):
                chat_user_id = g.user_id
            
            user_message = ChatHistory(
                user_id=chat_user_id,
                session_id=session_id,
                role='user',
                content=message,
                timestamp=current_time - 1
            )
            db.session.add(user_message)
            
            assistant_message = ChatHistory(
                user_id=chat_user_id,
                session_id=session_id,
                role='assistant',
                content=ai_response,
                timestamp=current_time
            )
            db.session.add(assistant_message)
            db.session.commit()
            print(f"消息已成功保存到数据库: user_id={chat_user_id}, type={type(chat_user_id)}, session_id={session_id}")
        except Exception as e:
            db.session.rollback()
            print(f"保存消息到数据库失败: {e}")
            raise
        
        chunk_data = json.dumps({'chunk': '[END]'})
        yield f"data: {chunk_data}\n\n"
    
    return Response(stream_with_context(generate()), content_type='text/event-stream')

@app.route('/api/history', methods=['GET'])
@login_required
def get_history():
    try:
        session_id = request.args.get('session_id', '')
        
        if not session_id:
            return jsonify({'success': False, 'error': 'session_id is required'}), 400
        
        history = ChatHistory.query.filter_by(
            user_id=g.user_id,
            session_id=session_id
        ).order_by(ChatHistory.timestamp.asc()).all()
        user_history = [item.to_dict() for item in history]
        
        if not user_history:
            welcome_message = ChatHistory(
                user_id=g.user_id,
                session_id=session_id,
                role='assistant',
                content='你好！我是你的AI学习助手，很高兴为你服务！请问有什么我可以帮助你的吗？',
                timestamp=1620000000
            )
            db.session.add(welcome_message)
            db.session.commit()
            user_history = [welcome_message.to_dict()]
        
        return jsonify({
            'success': True,
            'history': user_history
        })
    except Exception as e:
        db.session.rollback()
        print(f"获取历史记录失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/history', methods=['DELETE'])
@login_required
def delete_history():
    try:
        session_id = request.args.get('session_id', '')
        
        if session_id:
            ChatHistory.query.filter_by(user_id=g.user_id, session_id=session_id).delete()
        else:
            ChatHistory.query.filter_by(user_id=g.user_id).delete()
        
        db.session.commit()
        return jsonify({'status': 'success'})
    except Exception as e:
        db.session.rollback()
        print(f"清空历史记录失败: {e}")
        return jsonify({'status': 'error', 'error': str(e)}), 500

@app.route('/api/user/info', methods=['GET'])
@login_required
def get_user_info():
    try:
        return jsonify({
            'success': True,
            'user': g.user.to_dict()
        })
    except Exception as e:
        print(f"获取用户信息失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/user/profile', methods=['GET'])
@login_required
def get_user_profile():
    try:
        user = g.user
        return jsonify({
            'success': True,
            'id': user.id,
            'username': user.username,
            'created_at': user.created_at,
            'avatar': user.avatar
        })
    except Exception as e:
        print(f"获取用户信息失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/user/profile', methods=['PUT'])
@login_required
def update_user_profile():
    try:
        data = request.get_json()
        user = g.user

        if 'username' in data:
            new_username = data['username'].strip()
            if not new_username:
                return jsonify({'success': False, 'error': '用户名不能为空'}), 400
            
            existing_user = User.query.filter_by(username=new_username).first()
            if existing_user and existing_user.id != user.id:
                return jsonify({'success': False, 'error': '该用户名已被使用'}), 400
            
            user.username = new_username

        if 'avatar' in data:
            user.avatar = data['avatar']

        db.session.commit()

        return jsonify({
            'success': True,
            'id': user.id,
            'username': user.username,
            'created_at': user.created_at,
            'avatar': user.avatar
        })
    except Exception as e:
        db.session.rollback()
        print(f"更新用户信息失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/user/change-password', methods=['POST'])
@login_required
def change_password():
    try:
        data = request.get_json()
        old_password = data.get('old_password', '')
        new_password = data.get('new_password', '')

        if not old_password or not new_password:
            return jsonify({'success': False, 'error': '原密码和新密码不能为空'}), 400

        if len(new_password) < 6:
            return jsonify({'success': False, 'error': '新密码长度至少6个字符'}), 400

        if not g.user.check_password(old_password):
            return jsonify({'success': False, 'error': '原密码输入错误'}), 400

        g.user.set_password(new_password)
        db.session.commit()

        return jsonify({'success': True, 'message': '密码修改成功'})

    except Exception as e:
        db.session.rollback()
        print(f"修改密码失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/stats', methods=['GET'])
@login_required
def get_stats():
    try:
        try:
            stats_user_id = int(g.user_id)
        except (ValueError, TypeError):
            stats_user_id = g.user_id
        
        total_chats = ChatHistory.query.filter_by(user_id=stats_user_id, role='user').count()
        
        assistant_messages = ChatHistory.query.filter_by(user_id=stats_user_id, role='assistant').all()
        ai_words = sum(len(msg.content) for msg in assistant_messages)
        
        user_messages = ChatHistory.query.filter_by(user_id=stats_user_id, role='user').all()
        
        topic_counts = {
            '编程技术': 0,
            '数理逻辑': 0,
            '语言学习': 0,
            '综合通识': 0
        }
        
        programming_keywords = ['编程', '代码', 'python', '写个']
        math_keywords = ['数学', '计算', '算术', '公式']
        language_keywords = ['英语', '单词', '翻译', '口语']
        
        for msg in user_messages:
            content = msg.content.lower()
            classified = False
            
            for kw in programming_keywords:
                if kw in content:
                    topic_counts['编程技术'] += 1
                    classified = True
                    break
            
            if not classified:
                for kw in math_keywords:
                    if kw in content:
                        topic_counts['数理逻辑'] += 1
                        classified = True
                        break
            
            if not classified:
                for kw in language_keywords:
                    if kw in content:
                        topic_counts['语言学习'] += 1
                        classified = True
                        break
            
            if not classified:
                topic_counts['综合通识'] += 1
        
        topic_stats = [
            {'name': '编程技术', 'value': topic_counts['编程技术']},
            {'name': '数理逻辑', 'value': topic_counts['数理逻辑']},
            {'name': '语言学习', 'value': topic_counts['语言学习']},
            {'name': '综合通识', 'value': topic_counts['综合通识']}
        ]
        
        return jsonify({
            'total_chats': total_chats,
            'ai_words': ai_words,
            'topic_stats': topic_stats
        })
    except Exception as e:
        print(f"获取统计数据失败: {e}")
        return jsonify({'total_chats': 0, 'ai_words': 0, 'topic_stats': []})

@app.route('/api/user/stats', methods=['GET'])
@login_required
def get_user_stats():
    try:
        user_id = g.user_id
        
        try:
            db_user_id = int(user_id)
        except (ValueError, TypeError):
            db_user_id = user_id
        
        print(f"DEBUG - user_id type: {type(user_id)}, value: {user_id}, db_user_id type: {type(db_user_id)}, value: {db_user_id}")
        
        total_messages = ChatHistory.query.filter_by(user_id=db_user_id).count()
        total_chats = total_messages // 2
        
        all_messages = ChatHistory.query.filter_by(user_id=db_user_id).all()
        learning_days = 1
        if all_messages:
            dates = set()
            for msg in all_messages:
                date_str = time.strftime('%Y-%m-%d', time.localtime(msg.timestamp))
                dates.add(date_str)
            learning_days = max(len(dates), 1)
        
        tokens_used = 0
        for msg in all_messages:
            tokens_used += len(msg.content)
        tokens_used = int(tokens_used * 1.3)
        
        weekly_activity = []
        today = datetime.date.today()
        for i in range(6, -1, -1):
            target_date = today - datetime.timedelta(days=i)
            date_str = target_date.strftime('%m-%d')
            
            target_date_str = target_date.strftime('%Y-%m-%d')
            count = ChatHistory.query.filter(
                ChatHistory.user_id == db_user_id,
                ChatHistory.role == 'user',
                db.func.date(ChatHistory.timestamp, 'unixepoch') == target_date_str
            ).count()
            
            weekly_activity.append({'date': date_str, 'count': count})
        
        print(f"DEBUG - weekly_activity for user {db_user_id}: {weekly_activity}, total_messages: {total_messages}")
        
        return jsonify({
            'total_chats': total_chats,
            'learning_days': learning_days,
            'tokens_used': tokens_used,
            'weekly_activity': weekly_activity
        })
    except Exception as e:
        print(f"获取用户学情数据失败: {e}")
        return jsonify({
            'total_chats': 0,
            'learning_days': 1,
            'tokens_used': 0,
            'weekly_activity': []
        })

@app.route('/api/user/export', methods=['GET'])
@login_required
def export_user_data():
    try:
        user_id = g.user_id
        try:
            db_user_id = int(user_id)
        except (ValueError, TypeError):
            db_user_id = user_id
        
        history = ChatHistory.query.filter_by(user_id=db_user_id).order_by(ChatHistory.timestamp.asc()).all()
        
        export_data = []
        for record in history:
            export_data.append({
                'role': record.role,
                'content': record.content,
                'timestamp': record.timestamp
            })
        
        return jsonify({
            'success': True,
            'data': export_data
        })
    except Exception as e:
        print(f"导出数据失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/user/account', methods=['DELETE'])
@login_required
def delete_user_account():
    try:
        user_id = g.user_id
        try:
            db_user_id = int(user_id)
        except (ValueError, TypeError):
            db_user_id = user_id
        
        ChatHistory.query.filter_by(user_id=db_user_id).delete()
        Session.query.filter_by(user_id=db_user_id).delete()
        User.query.filter_by(id=db_user_id).delete()
        
        db.session.commit()
        
        return jsonify({'success': True, 'message': '账号已成功注销'})
    except Exception as e:
        db.session.rollback()
        print(f"注销账号失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/knowledge/upload', methods=['POST'])
@login_required
def upload_knowledge():
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': '未上传文件'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'success': False, 'error': '请选择文件'}), 400
        
        if not file.filename.lower().endswith('.pdf'):
            return jsonify({'success': False, 'error': '仅支持 PDF 文件'}), 400
        
        print(f"开始处理 PDF 文件: {file.filename}, 用户ID: {g.user_id}")
        
        reader = PdfReader(file)
        full_text = ""
        for page in reader.pages:
            text = page.extract_text()
            if text:
                full_text += text
        
        if not full_text.strip():
            return jsonify({'success': False, 'error': '无法从 PDF 中提取文本'}), 400
        
        print(f"PDF 文本提取完成，总字符数: {len(full_text)}")
        
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=500,
            chunk_overlap=50,
            length_function=len,
        )
        chunks = text_splitter.split_text(full_text)
        
        print(f"文本分块完成，共 {len(chunks)} 块")
        
        try:
            model = get_embedding_model()
        except RuntimeError as e:
            print(f"模型加载失败: {e}")
            return jsonify({'success': False, 'error': 'AI 向量化模型下载失败，请检查网络代理或稍后重试。'}), 500
        
        embeddings = model.encode(chunks)
        
        print(f"向量化完成，向量维度: {embeddings.shape}")
        
        dimension = embeddings.shape[1]
        index = faiss.IndexFlatL2(dimension)
        index.add(np.array(embeddings))
        
        user_id_str = str(g.user_id)
        index_path = os.path.join(VECTOR_STORE_DIR, f'{user_id_str}.faiss')
        chunks_path = os.path.join(VECTOR_STORE_DIR, f'{user_id_str}_chunks.json')
        
        faiss.write_index(index, index_path)
        
        with open(chunks_path, 'w', encoding='utf-8') as f:
            json.dump(chunks, f, ensure_ascii=False)
        
        print(f"向量索引已保存: {index_path}")
        print(f"文本块已保存: {chunks_path}")
        
        return jsonify({
            'success': True,
            'message': '知识库构建成功',
            'chunks_count': len(chunks),
            'file_name': file.filename,
            'text_length': len(full_text)
        })
    
    except Exception as e:
        print(f"上传知识库失败: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        print("全新的关系型数据库结构已成功初始化！")
    app.run(debug=True, threaded=True, host='0.0.0.0', port=5000)
