const fs = require('fs');
const file = 'src/components/AdminDashboard.jsx';

if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');

    // Regex to match the map block inside Recent Tests
    const mapStartRegex = /\{\[\s*\{\s*title:\s*"Practice Test: ME2023\.pdf"[\s\S]*?\]\.map\(\(test, idx\) => \{/;
    const mapEndRegex = /return \(\s*<div key=\{idx\} className="relative group bg-white border border-\[\#EEF2F7\][\s\S]*?<\/div>\s*\);\s*\}\)\}\s*<\/div>/;

    const startMatch = content.match(mapStartRegex);
    const endMatch = content.match(mapEndRegex);

    if (startMatch && endMatch) {
        // We will replace the entire map block
        const oldBlockRegex = /\{\[\s*\{\s*title:\s*"Practice Test: ME2023\.pdf"[\s\S]*?\]\.map\(\(test, idx\) => \{[\s\S]*?return \(\s*<div key=\{idx\} className="relative group bg-white border border-\[\#EEF2F7\][\s\S]*?<\/div>\s*\);\s*\}\)\}/;

        const newMapBlock = `{[
                      { title: "Practice Test: ME2023.pdf", sub: "Mechanical Engineering", diff: "Medium", color: "orange", time: "60", marks: "100", date: "2 Jul 2025" },
                      { title: "CS Foundations: Q1.pdf", sub: "Computer Science", diff: "Easy", color: "green", time: "45", marks: "50", date: "1 Jul 2025" },
                      { title: "Advanced Calculus: Final.pdf", sub: "Mathematics", diff: "Hard", color: "red", time: "120", marks: "200", date: "28 Jun 2025" },
                      { title: "Physics Mock: PH2025.pdf", sub: "Physics", diff: "Medium", color: "orange", time: "90", marks: "100", date: "25 Jun 2025" },
                      { title: "Data Structures 101.pdf", sub: "Computer Science", diff: "Easy", color: "green", time: "30", marks: "30", date: "20 Jun 2025" },
                      { title: "Thermodynamics: ME-Mid.pdf", sub: "Mechanical Engineering", diff: "Hard", color: "red", time: "180", marks: "150", date: "18 Jun 2025" },
                      { title: "Organic Chem: CH-202.pdf", sub: "Chemistry", diff: "Medium", color: "orange", time: "60", marks: "80", date: "15 Jun 2025" },
                      { title: "Ethics in Tech: ET-400.pdf", sub: "Humanities", diff: "Easy", color: "green", time: "45", marks: "50", date: "10 Jun 2025" }
                    ].map((test, idx) => {
                      const diffStyles = {
                        green: 'text-[#10B981] bg-gradient-to-r from-emerald-50 to-emerald-100/50',
                        orange: 'text-[#F59E0B] bg-gradient-to-r from-orange-50 to-orange-100/50',
                        red: 'text-[#EF4444] bg-gradient-to-r from-rose-50 to-rose-100/50'
                      }[test.color];

                      return (
                        <div key={idx} className="group flex flex-col bg-white border border-[#EEF2F7] rounded-[18px] px-5 py-4 shadow-[0_3px_12px_rgba(15,23,42,0.04)] hover:bg-[#F8FAFF] hover:-translate-y-1 hover:shadow-[0_16px_35px_rgba(37,99,235,0.12)] transition-all duration-300 z-10 hover:z-20 overflow-hidden">
                          
                          {/* Main Row Content (Always visible) */}
                          <div className="flex items-center justify-between">
                            
                            {/* Left Side */}
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-blue-50/50 border border-blue-100 flex items-center justify-center text-[#2563EB]">
                                <FileText size={18} strokeWidth={2.5} />
                              </div>
                              <div className="flex flex-col w-[240px]">
                                <h4 className="font-[600] text-[17px] text-[#0F172A] font-sans leading-tight whitespace-nowrap overflow-hidden text-ellipsis">{test.title}</h4>
                                <span className="text-[13px] font-medium text-[#64748B] font-sans mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">{test.sub}</span>
                              </div>
                              <span className={\`ml-2 px-3 py-1 rounded-full text-[12px] font-bold tracking-wide shadow-sm whitespace-nowrap \${diffStyles}\`}>
                                {test.diff}
                              </span>
                            </div>

                            {/* Metadata */}
                            <div className="flex items-center gap-8 text-[#64748B] flex-1 justify-end">
                              <div className="flex items-center gap-2 text-[14px] font-medium whitespace-nowrap">
                                <Clock size={16} className="opacity-70" /> {test.time} mins
                              </div>
                              <div className="flex items-center gap-2 text-[14px] font-medium whitespace-nowrap">
                                <Trophy size={16} className="opacity-70" /> {test.marks} Marks
                              </div>
                              <div className="flex items-center gap-2 text-[14px] font-medium whitespace-nowrap">
                                <Calendar size={16} className="opacity-70" /> {test.date}
                              </div>
                            </div>
                          </div>

                          {/* Hover Action Buttons (Expands downwards) */}
                          <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-all duration-300 ease-in-out opacity-0 group-hover:opacity-100">
                            <div className="overflow-hidden">
                              <div className="flex items-center gap-3 pt-4 mt-4 border-t border-[#EEF2F7]">
                                <button className="h-[40px] px-5 bg-white border border-[#E5E7EB] rounded-[14px] shadow-[0_6px_16px_rgba(15,23,42,0.08)] text-[#2563EB] font-semibold text-[14px] flex items-center gap-2 hover:border-[#2563EB]/40 hover:shadow-[0_0_15px_rgba(37,99,235,0.15)] transition-all">
                                  <Edit2 size={16} strokeWidth={2.5} /> Edit Test
                                </button>
                                <button className="h-[40px] px-5 bg-white border border-[#E5E7EB] rounded-[14px] shadow-[0_6px_16px_rgba(15,23,42,0.08)] text-[#2563EB] font-semibold text-[14px] flex items-center gap-2 hover:border-[#2563EB]/40 hover:shadow-[0_0_15px_rgba(37,99,235,0.15)] transition-all">
                                  <BarChart2 size={16} strokeWidth={2.5} /> Analytics
                                </button>
                                <div className="flex-1"></div>
                                <button className="h-[40px] px-5 bg-[#FEF2F2] border border-red-100 rounded-[14px] shadow-[0_6px_16px_rgba(15,23,42,0.08)] text-[#EF4444] font-semibold text-[14px] flex items-center gap-2 hover:bg-red-100 transition-all">
                                  <Trash2 size={16} strokeWidth={2.5} /> Delete
                                </button>
                              </div>
                            </div>
                          </div>

                        </div>
                      );
                    })}`;

        content = content.replace(oldBlockRegex, newMapBlock);
        fs.writeFileSync(file, content, 'utf8');
        console.log("Recent Tests map successfully replaced!");
    } else {
        console.error("Failed to match the map block for replacement.");
    }
} else {
    console.error('File not found');
}
