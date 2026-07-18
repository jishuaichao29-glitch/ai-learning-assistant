import requests

token = 'eyJhbGciOiAiSFMyNTYiLCAidHlwIjogIkpXVCJ9.eyJ1c2VyX2lkIjogMiwgImV4cCI6IDE3ODQ0NzUwNTUuOTgxNTI5fQ.bHOh7GZzbBRUawTrHMuWW-n-kY051RSakwdN2YDxnMU'
headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}

print("=== 测试点赞 ===")
r = requests.post('http://127.0.0.1:5000/api/messages/11/feedback', headers=headers, json={'type': 'like'})
print('Like response:', r.json())

print("\n=== 获取历史记录 ===")
r = requests.get('http://127.0.0.1:5000/api/history?session_id=a51704ee-4086-42f9-bea9-89c3a1ca0070', headers=headers)
data = r.json()
if 'history' in data:
    for msg in data['history']:
        if msg['role'] == 'assistant':
            print(f"  id={msg.get('id')}, is_liked={msg.get('is_liked')}, is_disliked={msg.get('is_disliked')}")
