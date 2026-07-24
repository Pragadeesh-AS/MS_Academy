const fs = require('fs');
const file = 'src/components/AdminDashboard.jsx';

if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');

    // 1. Add Bell to imports
    if (!content.includes('Bell,')) {
        content = content.replace('MoreHorizontal,', 'MoreHorizontal, Bell,');
    }

    // 2. Locate Top Stat Bar boundaries
    const topStatStartStr = "{/* Top Stat Bar - Premium SaaS Cards */}";
    const topStatEndStr = "{/* Main Grid (Tests + Bento Quick Actions) */}";

    const startIndex = content.indexOf(topStatStartStr);
    const endIndex = content.indexOf(topStatEndStr);

    if (startIndex !== -1 && endIndex !== -1) {
        // Construct the new Header and shrunk Top Stats
        const newHtml = `
            {/* Premium SaaS Top Navigation Header */}
            <div className="flex items-center justify-between bg-transparent h-[140px] px-2 rounded-[26px]">
              
              {/* Left Section: Welcome Message */}
              <div className="flex flex-col gap-[10px]">
                <h1 className="text-[38px] font-[700] text-[#0F172A] leading-none font-sans tracking-tight">Welcome back, Admin! 👋</h1>
                <p className="text-[16px] font-[500] text-[#64748B] tracking-tight">Here's what's happening with your tests today.</p>
              </div>

              {/* Center Section: Search Bar */}
              <div className="hidden lg:flex items-center bg-[#FFFFFF] border border-[#EEF2F7] rounded-full h-[56px] w-[520px] px-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)] transition-all hover:border-blue-400 hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)] group">
                <Search size={20} className="text-[#94A3B8] shrink-0" />
                <input 
                  type="text" 
                  placeholder="Search tests, students, modules..." 
                  className="w-full bg-transparent border-none outline-none text-[15px] text-[#0F172A] placeholder-[#94A3B8] font-sans px-4"
                />
                <div className="flex items-center justify-center bg-[#F1F5F9] rounded-[10px] px-2.5 py-1 shrink-0">
                  <span className="text-[13px] font-[500] text-[#64748B]">Ctrl + K</span>
                </div>
              </div>

              {/* Right Section: Notification & Avatar */}
              <div className="flex items-center gap-6">
                
                {/* Notification Button */}
                <button className="relative flex items-center justify-center w-[52px] h-[52px] bg-[#FFFFFF] border border-[#EEF2F7] rounded-full shadow-[0_8px_20px_rgba(15,23,42,0.05)] hover:bg-[#F8FAFF] hover:border-blue-200 transition-all group">
                  <Bell size={22} className="text-[#64748B] group-hover:text-[#2563EB] group-hover:animate-pulse" />
                  <span className="absolute -top-1 -right-1 w-[18px] h-[18px] bg-[#EF4444] rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-sm">3</span>
                </button>

                {/* Profile Avatar */}
                <div className="w-[52px] h-[52px] rounded-full bg-slate-200 border-[2px] border-white shadow-[0_4px_12px_rgba(15,23,42,0.08)] overflow-hidden cursor-pointer hover:scale-105 transition-transform shrink-0">
                  <img src="https://ui-avatars.com/api/?name=Admin+User&background=2563EB&color=fff&size=100" alt="Admin Profile" className="w-full h-full object-cover" />
                </div>
              </div>

            </div>

            {/* Top Stat Bar - Premium SaaS Cards (Reduced Size) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
              
              {/* Card 1: Total Tests */}
              <div className="bg-white rounded-[22px] border border-[#EEF2F7] shadow-[0_12px_35px_rgba(15,23,42,0.06)] p-5 h-[130px] flex flex-col justify-between relative group cursor-pointer transition-all duration-300 ease-out hover:-translate-y-[4px] hover:shadow-[0_16px_40px_rgba(37,99,235,0.12)] hover:border-blue-400">
                <div className="absolute top-5 right-5 text-[#94A3B8] group-hover:text-slate-600 transition-colors">
                  <MoreHorizontal size={18} strokeWidth={2.5} />
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-[50px] h-[50px] rounded-full bg-gradient-to-br from-[#EEF6FF] to-[#DCEEFF] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <FileText size={20} className="text-[#2563EB]" strokeWidth={2.5} style={{ filter: 'drop-shadow(0 0 6px rgba(37,99,235,0.3))' }} />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-[30px] font-[700] text-[#0F172A] leading-none font-sans tracking-tight">128</h3>
                    <span className="text-[14px] font-[500] text-[#64748B] mt-1 tracking-tight">Total Tests</span>
                  </div>
                </div>
                <div className="flex items-center text-[#16A34A] gap-2 mt-auto pt-1">
                  <div className="w-[18px] h-[18px] rounded-full bg-green-50 flex items-center justify-center shrink-0">
                    <ArrowUpRight size={12} strokeWidth={3} />
                  </div>
                  <span className="text-[13px] font-semibold tracking-tight">12% this month</span>
                </div>
              </div>

              {/* Card 2: Total Students */}
              <div className="bg-white rounded-[22px] border border-[#EEF2F7] shadow-[0_12px_35px_rgba(15,23,42,0.06)] p-5 h-[130px] flex flex-col justify-between relative group cursor-pointer transition-all duration-300 ease-out hover:-translate-y-[4px] hover:shadow-[0_16px_40px_rgba(37,99,235,0.12)] hover:border-blue-400">
                <div className="absolute top-5 right-5 text-[#94A3B8] group-hover:text-slate-600 transition-colors">
                  <MoreHorizontal size={18} strokeWidth={2.5} />
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-[50px] h-[50px] rounded-full bg-gradient-to-br from-[#F3E8FF] to-[#E9D5FF] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <Users size={20} className="text-[#8B5CF6]" strokeWidth={2.5} style={{ filter: 'drop-shadow(0 0 6px rgba(139,92,246,0.3))' }} />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-[30px] font-[700] text-[#0F172A] leading-none font-sans tracking-tight">521</h3>
                    <span className="text-[14px] font-[500] text-[#64748B] mt-1 tracking-tight">Total Students</span>
                  </div>
                </div>
                <div className="flex items-center text-[#16A34A] gap-2 mt-auto pt-1">
                  <div className="w-[18px] h-[18px] rounded-full bg-green-50 flex items-center justify-center shrink-0">
                    <ArrowUpRight size={12} strokeWidth={3} />
                  </div>
                  <span className="text-[13px] font-semibold tracking-tight">8% this month</span>
                </div>
              </div>

              {/* Card 3: Completion Rate */}
              <div className="bg-white rounded-[22px] border border-[#EEF2F7] shadow-[0_12px_35px_rgba(15,23,42,0.06)] p-5 h-[130px] flex flex-col justify-between relative group cursor-pointer transition-all duration-300 ease-out hover:-translate-y-[4px] hover:shadow-[0_16px_40px_rgba(37,99,235,0.12)] hover:border-blue-400">
                <div className="absolute top-5 right-5 text-[#94A3B8] group-hover:text-slate-600 transition-colors">
                  <MoreHorizontal size={18} strokeWidth={2.5} />
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-[50px] h-[50px] rounded-full bg-gradient-to-br from-[#ECFDF5] to-[#D1FAE5] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <CheckCircle2 size={20} className="text-[#10B981]" strokeWidth={2.5} style={{ filter: 'drop-shadow(0 0 6px rgba(16,185,129,0.3))' }} />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-[30px] font-[700] text-[#0F172A] leading-none font-sans tracking-tight">87%</h3>
                    <span className="text-[14px] font-[500] text-[#64748B] mt-1 tracking-tight">Completion Rate</span>
                  </div>
                </div>
                <div className="flex items-center text-[#16A34A] gap-2 mt-auto pt-1">
                  <div className="w-[18px] h-[18px] rounded-full bg-green-50 flex items-center justify-center shrink-0">
                    <ArrowUpRight size={12} strokeWidth={3} />
                  </div>
                  <span className="text-[13px] font-semibold tracking-tight">5% this month</span>
                </div>
              </div>

              {/* Card 4: Average Score */}
              <div className="bg-white rounded-[22px] border border-[#EEF2F7] shadow-[0_12px_35px_rgba(15,23,42,0.06)] p-5 h-[130px] flex flex-col justify-between relative group cursor-pointer transition-all duration-300 ease-out hover:-translate-y-[4px] hover:shadow-[0_16px_40px_rgba(37,99,235,0.12)] hover:border-blue-400">
                <div className="absolute top-5 right-5 text-[#94A3B8] group-hover:text-slate-600 transition-colors">
                  <MoreHorizontal size={18} strokeWidth={2.5} />
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-[50px] h-[50px] rounded-full bg-gradient-to-br from-[#FFF7ED] to-[#FED7AA] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <TrendingUp size={20} className="text-[#F59E0B]" strokeWidth={2.5} style={{ filter: 'drop-shadow(0 0 6px rgba(245,158,11,0.3))' }} />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-[30px] font-[700] text-[#0F172A] leading-none font-sans tracking-tight">89%</h3>
                    <span className="text-[14px] font-[500] text-[#64748B] mt-1 tracking-tight">Average Score</span>
                  </div>
                </div>
                <div className="flex items-center text-[#16A34A] gap-2 mt-auto pt-1">
                  <div className="w-[18px] h-[18px] rounded-full bg-green-50 flex items-center justify-center shrink-0">
                    <ArrowUpRight size={12} strokeWidth={3} />
                  </div>
                  <span className="text-[13px] font-semibold tracking-tight">7% this month</span>
                </div>
              </div>

            </div>

            `;

        content = content.substring(0, startIndex) + newHtml + content.substring(endIndex);
        fs.writeFileSync(file, content, 'utf8');
        console.log("Successfully added the header and shrunk the top stats!");
    } else {
        console.error("Could not find bounds to replace.");
    }
} else {
    console.error("File not found");
}
