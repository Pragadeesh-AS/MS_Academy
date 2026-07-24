const fs = require('fs');
const file = 'src/components/AdminDashboard.jsx';

if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');

    const startRegex = /\{\/\*\s*Left Section:\s*Interactive List-View\s*\(Col span 7 or 8\)\s*\*\/\}/;
    const endRegex = /\{\/\*\s*Right Section:\s*Bento Quick Actions\s*\(Col span 4\)\s*\*\/\}/;

    const startMatch = content.match(startRegex);
    const endMatch = content.match(endRegex);

    if (startMatch && endMatch) {
        const startIndex = startMatch.index;
        const endIndex = endMatch.index;

        const newContent = `{/* Left Section: Interactive List-View (Col span 7 or 8) */}
              <div className="xl:col-span-8 flex flex-col">
                <div className="bg-white border border-[#EEF2F7] rounded-[26px] shadow-[0_12px_35px_rgba(15,23,42,0.06)] p-8">
                  {/* Header */}
                  <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-700 shadow-sm">
                        <FileText size={18} />
                      </div>
                      <div className="flex flex-col">
                        <h3 className="text-[20px] font-bold text-[#0F172A] tracking-tight font-sans leading-tight">Recent Tests</h3>
                        <p className="text-[13px] text-[#64748B] font-medium">Recently created AI-generated assessments</p>
                      </div>
                    </div>
                    <button className="text-[13px] font-semibold text-[#0F172A] border border-[#E5E7EB] px-5 py-2 rounded-full hover:bg-slate-50 transition-colors shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
                      View All &rarr;
                    </button>
                  </div>

                  {/* Test List */}
                  <div className="flex flex-col gap-[14px]">
                    {[
                      { title: "Practice Test: ME2023.pdf", sub: "Mechanical Engineering", diff: "Medium", color: "orange", time: "60", marks: "100", students: "120", date: "2 Jul 2025" },
                      { title: "CS Foundations: Q1.pdf", sub: "Computer Science", diff: "Easy", color: "green", time: "45", marks: "50", students: "250", date: "1 Jul 2025" },
                      { title: "Advanced Calculus: Final.pdf", sub: "Mathematics", diff: "Hard", color: "red", time: "120", marks: "200", students: "85", date: "28 Jun 2025" },
                      { title: "Physics Mock: PH2025.pdf", sub: "Physics", diff: "Medium", color: "orange", time: "90", marks: "100", students: "140", date: "25 Jun 2025" },
                      { title: "Data Structures 101.pdf", sub: "Computer Science", diff: "Easy", color: "green", time: "30", marks: "30", students: "310", date: "20 Jun 2025" },
                      { title: "Thermodynamics: ME-Mid.pdf", sub: "Mechanical Engineering", diff: "Hard", color: "red", time: "180", marks: "150", students: "115", date: "18 Jun 2025" },
                      { title: "Organic Chem: CH-202.pdf", sub: "Chemistry", diff: "Medium", color: "orange", time: "60", marks: "80", students: "90", date: "15 Jun 2025" },
                      { title: "Ethics in Tech: ET-400.pdf", sub: "Humanities", diff: "Easy", color: "green", time: "45", marks: "50", students: "400", date: "10 Jun 2025" }
                    ].map((test, idx) => {
                      const diffStyles = {
                        green: 'text-[#10B981] bg-gradient-to-r from-emerald-50 to-emerald-100/50',
                        orange: 'text-[#F59E0B] bg-gradient-to-r from-orange-50 to-orange-100/50',
                        red: 'text-[#EF4444] bg-gradient-to-r from-rose-50 to-rose-100/50'
                      }[test.color];

                      return (
                        <div key={idx} className="relative group bg-white border border-[#EEF2F7] rounded-[18px] h-[78px] flex items-center justify-between px-5 shadow-[0_3px_12px_rgba(15,23,42,0.04)] hover:bg-[#F8FAFF] hover:-translate-y-1 hover:shadow-[0_16px_35px_rgba(37,99,235,0.12)] transition-all duration-300 z-10 hover:z-20">
                          
                          {/* Left Side */}
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-blue-50/50 border border-blue-100 flex items-center justify-center text-[#2563EB]">
                              <FileText size={18} strokeWidth={2.5} />
                            </div>
                            <div className="flex flex-col">
                              <h4 className="font-[600] text-[17px] text-[#0F172A] font-sans leading-tight">{test.title}</h4>
                              <span className="text-[13px] font-medium text-[#64748B] font-sans mt-0.5">{test.sub}</span>
                            </div>
                            <span className={\`ml-3 px-3 py-1 rounded-full text-[12px] font-bold tracking-wide shadow-sm \${diffStyles}\`}>
                              {test.diff}
                            </span>
                          </div>

                          {/* Metadata */}
                          <div className="flex items-center gap-6 text-[#64748B] group-hover:translate-x-2 group-hover:opacity-0 transition-all duration-300">
                            <div className="flex items-center gap-1.5 text-[13px] font-medium">
                              <Clock size={15} className="opacity-70" /> {test.time} mins
                            </div>
                            <div className="flex items-center gap-1.5 text-[13px] font-medium">
                              <Trophy size={15} className="opacity-70" /> {test.marks} Marks
                            </div>
                            <div className="flex items-center gap-1.5 text-[13px] font-medium">
                              <Users size={15} className="opacity-70" /> {test.students} Students
                            </div>
                            <div className="flex items-center gap-1.5 text-[13px] font-medium">
                              <Calendar size={15} className="opacity-70" /> {test.date}
                            </div>
                          </div>

                          {/* Hover Action Buttons (Absolute Positioned inside row) */}
                          <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center gap-3 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-[-50%] transition-all duration-300 pointer-events-none group-hover:pointer-events-auto">
                            <button className="h-[40px] px-4 bg-white border border-[#E5E7EB] rounded-[14px] shadow-[0_6px_16px_rgba(15,23,42,0.08)] text-[#2563EB] font-semibold text-[14px] flex items-center gap-2 hover:border-[#2563EB]/40 hover:shadow-[0_0_15px_rgba(37,99,235,0.15)] transition-all">
                              <Edit2 size={16} strokeWidth={2.5} /> Edit Test
                            </button>
                            <button className="h-[40px] px-4 bg-white border border-[#E5E7EB] rounded-[14px] shadow-[0_6px_16px_rgba(15,23,42,0.08)] text-[#2563EB] font-semibold text-[14px] flex items-center gap-2 hover:border-[#2563EB]/40 hover:shadow-[0_0_15px_rgba(37,99,235,0.15)] transition-all">
                              <BarChart2 size={16} strokeWidth={2.5} /> Analytics
                            </button>
                            <button className="h-[40px] px-4 bg-[#FEF2F2] border border-red-100 rounded-[14px] shadow-[0_6px_16px_rgba(15,23,42,0.08)] text-[#EF4444] font-semibold text-[14px] flex items-center gap-2 hover:bg-red-100 transition-all ml-4">
                              <Trash2 size={16} strokeWidth={2.5} /> Delete
                            </button>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              `;

        const finalContent = content.substring(0, startIndex) + newContent + content.substring(endIndex);
        fs.writeFileSync(file, finalContent, 'utf8');
        console.log("Recent Tests section successfully replaced!");
    } else {
        console.error("Failed to match the boundaries for replacement.");
    }
} else {
    console.error('File not found');
}
