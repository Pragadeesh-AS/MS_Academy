const fs = require('fs');
const file = 'src/components/AdminDashboard.jsx';

if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');

    const startStr = "{/* Premium SaaS Top Navigation Header */}";
    const endStr = "{/* Top Stat Bar - Premium SaaS Cards (Reduced Size) */}";

    const startIndex = content.indexOf(startStr);
    const endIndex = content.indexOf(endStr);

    if (startIndex !== -1 && endIndex !== -1) {
        const newHeader = `{/* Premium SaaS Top Navigation Header */}
            <div className="flex items-center justify-between bg-transparent h-[90px] px-2 mt-4 mb-2">
              
              {/* Left Section: Welcome Message */}
              <div className="flex flex-col gap-1">
                <h1 className="text-[28px] font-[700] text-[#0F172A] leading-none font-sans tracking-tight">Welcome back, Admin! 👋</h1>
                <p className="text-[14px] font-[500] text-[#64748B] tracking-tight mt-1">Here's what's happening with your tests today.</p>
              </div>

              {/* Center Section: Search Bar */}
              <div className="hidden lg:flex items-center bg-[#FFFFFF] border border-[#EEF2F7] rounded-full h-[46px] w-[400px] px-4 shadow-[0_4px_16px_rgba(15,23,42,0.04)] transition-all hover:border-blue-400 hover:shadow-[0_8px_20px_rgba(15,23,42,0.06)] group">
                <Search size={18} className="text-[#94A3B8] shrink-0" />
                <input 
                  type="text" 
                  placeholder="Search tests, students, modules..." 
                  className="w-full bg-transparent border-none outline-none text-[14px] text-[#0F172A] placeholder-[#94A3B8] font-sans px-3"
                />
                <div className="flex items-center justify-center bg-[#F1F5F9] rounded-[8px] px-2 py-1 shrink-0">
                  <span className="text-[12px] font-[500] text-[#64748B]">Ctrl+K</span>
                </div>
              </div>

              {/* Right Section: Notification & Avatar */}
              <div className="flex items-center gap-4">
                
                {/* Notification Button */}
                <button className="relative flex items-center justify-center w-[42px] h-[42px] bg-[#FFFFFF] border border-[#EEF2F7] rounded-full shadow-[0_4px_12px_rgba(15,23,42,0.04)] hover:bg-[#F8FAFF] hover:border-blue-200 transition-all group">
                  <Bell size={18} className="text-[#64748B] group-hover:text-[#2563EB] group-hover:animate-pulse" />
                  <span className="absolute -top-1 -right-1 w-[16px] h-[16px] bg-[#EF4444] rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold text-white shadow-sm">3</span>
                </button>

                {/* Profile Avatar */}
                <div className="w-[42px] h-[42px] rounded-full bg-slate-200 border-[2px] border-white shadow-[0_4px_12px_rgba(15,23,42,0.08)] overflow-hidden cursor-pointer hover:scale-105 transition-transform shrink-0">
                  <img src="https://ui-avatars.com/api/?name=Admin+User&background=2563EB&color=fff&size=100" alt="Admin Profile" className="w-full h-full object-cover" />
                </div>
              </div>

            </div>

            `;

        content = content.substring(0, startIndex) + newHeader + content.substring(endIndex);
        fs.writeFileSync(file, content, 'utf8');
        console.log("Successfully shrunk the header elements.");
    } else {
        console.error("Header boundaries not found");
    }
} else {
    console.error("File not found");
}
