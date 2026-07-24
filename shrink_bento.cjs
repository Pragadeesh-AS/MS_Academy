const fs = require('fs');
const file = 'src/components/AdminDashboard.jsx';

if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');

    // Regex block for the 3 buttons
    const bentoRegex = /\{\/\*\s*Secondary Action 1 \(Students\)\s*\*\/\}[\s\S]*?<\/button>/g;

    // We can just replace the whole section from {/* Secondary Action 1 (Students) */} to the end of Action 3
    const fullRegex = /\{\/\*\s*Secondary Action 1 \(Students\)\s*\*\/\}[\s\S]*?\{\/\*\s*Student Activity Heatmap/g;

    const newContent = `{/* Secondary Action 1 (Students) */}
                  <button className="bg-white border border-[#EEF2F7] rounded-[22px] h-[100px] p-[20px] flex items-center justify-between shadow-[0_10px_28px_rgba(15,23,42,0.06)] hover:-translate-y-1.5 hover:shadow-[0_16px_36px_rgba(15,23,42,0.1)] hover:border-blue-500 transition-all group cursor-pointer text-left w-full">
                    <div className="flex items-center gap-3">
                      <div className="w-[48px] h-[48px] shrink-0 rounded-full bg-gradient-to-br from-[#EEF6FF] to-[#DCEEFF] flex items-center justify-center text-[#2563EB]">
                        <Users size={22} strokeWidth={2.5} />
                      </div>
                      <div className="flex flex-col">
                        <h4 className="font-bold text-[18px] text-[#0F172A] leading-tight font-sans tracking-tight">Students</h4>
                        <span className="font-medium text-[13px] text-[#64748B] font-sans mt-0.5 whitespace-nowrap">Manage students</span>
                      </div>
                    </div>
                    <div className="w-8 h-8 shrink-0 rounded-full bg-blue-50/80 text-blue-600 flex items-center justify-center group-hover:translate-x-1 transition-transform">
                      <ArrowRight size={16} strokeWidth={2.5} />
                    </div>
                  </button>

                  {/* Secondary Action 2 (Analytics) */}
                  <button className="bg-white border border-[#EEF2F7] rounded-[22px] h-[100px] p-[20px] flex items-center justify-between shadow-[0_10px_28px_rgba(15,23,42,0.06)] hover:-translate-y-1.5 hover:shadow-[0_0_24px_rgba(37,99,235,0.15)] hover:border-blue-500 transition-all group cursor-pointer text-left w-full">
                    <div className="flex items-center gap-3">
                      <div className="w-[48px] h-[48px] shrink-0 rounded-full bg-gradient-to-br from-indigo-50 to-purple-100 flex items-center justify-center text-indigo-600">
                        <BarChart2 size={22} strokeWidth={2.5} />
                      </div>
                      <div className="flex flex-col">
                        <h4 className="font-bold text-[18px] text-[#0F172A] leading-tight font-sans tracking-tight">Analytics</h4>
                        <span className="font-medium text-[13px] text-[#64748B] font-sans mt-0.5 whitespace-nowrap">View reports & insights</span>
                      </div>
                    </div>
                    <div className="w-8 h-8 shrink-0 rounded-full bg-indigo-50/80 text-indigo-600 flex items-center justify-center group-hover:translate-x-1 transition-transform">
                      <ArrowRight size={16} strokeWidth={2.5} />
                    </div>
                  </button>
                  
                  {/* Secondary Action 3 (Manage Faculty, Spans 2 cols) */}
                  <button className="col-span-2 bg-white border border-[#EEF2F7] rounded-[20px] h-[70px] px-6 py-0 flex items-center justify-between shadow-[0_10px_28px_rgba(15,23,42,0.06)] hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(15,23,42,0.08)] hover:border-blue-400 transition-all group text-left w-full">
                    <h4 className="font-bold text-[18px] text-[#0F172A] leading-tight font-sans tracking-tight">Manage Faculty</h4>
                    
                    <div className="w-8 h-8 shrink-0 rounded-full bg-slate-50 text-slate-600 border border-slate-100 flex items-center justify-center group-hover:translate-x-1 transition-transform group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-100">
                      <ArrowRight size={16} strokeWidth={2.5} />
                    </div>
                  </button>
                </div>

                {/* Student Activity Heatmap`;

    if (fullRegex.test(content)) {
        content = content.replace(fullRegex, newContent);
        fs.writeFileSync(file, content, 'utf8');
        console.log("Successfully shrunk texts and simplified Manage Faculty.");
    } else {
        console.error("Could not find Bento target block.");
    }
} else {
    console.error('File not found');
}
