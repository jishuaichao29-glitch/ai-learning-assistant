from flask import Flask, request, jsonify
from flask_cors import CORS
import time
import json
import os

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "http://localhost:3000"}})

HISTORY_FILE = 'history.json'

def get_default_history():
    return [
        {
            'id': 1,
            'user_id': 'user1',
            'role': 'assistant',
            'content': '你好！我是你的AI学习助手，很高兴为你服务！请问有什么我可以帮助你的吗？',
            'timestamp': 1620000000
        }
    ]

def load_history():
    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return get_default_history()
    else:
        history = get_default_history()
        save_history(history)
        return history

def save_history(history):
    with open(HISTORY_FILE, 'w', encoding='utf-8') as f:
        json.dump(history, f, ensure_ascii=False, indent=2)

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

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.get_json()
    message = data.get('message', '')
    user_id = data.get('user_id', 'user1')
    
    history = load_history()
    
    new_id = max(item['id'] for item in history) + 1 if history else 1
    
    user_message = {
        'id': new_id,
        'user_id': user_id,
        'role': 'user',
        'content': message,
        'timestamp': int(time.time())
    }
    history.append(user_message)
    
    ai_response = generate_ai_response(message)
    
    assistant_message = {
        'id': new_id + 1,
        'user_id': user_id,
        'role': 'assistant',
        'content': ai_response,
        'timestamp': int(time.time())
    }
    history.append(assistant_message)
    
    save_history(history)
    
    return jsonify({
        'success': True,
        'response': ai_response
    })

@app.route('/api/history', methods=['GET'])
def get_history():
    user_id = request.args.get('user_id', 'user1')
    history = load_history()
    user_history = [item for item in history if item['user_id'] == user_id]
    return jsonify({
        'success': True,
        'history': user_history
    })

if __name__ == '__main__':
    load_history()
    app.run(debug=True, host='0.0.0.0', port=5000)
