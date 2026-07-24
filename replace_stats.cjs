const fs = require('fs');
const file = 'src/components/AdminDashboard.jsx';

if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');

    // Regex to match the entire Top Stat Bar block
    const oldStatsBlockRegex = /\{\/\*\s*Top Stat Bar - Unified Glass Pill\s*\*\/\}[\s\S]*?\{\/\*\s*Main Grid\s*\(Tests \+ Bento Quick Actions\)\s*\*\/\}/;

    const newStatsBlock = `{/* Top Stat Bar - Premium SaaS Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
              {/* Stat 1 */}
              <div className="bg-white rounded-[22px] border border-[#EEF2F7] shadow-[0_12px_35px_rgba(15,23,42,0.08)] p-6 h-[150px] flex flex-col justify-between relative overflow-hidden group cursor-pointer transition-all duration-300 ease-out hover:-translate-y-[10px] hover:scale-[1.03] hover:shadow-[0_22px_45px_rgba(37,99,235,0.18)]">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <h3 className="text-[34px] font-[700] text-[#0F172A] leading-none font-sans">20</h3>
                    <span className="text-[14px] font-[500] text-[#64748B] mt-1">Total Tests</span>
                  </div>
                  <div className="w-[54px] h-[54px] rounded-full bg-[#3B82F6]/10 flex items-center justify-center">
                    <FileText size={24} className="text-[#3B82F6]" />
                  </div>
                </div>
                {/* Optional Arrows (Curved upwards) */}
                <div className="flex items-center text-[#10B981] opacity-0 group-hover:opacity-100 transition-opacity duration-300 gap-1 mt-2">
                  <TrendingUp size={14} />
                  <span className="text-[12px] font-bold">+12% this week</span>
                </div>
                <span className="absolute bottom-4 left-6 w-[70px] h-1 bg-[#3B82F6] rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300"></span>
              </div>
              
              {/* Stat 2 */}
              <div className="bg-white rounded-[22px] border border-[#EEF2F7] shadow-[0_12px_35px_rgba(15,23,42,0.08)] p-6 h-[150px] flex flex-col justify-between relative overflow-hidden group cursor-pointer transition-all duration-300 ease-out hover:-translate-y-[10px] hover:scale-[1.03] hover:shadow-[0_22px_45px_rgba(37,99,235,0.18)]">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <h3 className="text-[34px] font-[700] text-[#0F172A] leading-none font-sans">10</h3>
                    <span className="text-[14px] font-[500] text-[#64748B] mt-1">Active Students</span>
                  </div>
                  <div className="w-[54px] h-[54px] rounded-full bg-[#8B5CF6]/10 flex items-center justify-center">
                    <Users size={24} className="text-[#8B5CF6]" />
                  </div>
                </div>
                <div className="flex items-center text-[#10B981] opacity-0 group-hover:opacity-100 transition-opacity duration-300 gap-1 mt-2">
                  <TrendingUp size={14} />
                  <span className="text-[12px] font-bold">+4% this week</span>
                </div>
                <span className="absolute bottom-4 left-6 w-[70px] h-1 bg-[#3B82F6] rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300"></span>
              </div>

              {/* Stat 3 */}
              <div className="bg-white rounded-[22px] border border-[#EEF2F7] shadow-[0_12px_35px_rgba(15,23,42,0.08)] p-6 h-[150px] flex flex-col justify-between relative overflow-hidden group cursor-pointer transition-all duration-300 ease-out hover:-translate-y-[10px] hover:scale-[1.03] hover:shadow-[0_22px_45px_rgba(37,99,235,0.18)]">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <h3 className="text-[34px] font-[700] text-[#0F172A] leading-none font-sans">71%</h3>
                    <span className="text-[14px] font-[500] text-[#64748B] mt-1">Completion Rate</span>
                  </div>
                  <div className="w-[54px] h-[54px] rounded-full bg-[#10B981]/10 flex items-center justify-center">
                    <CheckCircle2 size={24} className="text-[#10B981]" />
                  </div>
                </div>
                <div className="flex items-center text-[#10B981] opacity-0 group-hover:opacity-100 transition-opacity duration-300 gap-1 mt-2">
                  <TrendingUp size={14} />
                  <span className="text-[12px] font-bold">+2.5% this week</span>
                </div>
                <span className="absolute bottom-4 left-6 w-[70px] h-1 bg-[#3B82F6] rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300"></span>
              </div>

              {/* Stat 4 */}
              <div className="bg-white rounded-[22px] border border-[#EEF2F7] shadow-[0_12px_35px_rgba(15,23,42,0.08)] p-6 h-[150px] flex flex-col justify-between relative overflow-hidden group cursor-pointer transition-all duration-300 ease-out hover:-translate-y-[10px] hover:scale-[1.03] hover:shadow-[0_22px_45px_rgba(37,99,235,0.18)]">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <h3 className="text-[34px] font-[700] text-[#0F172A] leading-none font-sans">49%</h3>
                    <span className="text-[14px] font-[500] text-[#64748B] mt-1">Avg. Score</span>
                  </div>
                  <div className="w-[54px] h-[54px] rounded-full bg-[#F59E0B]/10 flex items-center justify-center">
                    <TrendingUp size={24} className="text-[#F59E0B]" />
                  </div>
                </div>
                <div className="flex items-center text-[#F59E0B] opacity-0 group-hover:opacity-100 transition-opacity duration-300 gap-1 mt-2">
                  <TrendingUp size={14} className="rotate-90" />
                  <span className="text-[12px] font-bold">-1.2% this week</span>
                </div>
                <span className="absolute bottom-4 left-6 w-[70px] h-1 bg-[#3B82F6] rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300"></span>
              </div>
            </div>

            {/* Main Grid (Tests + Bento Quick Actions) */}`;

    if (oldStatsBlockRegex.test(content)) {
        content = content.replace(oldStatsBlockRegex, newStatsBlock);
        fs.writeFileSync(file, content, 'utf8');
        console.log("Top Stats successfully replaced!");
    } else {
        console.error("Failed to match the Top Stats block.");
    }
} else {
    console.error('File not found');
}
