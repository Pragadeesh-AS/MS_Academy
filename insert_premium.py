with open('src/components/AdminDashboard.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

premium_html = '''            {/* Upgrade to Premium */}
            {!isCollapsed && (
              <div className="mt-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
                <div className="absolute top-2 right-2 text-3xl opacity-20">??</div>
                <h4 className="font-bold text-[15px] mb-1">Upgrade to Premium</h4>
                <p className="text-[12px] text-indigo-100 mb-4 leading-tight">Unlock premium questions, advanced analytics & more.</p>
                <button className="w-full bg-white text-indigo-600 font-bold text-[13px] py-2.5 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-1">
                  Upgrade Now <ArrowRight size={14} />
                </button>
              </div>
            )}
'''
content = content.replace('{/* Profile Card & Logout */}', premium_html + '\\n            {/* Profile Card & Logout */}')
with open('src/components/AdminDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
