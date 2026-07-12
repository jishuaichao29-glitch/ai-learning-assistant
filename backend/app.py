from flask import Flask, request, jsonify
from flask_cors import CORS
import time

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "http://localhost:3000"}})

chat_history = [
    {
        'id': 1,
        'user_id': 'user1',
        'role': 'assistant',
        'content': '你好！我是你的AI学习助手，很高兴为你服务！请问有什么我可以帮助你的吗？',
        'timestamp': 1620000000
    }
]

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
    
    user_message = {
        'id': len(chat_history) + 1,
        'user_id': user_id,
        'role': 'user',
        'content': message,
        'timestamp': int(time.time())
    }
    chat_history.append(user_message)
    
    ai_response = generate_ai_response(message)
    
    assistant_message = {
        'id': len(chat_history) + 1,
        'user_id': user_id,
        'role': 'assistant',
        'content': ai_response,
        'timestamp': int(time.time())
    }
    chat_history.append(assistant_message)
    
    return jsonify({
        'success': True,
        'response': ai_response
    })

@app.route('/api/history', methods=['GET'])
def get_history():
    user_id = request.args.get('user_id', 'user1')
    history = [item for item in chat_history if item['user_id'] == user_id]
    return jsonify({
        'success': True,
        'history': history
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
