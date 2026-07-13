from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import time
import json
import os
import uuid

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "http://localhost:3000"}})

basedir = os.path.abspath(os.path.dirname(__file__))
DATABASE_PATH = os.path.join(basedir, 'database.db')
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{DATABASE_PATH}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

print(f"数据库连接路径: {DATABASE_PATH}")

db = SQLAlchemy(app)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(50), nullable=False, unique=True)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username
        }

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

DEFAULT_USERNAME = 'default_user'

def get_default_user():
    user = User.query.filter_by(username=DEFAULT_USERNAME).first()
    if not user:
        user = User(username=DEFAULT_USERNAME)
        db.session.add(user)
        db.session.commit()
    return user

def migrate_from_json():
    HISTORY_FILE = 'history.json'
    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
                history_data = json.load(f)
            
            default_user = get_default_user()
            
            for item in history_data:
                existing = ChatHistory.query.filter_by(
                    user_id=default_user.id,
                    role=item['role'],
                    content=item['content'],
                    timestamp=item['timestamp']
                ).first()
                if not existing:
                    chat = ChatHistory(
                        user_id=default_user.id,
                        role=item['role'],
                        content=item['content'],
                        timestamp=item['timestamp']
                    )
                    db.session.add(chat)
            
            db.session.commit()
            os.remove(HISTORY_FILE)
            print("数据迁移完成，已删除旧的 history.json 文件")
        except Exception as e:
            print(f"数据迁移失败: {e}")

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
def get_sessions():
    try:
        default_user = User.query.filter_by(username=DEFAULT_USERNAME).first()
        if not default_user:
            default_user = User(username=DEFAULT_USERNAME)
            db.session.add(default_user)
            db.session.commit()
        
        sessions = Session.query.filter_by(user_id=default_user.id).order_by(Session.created_at.desc()).all()
        return jsonify({
            'success': True,
            'sessions': [session.to_dict() for session in sessions]
        })
    except Exception as e:
        print(f"获取会话列表失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/sessions', methods=['POST'])
def create_session():
    try:
        default_user = User.query.filter_by(username=DEFAULT_USERNAME).first()
        if not default_user:
            default_user = User(username=DEFAULT_USERNAME)
            db.session.add(default_user)
            db.session.commit()
        
        session_id = str(uuid.uuid4())
        new_session = Session(
            id=session_id,
            title='新对话',
            created_at=int(time.time()),
            user_id=default_user.id
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
def delete_session(session_id):
    try:
        default_user = User.query.filter_by(username=DEFAULT_USERNAME).first()
        if not default_user:
            return jsonify({'success': False, 'error': '用户不存在'}), 404
        
        session = Session.query.filter_by(id=session_id, user_id=default_user.id).first()
        if not session:
            return jsonify({'success': False, 'error': '会话不存在'}), 404
        
        ChatHistory.query.filter_by(session_id=session_id).delete()
        db.session.delete(session)
        db.session.commit()
        
        print(f"已删除会话: id={session_id}, title={session.title}")
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        print(f"删除会话失败: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.get_json()
    message = data.get('message', '')
    session_id = data.get('session_id', '')
    
    if not session_id:
        return jsonify({'success': False, 'error': 'session_id is required'}), 400
    
    default_user = User.query.filter_by(username=DEFAULT_USERNAME).first()
    if not default_user:
        default_user = User(username=DEFAULT_USERNAME)
        db.session.add(default_user)
        db.session.commit()
        print(f"已创建默认用户: id={default_user.id}, username={default_user.username}")
    
    print(f"使用默认用户: id={default_user.id}, username={default_user.username}, session_id={session_id}")
    
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
                user_id=default_user.id,
                session_id=session_id,
                role='user',
                content=message,
                timestamp=current_time - 1
            )
            db.session.add(user_message)
            
            assistant_message = ChatHistory(
                user_id=default_user.id,
                session_id=session_id,
                role='assistant',
                content=ai_response,
                timestamp=current_time
            )
            db.session.add(assistant_message)
            db.session.commit()
            print(f"消息已成功保存到数据库: user_id={default_user.id}, session_id={session_id}")
        except Exception as e:
            db.session.rollback()
            print(f"保存消息到数据库失败: {e}")
            raise
        
        chunk_data = json.dumps({'chunk': '[END]'})
        yield f"data: {chunk_data}\n\n"
    
    return Response(stream_with_context(generate()), content_type='text/event-stream')

@app.route('/api/history', methods=['GET'])
def get_history():
    try:
        session_id = request.args.get('session_id', '')
        
        if not session_id:
            return jsonify({'success': False, 'error': 'session_id is required'}), 400
        
        default_user = User.query.filter_by(username=DEFAULT_USERNAME).first()
        if not default_user:
            default_user = User(username=DEFAULT_USERNAME)
            db.session.add(default_user)
            db.session.commit()
        
        history = ChatHistory.query.filter_by(
            user_id=default_user.id,
            session_id=session_id
        ).order_by(ChatHistory.timestamp.asc()).all()
        user_history = [item.to_dict() for item in history]
        
        if not user_history:
            welcome_message = ChatHistory(
                user_id=default_user.id,
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
def delete_history():
    try:
        session_id = request.args.get('session_id', '')
        
        default_user = User.query.filter_by(username=DEFAULT_USERNAME).first()
        if not default_user:
            default_user = User(username=DEFAULT_USERNAME)
            db.session.add(default_user)
            db.session.commit()
        
        if session_id:
            ChatHistory.query.filter_by(user_id=default_user.id, session_id=session_id).delete()
        else:
            ChatHistory.query.filter_by(user_id=default_user.id).delete()
        
        db.session.commit()
        return jsonify({'status': 'success'})
    except Exception as e:
        db.session.rollback()
        print(f"清空历史记录失败: {e}")
        return jsonify({'status': 'error', 'error': str(e)}), 500

@app.route('/api/stats', methods=['GET'])
def get_stats():
    try:
        default_user = User.query.filter_by(username=DEFAULT_USERNAME).first()
        if not default_user:
            default_user = User(username=DEFAULT_USERNAME)
            db.session.add(default_user)
            db.session.commit()
        
        total_chats = ChatHistory.query.filter_by(user_id=default_user.id, role='user').count()
        
        assistant_messages = ChatHistory.query.filter_by(user_id=default_user.id, role='assistant').all()
        ai_words = sum(len(msg.content) for msg in assistant_messages)
        
        user_messages = ChatHistory.query.filter_by(user_id=default_user.id, role='user').all()
        
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

def migrate_old_data():
    default_user = get_default_user()
    
    existing_session = Session.query.filter_by(user_id=default_user.id).first()
    if not existing_session:
        default_session_id = str(uuid.uuid4())
        default_session = Session(
            id=default_session_id,
            title='默认对话',
            created_at=int(time.time()),
            user_id=default_user.id
        )
        db.session.add(default_session)
        db.session.commit()
        print(f"已创建默认会话: id={default_session_id}")
        
        old_records = ChatHistory.query.filter_by(user_id=default_user.id).all()
        for record in old_records:
            record.session_id = default_session_id
        db.session.commit()
        print(f"已迁移 {len(old_records)} 条历史记录到默认会话")

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        get_default_user()
        migrate_old_data()
        migrate_from_json()
    app.run(debug=True, threaded=True, host='0.0.0.0', port=5000)
