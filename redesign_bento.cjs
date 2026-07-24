const fs = require('fs');
const file = 'src/components/AdminDashboard.jsx';

if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');

    // Add ArrowRight to imports if not there
    if (!content.includes('ArrowRight')) {
        content = content.replace('Calendar, Edit2', 'Calendar, Edit2, ArrowRight');
    }

    // Replace the secondary buttons block
    const bentoRegex = /\{\/\*\s*Secondary Action 1\s*\*\/\}[\s\S]*?<\/button>\s*<\/div>\s*\{\/\*\s*Student Activity Heatmap\s*\*\/\}/;

    const newBento = `{/* Secondary Action 1 (Students) */}
                  <button className="bg-white border border-[#EEF2F7] rounded-[22px] h-[120px] p-[24px] flex items-center justify-between shadow-[0_10px_28px_rgba(15,23,42,0.06)] hover:-translate-y-1.5 hover:shadow-[0_16px_36px_rgba(15,23,42,0.1)] hover:border-blue-500 transition-all group cursor-pointer text-left w-full">
                    <div className="flex items-center gap-4">
                      <div className="w-[60px] h-[60px] shrink-0 rounded-full bg-gradient-to-br from-[#EEF6FF] to-[#DCEEFF] flex items-center justify-center text-[#2563EB]">
                        <Users size={26} strokeWidth={2.5} />
                      </div>
                      <div className="flex flex-col">
                        <h4 className="font-bold text-[24px] text-[#0F172A] leading-tight font-sans tracking-tight">Students</h4>
                        <span className="font-medium text-[15px] text-[#64748B] font-sans mt-1">Manage students</span>
                      </div>
                    </div>
                    <div className="w-9 h-9 shrink-0 rounded-full bg-blue-50/80 text-blue-600 flex items-center justify-center group-hover:translate-x-1.5 transition-transform">
                      <ArrowRight size={18} strokeWidth={2.5} />
                    </div>
                  </button>

                  {/* Secondary Action 2 (Analytics) */}
                  <button className="bg-white border border-[#EEF2F7] rounded-[22px] h-[120px] p-[24px] flex items-center justify-between shadow-[0_10px_28px_rgba(15,23,42,0.06)] hover:-translate-y-1.5 hover:shadow-[0_0_24px_rgba(37,99,235,0.15)] hover:border-blue-500 transition-all group cursor-pointer text-left w-full">
                    <div className="flex items-center gap-4">
                      <div className="w-[60px] h-[60px] shrink-0 rounded-full bg-gradient-to-br from-indigo-50 to-purple-100 flex items-center justify-center text-indigo-600">
                        <BarChart2 size={26} strokeWidth={2.5} />
                      </div>
                      <div className="flex flex-col">
                        <h4 className="font-bold text-[24px] text-[#0F172A] leading-tight font-sans tracking-tight">Analytics</h4>
                        <span className="font-medium text-[15px] text-[#64748B] font-sans mt-1">View reports & insights</span>
                      </div>
                    </div>
                    <div className="w-9 h-9 shrink-0 rounded-full bg-indigo-50/80 text-indigo-600 flex items-center justify-center group-hover:translate-x-1.5 transition-transform">
                      <ArrowRight size={18} strokeWidth={2.5} />
                    </div>
                  </button>
                  
                  {/* Secondary Action 3 (Manage Faculty, Spans 2 cols) */}
                  <button className="col-span-2 bg-white border border-[#EEF2F7] rounded-[22px] h-[110px] px-7 py-0 flex items-center justify-between shadow-[0_10px_28px_rgba(15,23,42,0.06)] hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(15,23,42,0.08)] hover:border-blue-400 transition-all group text-left">
                    <div className="flex items-center gap-5">
                      <div className="w-[60px] h-[60px] shrink-0 rounded-full bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center text-teal-600">
                        <UserCheck size={26} strokeWidth={2.5} />
                      </div>
                      <div className="flex flex-col">
                        <h4 className="font-bold text-[22px] text-[#0F172A] leading-tight font-sans tracking-tight">Manage Faculty</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-medium text-[14px] text-[#64748B] font-sans">18 Active Members</span>
                          <span className="text-slate-300">&bull;</span>
                          <span className="font-medium text-[14px] text-[#64748B] font-sans">3 Pending Requests</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      {/* Avatar Stack */}
                      <div className="flex -space-x-3">
                        <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center"><Users size={16} className="text-slate-500" /></div>
                        <div className="w-10 h-10 rounded-full bg-slate-300 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center"><Users size={16} className="text-slate-500" /></div>
                        <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center"><Users size={16} className="text-slate-500" /></div>
                        <div className="w-10 h-10 rounded-full bg-slate-300 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center"><Users size={16} className="text-slate-500" /></div>
                        <div className="w-10 h-10 rounded-full bg-[#F8FAFC] border-2 border-white shadow-sm flex items-center justify-center text-[12px] font-bold text-slate-600">+12</div>
                      </div>
                      
                      <div className="w-10 h-10 shrink-0 rounded-full bg-slate-50 text-slate-600 border border-slate-100 flex items-center justify-center group-hover:translate-x-1 transition-transform group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-100">
                        <ArrowRight size={18} strokeWidth={2.5} />
                      </div>
                    </div>
                  </button>
                </div>

                {/* Student Activity Heatmap */}`;

        if (bentoRegex.test(content)) {
            content = content.replace(bentoRegex, newBento);
            fs.writeFileSync(file, content, 'utf8');
            console.log("Bento grid successfully replaced!");
        } else {
            console.error("Failed to match the Bento grid block for replacement.");
        }
    }
} else {
    console.error('File not found');
}
