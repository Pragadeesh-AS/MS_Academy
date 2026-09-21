import re

file_path = 'src/components/admin/InvoiceGenerator.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# We only want to replace within the invoiceRef div to avoid breaking the rest of the UI (though replacing the rest is fine too).
# Actually, it's safer to just replace it globally in the file since the whole file is rendered using Tailwind.

color_map = {
    'text-slate-800': 'text-[#1e293b]',
    'text-slate-700': 'text-[#334155]',
    'text-slate-600': 'text-[#475569]',
    'text-slate-500': 'text-[#64748b]',
    'text-slate-400': 'text-[#94a3b8]',
    'text-slate-300': 'text-[#cbd5e1]',
    'text-slate-200': 'text-[#e2e8f0]',
    'border-slate-800': 'border-[#1e293b]',
    'border-slate-300': 'border-[#cbd5e1]',
    'border-slate-200': 'border-[#e2e8f0]',
    'border-slate-100': 'border-[#f1f5f9]',
    'bg-slate-800': 'bg-[#1e293b]',
    'bg-slate-100': 'bg-[#f1f5f9]',
    'bg-slate-50': 'bg-[#f8fafc]',
    'text-blue-800': 'text-[#1e40af]',
    'text-blue-600': 'text-[#2563eb]',
    'bg-blue-600': 'bg-[#2563eb]',
    'bg-blue-50': 'bg-[#eff6ff]',
    'border-blue-100': 'border-[#dbeafe]',
    'text-white': 'text-[#ffffff]',
    'bg-white': 'bg-[#ffffff]',
    'text-red-400': 'text-[#f87171]',
    'text-red-600': 'text-[#dc2626]',
    'bg-red-50': 'bg-[#fef2f2]',
}

for old, new in color_map.items():
    content = re.sub(r'\b' + old + r'\b', new, content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Done replacing colors!")
