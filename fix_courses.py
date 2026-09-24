import os
import glob

courses_dir = r"e:\PROJECT\MS_Academy\src\components\courses\*.jsx"

for filepath in glob.glob(courses_dir):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # fix button flex
    content = content.replace('className="flex gap-4"', 'className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto px-4 sm:px-0"')
    
    # fix h1 text size
    content = content.replace('className="text-[46px] md:text-[64px]', 'className="text-4xl md:text-[64px]')
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print("Done fixing course files.")
