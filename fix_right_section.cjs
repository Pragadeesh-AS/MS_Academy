const fs = require('fs');
const file = 'src/components/AdminDashboard.jsx';

if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');

    // Find the boundaries
    const startStr = "{/* Right Section: Bento Quick Actions (Col span 4) */}";
    const endStr = "{/* Active Tab: Teachers (Faculty & Recruitment) */}";
    
    // Since there might be multiple startStr due to the bad replace, we find the FIRST occurrence of startStr
    const startIndex = content.indexOf(startStr);
    const endIndex = content.indexOf(endStr);

    if (startIndex !== -1 && endIndex !== -1) {
        // Build the new Heatmap Activity Data (GitHub style)
        // 5 weeks (rows) x 7 days (cols)
        const heatmapData = [
          // Week 1 (May 6 - 12)
          [0, 1, 2, 4, 3, 0, 0],
          // Week 2 (May 13 - 19)
          [1, 2, 4, 5, 2, 1, 0],
          // Week 3 (May 20 - 26)
          [2, 3, 5, 6, 4, 2, 1],
          // Week 4 (May 27 - Jun 2)
          [1, 4, 6, 6, 5, 1, 0],
          // Week 5 (Jun 3 - 9)
          [2, 5, 6, 6, 6, 2, 1]
        ];

        const newContent = `{/* Right Section: Bento Quick Actions (Col span 4) */}
              <div className="xl:col-span-4 space-y-6">

                {/* Asymmetrical Bento Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Primary Action (Styled component) */}
                  <div className="col-span-2 w-full">
                    <CreateTestButton />
                  </div>

                  {/* Secondary Action 1 (Students) */}
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
                  <button className="col-span-2 bg-white border border-[#EEF2F7] rounded-[22px] h-[110px] px-7 py-0 flex items-center justify-between shadow-[0_10px_28px_rgba(15,23,42,0.06)] hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(15,23,42,0.08)] hover:border-blue-400 transition-all group text-left w-full">
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

                {/* Student Activity Heatmap (GitHub Style) */}
                <div className="bg-white border border-[#EEF2F7] rounded-[26px] shadow-[0_12px_35px_rgba(15,23,42,0.06)] p-[24px]">
                  
                  {/* Header */}
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#2563EB] animate-pulse shadow-[0_0_8px_rgba(37,99,235,0.6)]"></div>
                      <div className="flex flex-col">
                        <h4 className="font-bold text-[17px] text-[#0F172A] leading-tight">Student Activity</h4>
                        <span className="font-medium text-[12px] text-[#64748B] mt-0.5">Daily student engagement overview</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F8FAFC] border border-[#EEF2F7] rounded-full cursor-pointer hover:bg-slate-50 transition-colors">
                      <span className="text-[12px] font-semibold text-[#0F172A]">Last 30 Days</span>
                      <ChevronRight size={14} className="text-slate-400 rotate-90" />
                    </div>
                  </div>

                  {/* Heatmap Grid */}
                  <div className="flex gap-3 mb-6">
                    {/* Y-Axis Labels (Weeks) */}
                    <div className="flex flex-col justify-between text-[11px] font-medium text-[#64748B] pt-6 pb-2 w-16 text-right shrink-0">
                      <span>May 6</span>
                      <span>May 13</span>
                      <span>May 20</span>
                      <span>May 27</span>
                      <span>Jun 3</span>
                    </div>

                    {/* Grid + X-Axis Labels */}
                    <div className="flex flex-col flex-1">
                      {/* X-Axis Labels (Days) */}
                      <div className="grid grid-cols-7 gap-2 mb-2 text-center">
                        <span className="text-[11px] font-medium text-[#64748B]">Mon</span>
                        <span className="text-[11px] font-medium text-[#64748B]">Tue</span>
                        <span className="text-[11px] font-medium text-[#64748B]">Wed</span>
                        <span className="text-[11px] font-medium text-[#64748B]">Thu</span>
                        <span className="text-[11px] font-medium text-[#64748B]">Fri</span>
                        <span className="text-[11px] font-medium text-[#64748B]">Sat</span>
                        <span className="text-[11px] font-medium text-[#64748B]">Sun</span>
                      </div>

                      {/* Cells */}
                      <div className="flex flex-col gap-2">
                        {${JSON.stringify(heatmapData)}.map((week, weekIdx) => (
                          <div key={weekIdx} className="grid grid-cols-7 gap-2">
                            {week.map((val, dayIdx) => {
                              const colors = [
                                'bg-[#F8FAFC] border border-[#EEF2F7]', // 0
                                'bg-[#DBEAFE]', // 1
                                'bg-[#BFDBFE]', // 2
                                'bg-[#93C5FD]', // 3
                                'bg-[#60A5FA]', // 4
                                'bg-[#3B82F6]', // 5
                                'bg-[#2563EB] shadow-[0_0_8px_rgba(37,99,235,0.4)]'  // 6
                              ];
                              
                              const count = val === 0 ? 0 : val * 35 + (dayIdx * 12);
                              const id = weekIdx * 7 + dayIdx;

                              return (
                                <div key={dayIdx} className="relative group/cell flex justify-center">
                                  <div className={\`w-[18px] h-[18px] rounded-[4px] \${colors[val]} transition-all duration-200 cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-blue-400 group-hover/cell:scale-110 z-10\`}></div>
                                  
                                  {/* Tooltip */}
                                  <div className="absolute bottom-[140%] opacity-0 group-hover/cell:opacity-100 pointer-events-none transition-all duration-200 w-max bg-[#0F172A] text-white text-[11px] rounded-[8px] px-3 py-2 shadow-xl z-[100] translate-y-1 group-hover/cell:-translate-y-1">
                                    <div className="font-bold text-[#93C5FD] mb-0.5">Week \${weekIdx + 1}, Day \${dayIdx + 1}</div>
                                    <div><span className="font-[900] text-white text-[13px]">{count}</span> active</div>
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-[#0F172A]"></div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Heatmap Legend */}
                  <div className="flex items-center justify-end gap-2 mb-6">
                    <span className="text-[11px] font-medium text-[#64748B]">Less Active</span>
                    <div className="flex gap-1">
                      <div className="w-[12px] h-[12px] rounded-[2px] bg-[#F8FAFC] border border-[#EEF2F7]"></div>
                      <div className="w-[12px] h-[12px] rounded-[2px] bg-[#DBEAFE]"></div>
                      <div className="w-[12px] h-[12px] rounded-[2px] bg-[#93C5FD]"></div>
                      <div className="w-[12px] h-[12px] rounded-[2px] bg-[#3B82F6]"></div>
                      <div className="w-[12px] h-[12px] rounded-[2px] bg-[#2563EB]"></div>
                    </div>
                    <span className="text-[11px] font-medium text-[#64748B]">More Active</span>
                  </div>

                  {/* Summary Footer Metric Chips */}
                  <div className="grid grid-cols-2 gap-3 pt-5 border-t border-[#EEF2F7]">
                    
                    <div className="bg-[#F8FAFC] rounded-[14px] p-3 flex items-center gap-3 border border-[#F1F5F9]">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600"><Users size={14} strokeWidth={2.5} /></div>
                      <div className="flex flex-col">
                        <span className="text-[15px] font-bold text-[#0F172A] leading-tight">1,284</span>
                        <span className="text-[11px] font-medium text-[#64748B]">Active Students</span>
                      </div>
                    </div>

                    <div className="bg-[#F8FAFC] rounded-[14px] p-3 flex items-center gap-3 border border-[#F1F5F9]">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600"><TrendingUp size={14} strokeWidth={2.5} /></div>
                      <div className="flex flex-col">
                        <span className="text-[15px] font-bold text-[#0F172A] leading-tight">+12%</span>
                        <span className="text-[11px] font-medium text-[#64748B]">vs Last 30 Days</span>
                      </div>
                    </div>

                    <div className="bg-[#F8FAFC] rounded-[14px] p-3 flex items-center gap-3 border border-[#F1F5F9]">
                      <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600"><Sparkles size={14} strokeWidth={2.5} /></div>
                      <div className="flex flex-col">
                        <span className="text-[15px] font-bold text-[#0F172A] leading-tight">98%</span>
                        <span className="text-[11px] font-medium text-[#64748B]">Avg Engagement</span>
                      </div>
                    </div>

                    <div className="bg-[#F8FAFC] rounded-[14px] p-3 flex items-center gap-3 border border-[#F1F5F9]">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600"><Calendar size={14} strokeWidth={2.5} /></div>
                      <div className="flex flex-col">
                        <span className="text-[15px] font-bold text-[#0F172A] leading-tight">28 Days</span>
                        <span className="text-[11px] font-medium text-[#64748B]">Tracked</span>
                      </div>
                    </div>

                  </div>

                </div>

              </div>

            </div>
          </div>
        )}

        `;
        
        // Construct the final file replacing everything from startStr to before endStr
        const finalContent = content.substring(0, startIndex) + newContent + content.substring(endIndex);
        
        fs.writeFileSync(file, finalContent, 'utf8');
        console.log("Right section successfully replaced and fixed!");
    } else {
        console.error("Failed to find boundaries for replacement.");
    }
} else {
    console.error('File not found');
}
