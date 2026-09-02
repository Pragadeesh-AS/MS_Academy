import re

with open('src/components/AdminDashboard.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('bg-[#f8f9fa] flex flex-col justify-between pt-8 pb-6 px-4 overflow-y-auto border-r border-slate-200/60 shadow-[4px_0_24px_rgba(0,0,0,0.02)]', 'bg-[#111827] flex flex-col justify-between pt-8 pb-6 px-4 overflow-y-auto border-none shadow-2xl')

content = content.replace('text-[#1D4ED8] tracking-tight whitespace-nowrap mt-0.5', 'text-white tracking-tight whitespace-nowrap mt-0.5 flex items-center gap-2')
content = content.replace('MS Gate Academy</h3>', 'MS Gate Academy <ShieldCheck size={16} className=\"text-amber-400\" /></h3>')

content = content.replace('bg-[#ebeeff] text-[#5b32ea]', 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg')
content = content.replace('text-slate-500 hover:text-slate-700 hover:bg-slate-100/80', 'text-slate-400 hover:text-white hover:bg-slate-800/50')

content = content.replace('border-t border-slate-200 mt-8 space-y-3', 'mt-8 space-y-3')
content = content.replace('text-slate-800 truncate', 'text-white truncate')
content = content.replace('text-slate-500 truncate', 'text-slate-400 truncate')
content = content.replace('text-slate-600 hover:text-slate-900 hover:bg-slate-100', 'text-slate-400 hover:text-white hover:bg-slate-800/50')
content = content.replace('bg-[#e0e7ff] text-[#4f46e5]', 'bg-[#1e293b] text-white')

# Let's fix icon colors to be white when active, slate-400 when inactive
content = re.sub(r'className=\{activeTab === \'([^\']+)\' \? \'text-\[[^\]]+\]\' : \'text-\[[^\]]+\]\'\}', r'className={activeTab === \'\1\' ? \'text-white\' : \'text-slate-400\'}', content)
# other icons that don't have the ternary
content = re.sub(r'className=\"text-\[[^\]]+\]\"(.*?)>(\s*)\{(!isCollapsed)', r'className=\"text-slate-400\"\1>\2{\3', content)

with open('src/components/AdminDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
