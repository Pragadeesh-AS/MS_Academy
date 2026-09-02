import re

with open('src/components/AdminDashboard.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# For Card 1
content = content.replace(
    '<div className=\"flex items-center text-[#16A34A] gap-2 mt-auto pt-1\">\n                  <div className=\"w-[18px] h-[18px] rounded-full bg-green-50 flex items-center justify-center shrink-0\">\n                    <ArrowUpRight size={12} strokeWidth={3} />\n                  </div>\n                  <span className=\"text-[13px] font-semibold tracking-tight\">12% this month</span>\n                </div>',
    '<div className=\"flex items-end justify-between w-full mt-auto pt-1\">\n                  <div className=\"flex items-center text-[#16A34A] gap-1.5\">\n                    <ArrowUpRight size={14} strokeWidth={3} />\n                    <span className=\"text-[12px] font-semibold tracking-tight\">12% this month</span>\n                  </div>\n                  <svg className=\"w-16 h-8 text-blue-300 opacity-60\" viewBox=\"0 0 100 30\" fill=\"none\" stroke=\"currentColor\" strokeWidth=\"3\" strokeLinecap=\"round\" strokeLinejoin=\"round\"><path d=\"M0 25 Q 15 20 25 15 T 50 15 T 75 10 T 100 5\"/></svg>\n                </div>'
)

# For Card 2
content = content.replace(
    '<div className=\"flex items-center text-[#16A34A] gap-2 mt-auto pt-1\">\n                  <div className=\"w-[18px] h-[18px] rounded-full bg-green-50 flex items-center justify-center shrink-0\">\n                    <ArrowUpRight size={12} strokeWidth={3} />\n                  </div>\n                  <span className=\"text-[13px] font-semibold tracking-tight\">8% this month</span>\n                </div>',
    '<div className=\"flex items-end justify-between w-full mt-auto pt-1\">\n                  <div className=\"flex items-center text-[#16A34A] gap-1.5\">\n                    <ArrowUpRight size={14} strokeWidth={3} />\n                    <span className=\"text-[12px] font-semibold tracking-tight\">8% this month</span>\n                  </div>\n                  <svg className=\"w-16 h-8 text-purple-300 opacity-60\" viewBox=\"0 0 100 30\" fill=\"none\" stroke=\"currentColor\" strokeWidth=\"3\" strokeLinecap=\"round\" strokeLinejoin=\"round\"><path d=\"M0 20 Q 20 15 30 25 T 60 10 T 80 5 T 100 15\"/></svg>\n                </div>'
)

# For Card 3
content = content.replace(
    '<div className=\"flex items-center text-[#16A34A] gap-2 mt-auto pt-1\">\n                  <div className=\"w-[18px] h-[18px] rounded-full bg-green-50 flex items-center justify-center shrink-0\">\n                    <ArrowUpRight size={12} strokeWidth={3} />\n                  </div>\n                  <span className=\"text-[13px] font-semibold tracking-tight\">5% this month</span>\n                </div>',
    '<div className=\"flex items-end justify-between w-full mt-auto pt-1\">\n                  <div className=\"flex items-center text-[#16A34A] gap-1.5\">\n                    <ArrowUpRight size={14} strokeWidth={3} />\n                    <span className=\"text-[12px] font-semibold tracking-tight\">5% this month</span>\n                  </div>\n                  <svg className=\"w-16 h-8 text-emerald-300 opacity-60\" viewBox=\"0 0 100 30\" fill=\"none\" stroke=\"currentColor\" strokeWidth=\"3\" strokeLinecap=\"round\" strokeLinejoin=\"round\"><path d=\"M0 15 Q 15 25 35 15 T 65 10 T 85 5 T 100 10\"/></svg>\n                </div>'
)

# For Card 4
content = content.replace(
    '<div className=\"flex items-center text-[#16A34A] gap-2 mt-auto pt-1\">\n                  <div className=\"w-[18px] h-[18px] rounded-full bg-green-50 flex items-center justify-center shrink-0\">\n                    <ArrowUpRight size={12} strokeWidth={3} />\n                  </div>\n                  <span className=\"text-[13px] font-semibold tracking-tight\">7% this month</span>\n                </div>',
    '<div className=\"flex items-end justify-between w-full mt-auto pt-1\">\n                  <div className=\"flex items-center text-[#16A34A] gap-1.5\">\n                    <ArrowUpRight size={14} strokeWidth={3} />\n                    <span className=\"text-[12px] font-semibold tracking-tight\">7% this month</span>\n                  </div>\n                  <svg className=\"w-16 h-8 text-orange-300 opacity-60\" viewBox=\"0 0 100 30\" fill=\"none\" stroke=\"currentColor\" strokeWidth=\"3\" strokeLinecap=\"round\" strokeLinejoin=\"round\"><path d=\"M0 25 Q 15 10 30 15 T 50 10 T 70 20 T 100 5\"/></svg>\n                </div>'
)

with open('src/components/AdminDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
