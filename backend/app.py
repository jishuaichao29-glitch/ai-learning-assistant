from flask import Flask, request, jsonify, Response, stream_with_context, g
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
import time
import json
import os
import uuid
import base64
import hashlib
import hmac

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True, methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])

basedir = os.path.abspath(os.path.dirname(__file__))
DATABASE_PATH = os.path.join(basedir, 'database.db')
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{DATABASE_PATH}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'your-secret-key-change-in-production-2024'

print(f"数据库连接路径: {DATABASE_PATH}")

db = SQLAlchemy(app)

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

def generate_ai_response(message):
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
        if keyword in message:
            return response
    
    return f'这是一个很好的问题！关于「{message}」，我可以为你提供一些学习建议。首先，你可以通过查阅相关资料来了解基础知识，然后通过实践来加深理解。如果有具体的问题，随时可以问我！'

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
    
    ai_response = generate_ai_response(message)
    
    def generate():
        full_response = ""
        for char in ai_response:
            full_response += char
            chunk_data = json.dumps({'chunk': char})
            yield f"data: {chunk_data}\n\n"
            time.sleep(0.05)
        
        current_time = int(time.time())
        
        try:
            user_message = ChatHistory(
                user_id=g.user_id,
                session_id=session_id,
                role='user',
                content=message,
                timestamp=current_time - 1
            )
            db.session.add(user_message)
            
            assistant_message = ChatHistory(
                user_id=g.user_id,
                session_id=session_id,
                role='assistant',
                content=ai_response,
                timestamp=current_time
            )
            db.session.add(assistant_message)
            db.session.commit()
            print(f"消息已成功保存到数据库: user_id={g.user_id}, session_id={session_id}")
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
            return jsonify({'success': False, 'error': '原密码输入错误'}), 401

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
        total_chats = ChatHistory.query.filter_by(user_id=g.user_id, role='user').count()
        
        assistant_messages = ChatHistory.query.filter_by(user_id=g.user_id, role='assistant').all()
        ai_words = sum(len(msg.content) for msg in assistant_messages)
        
        user_messages = ChatHistory.query.filter_by(user_id=g.user_id, role='user').all()
        
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

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        print("全新的关系型数据库结构已成功初始化！")
    app.run(debug=True, threaded=True, host='0.0.0.0', port=5000)
