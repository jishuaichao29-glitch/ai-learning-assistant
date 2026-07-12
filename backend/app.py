from flask import Flask, request, jsonify
from flask_cors import CORS
import json

app = Flask(__name__)
CORS(app)

users = {
    "admin": "123456"
}

chat_history = []

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    if username in users and users[username] == password:
        return jsonify({
            'success': True,
            'message': '登录成功',
            'token': f'{username}_token_123'
        })
    else:
        return jsonify({
            'success': False,
            'message': '用户名或密码错误'
        }), 401

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.get_json()
    message = data.get('message', '')
    user_id = data.get('user_id', 'user1')
    
    response = f"收到你的消息: {message}"
    
    chat_history.append({
        'user_id': user_id,
        'message': message,
        'response': response,
        'timestamp': len(chat_history)
    })
    
    return jsonify({
        'success': True,
        'response': response
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
