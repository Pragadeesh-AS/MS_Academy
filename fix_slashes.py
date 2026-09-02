with open('src/components/AdminDashboard.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('\\\'', \"'\")
content = content.replace('\\"', '\"')

with open('src/components/AdminDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
