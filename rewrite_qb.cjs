const fs = require('fs');

const file = 'src/components/admin/QuestionBank.jsx';
let content = fs.readFileSync(file, 'utf8');

const lines = content.split('\n');

const startLine = 476; // Index is 476 (line 477)
const endLine = 808;   // Index is 808 (line 809)

// Calculate stats for KPIs
// questions array is available in scope. We can't put JS logic in JSX if it depends on state outside the component? No, the new UI is INSIDE the component.

const newJSX = `
  const totalQuestions = questions.length;
  const mcqQuestions = questions.filter(q => q.questionType === 'Single Choice' || q.questionType === 'Multiple Choice').length;
  const mcqPercentage = totalQuestions === 0 ? 0 : Math.round((mcqQuestions / totalQuestions) * 100);
  const totalSubjects = new Set(questions.map(q => q.subject).filter(Boolean)).size;
  const numericalQuestions = questions.filter(q => q.questionType === 'Numerical').length;
  const pendingReview = 14; // Mocked as per requirement

  const relativeTime = (isoString) => {
    if (!isoString) return 'Yesterday';
    const date = new Date(isoString);
    const diff = Math.floor((new Date() - date) / 1000);
    if (diff < 86400) return 'Today';
    if (diff < 172800) return 'Yesterday';
    return \\\`\\\${Math.floor(diff/86400)} days ago\\\`;
  };

  return (
    <>
      <style>
        {\\\`
          .qb-canvas {
            background-color: #F8FAFC;
            background-image: radial-gradient(#CBD5E1 1px, transparent 1px);
            background-size: 24px 24px;
          }
        \\\`}
      </style>
      
      <div className="qb-canvas relative flex flex-col xl:flex-row gap-8 w-full h-full min-h-[900px] p-8 overflow-hidden z-0">
        
        {/* Soft Radial Gradients */}
        <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] bg-blue-200/40 rounded-full blur-[100px] pointer-events-none -z-10"></div>
        <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-100/30 rounded-full blur-[100px] pointer-events-none -z-10"></div>

        {/* ==================== LEFT SIDEBAR ==================== */}
        <div className="w-full xl:w-[300px] shrink-0 bg-[#FFFFFF] border border-[#EEF2F7] rounded-[28px] shadow-[0_12px_35px_rgba(15,23,42,0.06)] flex flex-col h-fit overflow-hidden relative z-10">
          
          <div className="p-7 border-b border-[#EEF2F7] flex items-center gap-3">
            <div className="w-10 h-10 rounded-[14px] bg-blue-50 flex items-center justify-center border border-blue-100/50">
              <BookOpen size={20} className="text-[#2563EB]" strokeWidth={2.5} />
            </div>
            <h3 className="text-[17px] font-[800] text-[#0F172A] tracking-tight">Question Bank</h3>
          </div>
          
          <div className="p-5 flex flex-col gap-1.5">
            {[
              { id: 'all', name: 'All Questions', count: totalQuestions, icon: LayoutList },
              { id: 'mcq', name: 'MCQ', count: mcqQuestions, icon: CheckCircle2 },
              { id: 'numerical', name: 'Numerical', count: numericalQuestions, icon: Calculator },
              { id: 'theory', name: 'Theory', count: 64, icon: FileText },
              { id: 'diagram', name: 'Diagram Based', count: 20, icon: ImageIcon },
              { id: 'bookmarked', name: 'Bookmarked', count: 18, icon: Bookmark },
              { id: 'recent', name: 'Recently Added', count: 32, icon: Clock },
              { id: 'pending', name: 'Pending Review', count: pendingReview, icon: AlertCircle },
              { id: 'trash', name: 'Trash', count: 6, icon: Trash2 },
            ].map((item, idx) => {
              const isActive = idx === 0; // Just styling the first one as active for now
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  className={\\\`relative flex items-center justify-between p-3.5 rounded-[18px] transition-all duration-300 group \\\${
                    isActive 
                    ? 'bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] shadow-[0_4px_12px_rgba(37,99,235,0.2)]' 
                    : 'hover:bg-[#F8FAFF] hover:translate-x-1'
                  }\\\`}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={18} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-white' : 'text-[#64748B] group-hover:text-[#2563EB] transition-colors'} />
                    <span className={\\\`font-[600] text-[14px] \\\${isActive ? 'text-white' : 'text-[#0F172A]'}\\\`}>
                      {item.name}
                    </span>
                  </div>
                  <span className={\\\`text-[12px] font-[700] min-w-[26px] h-[26px] flex items-center justify-center rounded-full \\\${
                    isActive 
                    ? 'bg-white/20 text-white' 
                    : 'bg-white border border-[#EEF2F7] text-[#64748B] group-hover:border-[#2563EB]/20 group-hover:text-[#2563EB]'
                  }\\\`}>
                    {item.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ==================== MAIN CONTENT PANEL ==================== */}
        <div className="flex-1 flex flex-col gap-6 relative z-10 w-full min-w-0">
          
          {/* Main Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-[64px] h-[64px] rounded-[20px] bg-white border border-[#EEF2F7] shadow-sm flex items-center justify-center shrink-0">
                <BookOpen size={28} className="text-[#2563EB]" strokeWidth={2} />
              </div>
              <div className="flex flex-col gap-1">
                <h1 className="text-[36px] font-[800] text-[#0F172A] leading-none tracking-tight font-sans">
                  Question Bank
                </h1>
                <p className="text-[15px] font-[500] text-[#64748B] mt-1">
                  Manage practice questions for students across all departments.
                </p>
              </div>
            </div>

            <button 
              onClick={openAddCreator}
              className="h-[56px] px-8 bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:shadow-[0_8px_20px_rgba(37,99,235,0.25)] hover:-translate-y-1 text-white font-[600] text-[15px] rounded-[16px] transition-all shrink-0 flex items-center justify-center gap-2 group"
            >
              <Plus size={20} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" /> 
              Add Question
            </button>
          </div>

          {/* KPI CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {[
              { label: 'Total Questions', value: totalQuestions, icon: FileText, color: 'blue' },
              { label: 'Subjects', value: totalSubjects, icon: Bookmark, color: 'purple' },
              { label: 'MCQ Questions', value: \\\`\\\${mcqPercentage}%\\\`, icon: CheckCircle2, color: 'green' },
              { label: 'Pending Review', value: pendingReview, icon: AlertCircle, color: 'orange' },
            ].map((stat, i) => (
              <div key={i} className="bg-white rounded-[20px] border border-[#EEF2F7] p-5 shadow-[0_8px_24px_rgba(15,23,42,0.03)] flex items-center gap-5 hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(15,23,42,0.06)] transition-all duration-300">
                <div className={\\\`w-[54px] h-[54px] rounded-full bg-\\\${stat.color}-50 flex items-center justify-center shrink-0 border border-\\\${stat.color}-100\\\`}>
                  <stat.icon size={24} className={\\\`text-\\\${stat.color}-500\\\`} strokeWidth={2} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[28px] font-[800] text-[#0F172A] leading-none">{stat.value}</span>
                  <span className="text-[14px] font-[600] text-[#64748B] mt-1.5">{stat.label}</span>
                </div>
              </div>
            ))}
          </div>

          {/* SEARCH BAR */}
          <div className="relative w-full shadow-[0_4px_16px_rgba(15,23,42,0.02)]">
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
              <Search size={22} className="text-[#94A3B8]" />
            </div>
            <input 
              type="text"
              placeholder="Search questions by text..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-[58px] pl-14 pr-6 bg-white border border-[#EEF2F7] rounded-[18px] text-[16px] font-[500] text-[#0F172A] placeholder-[#94A3B8] focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10 outline-none transition-all"
            />
          </div>

          {/* FILTERS */}
          <div className="flex flex-wrap items-center gap-3">
            {[
              { label: 'Department', val: filterDept, setter: setFilterDept, icon: Layers, opts: departments },
              { label: 'Subject', val: filterSubject, setter: setFilterSubject, icon: Bookmark, opts: subjects },
              { label: 'Topic', val: filterTopic, setter: setFilterTopic, icon: FileText, opts: topics },
              { label: 'Year', val: filterYear, setter: setFilterYear, icon: Clock, opts: years },
              { label: 'Marks', val: filterMark, setter: setFilterMark, icon: Trophy, opts: marks },
              { label: 'Difficulty', val: filterDifficulty, setter: setFilterDifficulty, icon: Star, opts: difficulties }
            ].map((f, i) => (
              <div key={i} className="relative group shrink-0">
                <select 
                  value={f.val}
                  onChange={(e) => f.setter(e.target.value)}
                  className="h-[48px] pl-11 pr-10 appearance-none bg-white border border-[#E5E7EB] rounded-[14px] text-[13px] font-[600] text-[#0F172A] focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10 outline-none transition-all cursor-pointer min-w-[140px] hover:border-[#CBD5E1]"
                >
                  <option value="All">All {f.label}s</option>
                  {f.opts.map((opt, idx) => (
                    <option key={idx} value={opt}>{opt}</option>
                  ))}
                </select>
                <f.icon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#2563EB]" />
                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none group-hover:text-[#64748B] transition-colors" />
              </div>
            ))}
            
            <button 
              onClick={() => {
                setSearch(''); setFilterDept('All'); setFilterSubject('All'); setFilterTopic('All'); setFilterYear('All'); setFilterMark('All'); setFilterDifficulty('All');
              }}
              className="h-[48px] px-6 bg-white border border-[#E5E7EB] hover:border-[#CBD5E1] hover:bg-[#F8FAFC] text-[#64748B] hover:text-[#0F172A] font-[600] text-[13px] rounded-[14px] transition-all flex items-center gap-2"
            >
              <X size={16} /> Reset
            </button>
          </div>

          {/* QUESTION TABLE */}
          <div className="bg-white border border-[#EEF2F7] rounded-[24px] shadow-[0_10px_28px_rgba(15,23,42,0.05)] flex flex-col overflow-hidden mb-8">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="border-b border-[#EEF2F7]">
                    <th className="py-5 px-6 text-[12px] font-[700] text-[#64748B] uppercase tracking-wider">Question</th>
                    <th className="py-5 px-6 text-[12px] font-[700] text-[#64748B] uppercase tracking-wider w-[140px]">Type</th>
                    <th className="py-5 px-6 text-[12px] font-[700] text-[#64748B] uppercase tracking-wider w-[120px]">Marks</th>
                    <th className="py-5 px-6 text-[12px] font-[700] text-[#64748B] uppercase tracking-wider w-[120px]">Difficulty</th>
                    <th className="py-5 px-6 text-[12px] font-[700] text-[#64748B] uppercase tracking-wider w-[160px]">Department</th>
                    <th className="py-5 px-6 text-[12px] font-[700] text-[#64748B] uppercase tracking-wider w-[140px]">Updated</th>
                    <th className="py-5 px-6 text-[12px] font-[700] text-[#64748B] uppercase tracking-wider w-[140px] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF2F7]">
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563EB] mx-auto"></div>
                      </td>
                    </tr>
                  ) : filteredQuestions.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-[#64748B] font-[500] text-[15px]">
                        No questions found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredQuestions.map((q) => (
                      <tr key={q.id} className="group hover:bg-[#F8FAFF] transition-colors duration-200">
                        <td className="py-4 px-6 h-[82px] max-w-[400px]">
                          <div className="flex items-center gap-4">
                            <div className="w-[42px] h-[42px] rounded-[12px] bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100">
                              <FileText size={20} className="text-[#2563EB]" />
                            </div>
                            <div className="flex flex-col gap-1 min-w-0">
                              <span className="text-[15px] font-[600] text-[#0F172A] truncate block" title={q.questionText}>
                                {q.questionText || 'Untitled Question'}
                              </span>
                              <span className="text-[13px] font-[500] text-[#64748B] truncate block">
                                {q.subject || 'No Subject'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6 h-[82px]">
                          <span className="inline-flex items-center px-3 py-1 rounded-full bg-purple-50 text-purple-600 border border-purple-100 text-[12px] font-[700] whitespace-nowrap">
                            {q.questionType}
                          </span>
                        </td>
                        <td className="py-4 px-6 h-[82px]">
                          <span className="text-[14px] font-[600] text-[#0F172A]">{q.mark?.split(' ')[0] || '1'} Mark</span>
                        </td>
                        <td className="py-4 px-6 h-[82px]">
                          <span className={\\\`inline-flex items-center px-3 py-1 rounded-full border text-[12px] font-[700] \\\${
                            q.difficultyLevel === 'Hard' ? 'bg-red-50 text-red-600 border-red-100' :
                            q.difficultyLevel === 'Medium' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                            'bg-green-50 text-green-600 border-green-100'
                          }\\\`}>
                            {q.difficultyLevel || 'Easy'}
                          </span>
                        </td>
                        <td className="py-4 px-6 h-[82px]">
                          <span className="text-[14px] font-[500] text-[#0F172A]">{q.department || 'All'}</span>
                        </td>
                        <td className="py-4 px-6 h-[82px]">
                          <span className="text-[13px] font-[500] text-[#64748B]">{relativeTime(q.createdAt)}</span>
                        </td>
                        <td className="py-4 px-6 h-[82px] text-right">
                          <div className="flex items-center justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                            <button className="w-[36px] h-[36px] flex items-center justify-center rounded-[10px] bg-white text-[#64748B] hover:text-[#2563EB] hover:bg-blue-50 shadow-[0_2px_8px_rgba(15,23,42,0.05)] transition-colors border border-[#EEF2F7]">
                              <Eye size={16} />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleEdit(q); }}
                              className="w-[36px] h-[36px] flex items-center justify-center rounded-[10px] bg-white text-[#64748B] hover:text-[#2563EB] hover:bg-blue-50 shadow-[0_2px_8px_rgba(15,23,42,0.05)] transition-colors border border-[#EEF2F7]">
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDelete(q.id); }}
                              className="w-[36px] h-[36px] flex items-center justify-center rounded-[10px] bg-white text-[#64748B] hover:text-[#EF4444] hover:bg-red-50 shadow-[0_2px_8px_rgba(15,23,42,0.05)] transition-colors border border-[#EEF2F7]">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Placeholder */}
            {!loading && filteredQuestions.length > 0 && (
              <div className="p-5 border-t border-[#EEF2F7] flex items-center justify-between bg-[#F8FAFC]/50">
                <span className="text-[13px] font-[500] text-[#64748B]">
                  Showing 1 to {filteredQuestions.length} of {filteredQuestions.length} questions
                </span>
                <div className="flex items-center gap-2">
                  <button className="w-8 h-8 rounded-lg border border-[#EEF2F7] bg-white flex items-center justify-center text-[#94A3B8] hover:border-[#CBD5E1] transition-colors">
                    <ChevronDown size={16} className="rotate-90" />
                  </button>
                  <button className="w-8 h-8 rounded-lg bg-[#2563EB] text-white font-[600] text-[13px] shadow-sm flex items-center justify-center">1</button>
                  <button className="w-8 h-8 rounded-lg border border-[#EEF2F7] bg-white flex items-center justify-center text-[#64748B] font-[600] text-[13px] hover:border-[#CBD5E1] transition-colors">2</button>
                  <button className="w-8 h-8 rounded-lg border border-[#EEF2F7] bg-white flex items-center justify-center text-[#64748B] font-[600] text-[13px] hover:border-[#CBD5E1] transition-colors">3</button>
                  <span className="text-[#94A3B8]">...</span>
                  <button className="w-8 h-8 rounded-lg border border-[#EEF2F7] bg-white flex items-center justify-center text-[#94A3B8] hover:border-[#CBD5E1] transition-colors">
                    <ChevronDown size={16} className="-rotate-90" />
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
`;

const part1 = lines.slice(0, startLine).join('\n');
const part3 = lines.slice(endLine).join('\n');

const missingImports = "import { Eye } from 'lucide-react';\n";

fs.writeFileSync(file, missingImports + part1 + '\n' + newJSX + '\n' + part3, 'utf8');
console.log('Replaced JSX block successfully.');
