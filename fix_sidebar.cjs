const fs = require('fs');
const file = 'src/components/AdminDashboard.jsx';

if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');

    // 1. Update Blogs button
    const oldBlogs = `<button className={\`w-full flex items-center \${isCollapsed ? 'justify-center px-0' : 'gap-4 px-4'} py-3.5 rounded-2xl font-bold text-[14.5px] text-slate-500 hover:text-slate-700 hover:bg-slate-100/80 transition-all\`}>
                <FileText size={20} className="text-[#3b82f6]" />
                {!isCollapsed && <span>Blogs</span>}
              </button>`;
    const newBlogs = `<button 
                onClick={() => setActiveTab('blogs')}
                className={\`w-full relative flex items-center \${isCollapsed ? 'justify-center px-0' : 'gap-4 px-4'} py-3.5 rounded-2xl font-bold text-[14.5px] transition-all duration-300 \${activeTab === 'blogs' ? 'bg-[#ebeeff] text-[#5b32ea]' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/80'}\`}
              >
                <FileText size={20} className={activeTab === 'blogs' ? 'text-[#3b82f6]' : 'text-[#3b82f6]'} />
                {!isCollapsed && <span>Blogs</span>}
              </button>`;
    content = content.replace(oldBlogs, newBlogs);

    // 2. Update AI Generator button
    const oldAIGen = `<button className={\`w-full flex items-center \${isCollapsed ? 'justify-center px-0' : 'gap-4 px-4'} py-3.5 rounded-2xl font-bold text-[14.5px] text-slate-500 hover:text-slate-700 hover:bg-slate-100/80 transition-all\`}>
                <Sparkles size={20} className="text-[#eab308]" />
                {!isCollapsed && <span>AI Generator</span>}
              </button>`;
    const newAIGen = `<button 
                onClick={() => setActiveTab('ai-generator')}
                className={\`w-full relative flex items-center \${isCollapsed ? 'justify-center px-0' : 'gap-4 px-4'} py-3.5 rounded-2xl font-bold text-[14.5px] transition-all duration-300 \${activeTab === 'ai-generator' ? 'bg-[#ebeeff] text-[#5b32ea]' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/80'}\`}
              >
                <Sparkles size={20} className={activeTab === 'ai-generator' ? 'text-[#eab308]' : 'text-[#eab308]'} />
                {!isCollapsed && <span>AI Generator</span>}
              </button>`;
    content = content.replace(oldAIGen, newAIGen);

    // 3. Add placeholders at the end of <main>
    const placeholderBlock = `
        {/* Active Tab: Course Bundles */}
        {activeTab === 'courses' && <CourseSetup />}

        {/* Placeholders for new tabs */}
        {['blogs', 'ai-generator'].includes(activeTab) && (
          <div className="flex flex-col items-center justify-center h-full min-h-[500px] text-slate-500 animate-in fade-in duration-300">
            <div className="w-20 h-20 rounded-[1.5rem] bg-blue-50 text-blue-500 flex items-center justify-center mb-6 shadow-sm border border-blue-100">
              <LayoutDashboard size={40} />
            </div>
            <h2 className="text-3xl font-[900] mb-2 capitalize text-slate-800 tracking-tight">{activeTab.replace('-', ' ')} Module</h2>
            <p className="text-[15px] font-medium text-slate-500">This module is currently under development and will be available soon.</p>
          </div>
        )}

      </main>`;
    content = content.replace(`
        {/* Active Tab: Course Bundles */}
        {activeTab === 'courses' && <CourseSetup />}

      </main>`, placeholderBlock);

    fs.writeFileSync(file, content, 'utf8');
    console.log("Updated AdminDashboard.jsx successfully!");
} else {
    console.error('File not found');
}
