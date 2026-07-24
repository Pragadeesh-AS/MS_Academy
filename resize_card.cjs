const fs = require('fs');
const file = 'src/components/AdminDashboard.jsx';

if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');

    // Regex to match the newly added Create New Test Module card
    const currentCardRegex = /\{\/\*\s*Huge Primary Action\s*\(Spans 2 cols\)\s*\*\/\}[\s\S]*?<\/div>\s*<\/div>/;

    const smallerCardBlock = `{/* Huge Primary Action (Spans 2 cols) */}
                  <div className="col-span-2 relative overflow-hidden bg-gradient-to-br from-[#2563EB] via-[#1D4ED8] to-[#1E3A8A] rounded-[24px] p-6 h-[260px] flex flex-col justify-between shadow-[0_15px_40px_rgba(37,99,235,0.2)] group cursor-pointer transition-all hover:shadow-[0_20px_50px_rgba(37,99,235,0.3)]">
                    
                    {/* Soft Ambient Glow */}
                    <div className="absolute -right-16 -top-16 w-48 h-48 bg-white/10 rounded-full blur-2xl opacity-50 group-hover:scale-110 transition-transform duration-700"></div>

                    {/* Decorative Elements - Sparkles top right */}
                    <div className="absolute right-6 top-6 flex gap-1 opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500">
                      <Sparkles size={20} color="#FACC15" className="animate-pulse" />
                      <Sparkles size={14} color="#FFFFFF" className="absolute -top-2 -right-2 animate-bounce" />
                    </div>

                    {/* Top Content (Icon + Text) */}
                    <div className="flex flex-col items-start z-10 space-y-4">
                      {/* Glassmorphism Icon */}
                      <div className="w-[48px] h-[48px] rounded-full bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-md">
                        <Plus size={24} className="text-white" />
                      </div>
                      
                      {/* Text */}
                      <div className="flex flex-col gap-1">
                        <h3 className="text-white font-[800] text-[28px] leading-[1.1] font-sans tracking-tight">Create New<br/>Test Module</h3>
                        <p className="text-white/85 text-[14px] font-[500] mt-0.5 font-sans">Use AI to generate tests instantly</p>
                      </div>
                    </div>

                    {/* CTA Button */}
                    <div className="w-full flex justify-center mt-auto z-10">
                      <button className="w-[150px] h-[40px] bg-white rounded-full flex items-center justify-between px-4 shadow-[0_6px_15px_rgba(0,0,0,0.1)] group/btn hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,0,0,0.15)] transition-all duration-300">
                        <Plus size={14} className="text-[#2563EB] font-bold" />
                        <span className="text-[#2563EB] font-[700] text-[14px]">Create Test</span>
                        <ChevronRight size={14} className="text-[#2563EB] font-bold group-hover/btn:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>`;

    if (currentCardRegex.test(content)) {
        content = content.replace(currentCardRegex, smallerCardBlock);
        fs.writeFileSync(file, content, 'utf8');
        console.log("Card successfully resized!");
    } else {
        console.error("Failed to match the Create New Test card block.");
    }
} else {
    console.error('File not found');
}
