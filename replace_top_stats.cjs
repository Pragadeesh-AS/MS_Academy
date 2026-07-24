const fs = require('fs');
const file = 'src/components/AdminDashboard.jsx';

if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');

    // Add imports if missing
    if (!content.includes('MoreHorizontal')) {
        content = content.replace('ArrowRight', 'ArrowRight, MoreHorizontal, ArrowUpRight');
    }

    // Replace Top Stat Bar
    const startStr = "{/* Top Stat Bar - Premium SaaS Cards */}";
    const endStr = "{/* Main Grid (Tests + Bento Quick Actions) */}";

    const startIndex = content.indexOf(startStr);
    const endIndex = content.indexOf(endStr);

    if (startIndex !== -1 && endIndex !== -1) {
        const newStatsHTML = `{/* Top Stat Bar - Premium SaaS Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
              
              {/* Card 1: Total Tests */}
              <div className="bg-white rounded-[22px] border border-[#EEF2F7] shadow-[0_12px_35px_rgba(15,23,42,0.06)] p-6 h-[150px] flex flex-col justify-between relative group cursor-pointer transition-all duration-300 ease-out hover:-translate-y-[6px] hover:shadow-[0_20px_45px_rgba(37,99,235,0.12)] hover:border-blue-400">
                <div className="absolute top-6 right-6 text-[#94A3B8] group-hover:text-slate-600 transition-colors">
                  <MoreHorizontal size={20} strokeWidth={2.5} />
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-[60px] h-[60px] rounded-full bg-gradient-to-br from-[#EEF6FF] to-[#DCEEFF] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <FileText size={24} className="text-[#2563EB]" strokeWidth={2} style={{ filter: 'drop-shadow(0 0 6px rgba(37,99,235,0.3))' }} />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-[36px] font-[700] text-[#0F172A] leading-none font-sans tracking-tight">128</h3>
                    <span className="text-[15px] font-[500] text-[#64748B] mt-1 tracking-tight">Total Tests</span>
                  </div>
                </div>
                <div className="flex items-center text-[#16A34A] gap-2 mt-auto pt-2">
                  <div className="w-5 h-5 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                    <ArrowUpRight size={14} strokeWidth={3} />
                  </div>
                  <span className="text-[14px] font-semibold tracking-tight">12% this month</span>
                </div>
              </div>

              {/* Card 2: Total Students */}
              <div className="bg-white rounded-[22px] border border-[#EEF2F7] shadow-[0_12px_35px_rgba(15,23,42,0.06)] p-6 h-[150px] flex flex-col justify-between relative group cursor-pointer transition-all duration-300 ease-out hover:-translate-y-[6px] hover:shadow-[0_20px_45px_rgba(37,99,235,0.12)] hover:border-blue-400">
                <div className="absolute top-6 right-6 text-[#94A3B8] group-hover:text-slate-600 transition-colors">
                  <MoreHorizontal size={20} strokeWidth={2.5} />
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-[60px] h-[60px] rounded-full bg-gradient-to-br from-[#F3E8FF] to-[#E9D5FF] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Users size={24} className="text-[#8B5CF6]" strokeWidth={2} style={{ filter: 'drop-shadow(0 0 6px rgba(139,92,246,0.3))' }} />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-[36px] font-[700] text-[#0F172A] leading-none font-sans tracking-tight">521</h3>
                    <span className="text-[15px] font-[500] text-[#64748B] mt-1 tracking-tight">Total Students</span>
                  </div>
                </div>
                <div className="flex items-center text-[#16A34A] gap-2 mt-auto pt-2">
                  <div className="w-5 h-5 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                    <ArrowUpRight size={14} strokeWidth={3} />
                  </div>
                  <span className="text-[14px] font-semibold tracking-tight">8% this month</span>
                </div>
              </div>

              {/* Card 3: Completion Rate */}
              <div className="bg-white rounded-[22px] border border-[#EEF2F7] shadow-[0_12px_35px_rgba(15,23,42,0.06)] p-6 h-[150px] flex flex-col justify-between relative group cursor-pointer transition-all duration-300 ease-out hover:-translate-y-[6px] hover:shadow-[0_20px_45px_rgba(37,99,235,0.12)] hover:border-blue-400">
                <div className="absolute top-6 right-6 text-[#94A3B8] group-hover:text-slate-600 transition-colors">
                  <MoreHorizontal size={20} strokeWidth={2.5} />
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-[60px] h-[60px] rounded-full bg-gradient-to-br from-[#ECFDF5] to-[#D1FAE5] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <CheckCircle2 size={24} className="text-[#10B981]" strokeWidth={2} style={{ filter: 'drop-shadow(0 0 6px rgba(16,185,129,0.3))' }} />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-[36px] font-[700] text-[#0F172A] leading-none font-sans tracking-tight">87%</h3>
                    <span className="text-[15px] font-[500] text-[#64748B] mt-1 tracking-tight">Completion Rate</span>
                  </div>
                </div>
                <div className="flex items-center text-[#16A34A] gap-2 mt-auto pt-2">
                  <div className="w-5 h-5 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                    <ArrowUpRight size={14} strokeWidth={3} />
                  </div>
                  <span className="text-[14px] font-semibold tracking-tight">5% this month</span>
                </div>
              </div>

              {/* Card 4: Average Score */}
              <div className="bg-white rounded-[22px] border border-[#EEF2F7] shadow-[0_12px_35px_rgba(15,23,42,0.06)] p-6 h-[150px] flex flex-col justify-between relative group cursor-pointer transition-all duration-300 ease-out hover:-translate-y-[6px] hover:shadow-[0_20px_45px_rgba(37,99,235,0.12)] hover:border-blue-400">
                <div className="absolute top-6 right-6 text-[#94A3B8] group-hover:text-slate-600 transition-colors">
                  <MoreHorizontal size={20} strokeWidth={2.5} />
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-[60px] h-[60px] rounded-full bg-gradient-to-br from-[#FFF7ED] to-[#FED7AA] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <TrendingUp size={24} className="text-[#F59E0B]" strokeWidth={2} style={{ filter: 'drop-shadow(0 0 6px rgba(245,158,11,0.3))' }} />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-[36px] font-[700] text-[#0F172A] leading-none font-sans tracking-tight">89%</h3>
                    <span className="text-[15px] font-[500] text-[#64748B] mt-1 tracking-tight">Average Score</span>
                  </div>
                </div>
                <div className="flex items-center text-[#16A34A] gap-2 mt-auto pt-2">
                  <div className="w-5 h-5 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                    <ArrowUpRight size={14} strokeWidth={3} />
                  </div>
                  <span className="text-[14px] font-semibold tracking-tight">7% this month</span>
                </div>
              </div>

            </div>

            `;

        const finalContent = content.substring(0, startIndex) + newStatsHTML + content.substring(endIndex);
        fs.writeFileSync(file, finalContent, 'utf8');
        console.log("Successfully completely redesigned the Top Stats section!");
    } else {
        console.error("Could not find Top Stats boundaries.");
    }

} else {
    console.error('File not found');
}
