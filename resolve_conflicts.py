import os
import glob
import re

courses_dir = r"e:\PROJECT\MS_Academy\src\components\courses\*.jsx"

for filepath in glob.glob(courses_dir):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Regex to find git conflicts and keep the "Updated upstream" version
    # The conflict format is:
    # <<<<<<< Updated upstream
    # (content A)
    # =======
    # (content B)
    # >>>>>>> Stashed changes
    
    pattern = re.compile(r'<<<<<<< Updated upstream\n(.*?)\n=======\n.*?\n>>>>>>> Stashed changes\n?', re.DOTALL)
    
    resolved_content = pattern.sub(r'\1\n', content)
    
    if resolved_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(resolved_content)
        print(f"Resolved conflicts in {os.path.basename(filepath)}")

print("Done resolving git conflicts.")
