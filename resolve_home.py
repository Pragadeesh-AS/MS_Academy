import re

filepath = r"e:\PROJECT\MS_Academy\src\components\Home.jsx"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

pattern = re.compile(r'<<<<<<< Updated upstream\n(.*?)\n=======\n.*?\n>>>>>>> Stashed changes\n?', re.DOTALL)
resolved_content = pattern.sub(r'\1\n', content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(resolved_content)

print("Resolved Home.jsx conflicts.")
