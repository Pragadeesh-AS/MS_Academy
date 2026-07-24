const fs = require('fs');
const file = 'src/components/AdminDashboard.jsx';

if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');

    // Regex to match the old Create New Test Module button
    const oldCardRegex = /\{\/\*\s*Huge Primary Action\s*\(Spans 2 cols\)\s*\*\/\}[\s\S]*?<\/button>/;

    const newCardBlock = `{/* Huge Primary Action (Spans 2 cols) */}
                  <div className="col-span-2 relative overflow-hidden bg-gradient-to-br from-[#2563EB] via-[#1D4ED8] to-[#1E3A8A] rounded-[28px] p-[32px] h-[340px] flex flex-col justify-between shadow-[0_20px_50px_rgba(37,99,235,0.25)] group cursor-pointer transition-all hover:shadow-[0_25px_60px_rgba(37,99,235,0.35)]">
                    
                    {/* Soft Ambient Glow (Optional background elements) */}
                    <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/10 rounded-full blur-3xl opacity-50 group-hover:scale-110 transition-transform duration-700"></div>

                    {/* Decorative Elements - Sparkles top right */}
                    <div className="absolute right-8 top-8 flex gap-1 opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500">
                      <Sparkles size={24} color="#FACC15" className="animate-pulse" />
                      <Sparkles size={16} color="#FFFFFF" className="absolute -top-3 -right-2 animate-bounce" />
                    </div>

                    {/* Top Content (Icon + Text) */}
                    <div className="flex flex-col items-start z-10 space-y-6">
                      {/* Glassmorphism Icon */}
                      <div className="w-[68px] h-[68px] rounded-full bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg">
                        <Plus size={32} className="text-white" />
                      </div>
                      
                      {/* Text */}
                      <div className="flex flex-col gap-1">
                        <h3 className="text-white font-[700] text-[42px] leading-[1.1] font-sans tracking-tight">Create New<br/>Test Module</h3>
                        <p className="text-white/85 text-[17px] font-[500] mt-1 font-sans">Use AI to generate tests instantly</p>
                      </div>
                    </div>

                    {/* CTA Button */}
                    <div className="w-full flex justify-center mt-auto z-10">
                      <button className="w-[170px] h-[46px] bg-white rounded-full flex items-center justify-between px-5 shadow-[0_8px_20px_rgba(0,0,0,0.12)] group/btn hover:-translate-y-1 hover:shadow-[0_12px_25px_rgba(0,0,0,0.18)] transition-all duration-300">
                        <Plus size={16} className="text-[#2563EB] font-bold" />
                        <span className="text-[#2563EB] font-[600] text-[16px]">Create Test</span>
                        <ChevronRight size={16} className="text-[#2563EB] font-bold group-hover/btn:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>`;

    if (oldCardRegex.test(content)) {
        content = content.replace(oldCardRegex, newCardBlock);
        fs.writeFileSync(file, content, 'utf8');
        console.log("Card successfully replaced!");
    } else {
        console.error("Failed to match the Create New Test card block.");
    }
} else {
    console.error('File not found');
}
