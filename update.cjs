const fs = require('fs');
let content = fs.readFileSync('src/components/AdminDashboard.jsx', 'utf8');

// Add imports
if (!content.includes('import TeacherDirectory')) {
    content = content.replace(/import CourseSetup from '\.\/admin\/CourseSetup';/, `import CourseSetup from './admin/CourseSetup';\nimport StudentDirectory from './admin/StudentDirectory';\nimport TeacherDirectory from './admin/TeacherDirectory';`);
}

// Replace Teachers Tab
const teachersRegex = /\{\/\* Active Tab: Teachers \(Faculty & Recruitment\) \*\/\}\s*\{activeTab === 'teachers' && \([\s\S]*?\{\/\* Active Tab: Contact Queries \/ Joined Students \*\/\}/m;

const replacementTeachers = `{/* Active Tab: Teachers (Faculty & Recruitment) */}
        {activeTab === 'teachers' && (
          <TeacherDirectory
            invitedTeachers={invitedTeachers}
            deleteTeacher={deleteTeacher}
            onInvite={() => setIsTeacherInviteModalOpen(true)}
            activeSubTab={teacherSubTab}
            setActiveSubTab={setTeacherSubTab}
          >
            {teacherSubTab === 'recruitment' ? (
              <>
                <div className="flex flex-col sm:flex-row justify-end gap-4">
                  {/* Reset seed button */}
                  <button 
                    onClick={() => {
                      localStorage.removeItem('career_applications');
                      localStorage.setItem('career_applications', JSON.stringify(defaultApplications));
                      setApplications(defaultApplications);
                    }}
                    className="w-fit self-end px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <RefreshCw size={12} />
                    <span>Reset Seed Data</span>
                  </button>
                </div>

                {/* Filter controls */}
            <div className="bg-white border border-slate-100 p-4 rounded-3xl flex flex-col md:flex-row items-center gap-4">
              <div className="relative w-full md:flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search by candidate name, email, specialty..."
                  value={appSearch}
                  onChange={(e) => setAppSearch(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 border border-slate-200 rounded-2xl text-[14px] focus:outline-none focus:border-[#1d4ed8] focus:ring-1 focus:ring-[#1d4ed8] transition-all text-slate-800"
                />
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <Filter className="text-slate-400 flex-shrink-0" size={16} />
                <select
                  value={appFilter}
                  onChange={(e) => setAppFilter(e.target.value)}
                  className="w-full md:w-56 px-4 py-2.5 border border-slate-200 rounded-2xl text-[14px] bg-white focus:outline-none text-slate-700 font-medium"
                >
                  <option value="All">All Job Positions</option>
                  <option value="GATE Coaching Teacher">GATE Coaching Teacher</option>
                  <option value="School Teachers (6th – 12th)">School Teachers</option>
                </select>
              </div>
            </div>

            {/* Applicants Table */}
            <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-4 px-6">Candidate Name</th>
                      <th className="py-4 px-6">Position</th>
                      <th className="py-4 px-6">Specialization</th>
                      <th className="py-4 px-6">Experience</th>
                      <th className="py-4 px-6 text-center">Status</th>
                      <th className="py-4 px-6 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/60 text-slate-700 text-sm">
                    {filteredApps.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-12 text-center text-slate-400 font-semibold bg-white">
                          No applicants found matching filters.
                        </td>
                      </tr>
                    ) : (
                      filteredApps.map((app) => (
                        <tr key={app.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900 text-sm">{app.fullName}</span>
                              <span className="text-[11px] text-slate-400 font-medium">{app.email} • {app.phone}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className="px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold whitespace-nowrap">
                              {app.role === 'GATE Coaching Teacher' ? 'GATE Coach' : 'School Coach'}
                            </span>
                          </td>
                          <td className="py-4 px-6 font-semibold text-slate-800 text-[13px]">{app.specialization}</td>
                          <td className="py-4 px-6 text-slate-500 font-medium text-[13px]">{app.experience}</td>
                          <td className="py-4 px-6 text-center">
                            <span className={\`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold \${
                              app.status === 'Shortlisted' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                              app.status === 'Rejected' ? 'bg-red-50 text-red-600 border border-red-100' :
                              'bg-amber-50 text-amber-600 border border-amber-100'
                            }\`}>
                              <span className={\`w-1.5 h-1.5 rounded-full \${
                                app.status === 'Shortlisted' ? 'bg-emerald-500' :
                                app.status === 'Rejected' ? 'bg-red-500' : 'bg-amber-500'
                              }\`} />
                              {app.status}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => setSelectedApp(app)}
                                className="p-2 hover:bg-blue-50 text-blue-600 rounded-xl transition-colors border border-transparent hover:border-blue-100/50"
                                title="View Details"
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                onClick={() => updateAppStatus(app.id, 'Shortlisted')}
                                className="p-2 hover:bg-emerald-50 text-emerald-600 rounded-xl transition-colors border border-transparent hover:border-emerald-100/50 disabled:opacity-30"
                                disabled={app.status === 'Shortlisted'}
                                title="Shortlist Candidate"
                              >
                                <Check size={16} />
                              </button>
                              <button
                                onClick={() => updateAppStatus(app.id, 'Rejected')}
                                className="p-2 hover:bg-red-50 text-red-600 rounded-xl transition-colors border border-transparent hover:border-red-100/50 disabled:opacity-30"
                                disabled={app.status === 'Rejected'}
                                title="Reject Candidate"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              </div>
              </>
            ) : null}
          </TeacherDirectory>
        )}

        {/* Active Tab: Contact Queries / Joined Students */}`;
content = content.replace(teachersRegex, replacementTeachers);

const queriesRegex = /\{\/\* Active Tab: Contact Queries \/ Joined Students \*\/\}\s*\{activeTab === 'queries' && \([\s\S]*?\{\/\* Question Bank Tab \*\/\}/m;

const replacementQueries = `{/* Active Tab: Contact Queries / Joined Students */}
        {activeTab === 'queries' && (
          <StudentDirectory
            joinedStudents={joinedStudents}
            setJoinedStudents={setJoinedStudents}
            onInvite={() => setIsInviteModalOpen(true)}
            activeSubTab={studentSubTab}
            setActiveSubTab={setStudentSubTab}
          >
            {studentSubTab === 'queries' && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex gap-2">
                    {['All', 'Pending', 'Resolved'].map((status) => (
                      <button
                        key={status}
                        onClick={() => setQueryFilter(status)}
                        className={\`px-4 py-2 rounded-xl text-xs font-bold border transition-all \${
                          queryFilter === status 
                            ? 'bg-slate-950 text-white border-slate-950 shadow-sm' 
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }\`}
                      >
                        {status} Queries
                      </button>
                    ))}
                  </div>
                  
                  {/* Reset seed button */}
                  <button 
                    onClick={() => {
                      localStorage.removeItem('contact_queries');
                      localStorage.setItem('contact_queries', JSON.stringify(defaultQueries));
                      setQueries(defaultQueries);
                    }}
                    className="w-fit px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <RefreshCw size={12} />
                    <span>Reset Seed Data</span>
                  </button>
                </div>

            {/* Queries Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredQueries.length === 0 ? (
                <div className="bg-white border border-slate-100 p-10 text-center text-slate-400 font-semibold rounded-3xl md:col-span-2">
                  No inquiries found.
                </div>
              ) : (
                filteredQueries.map((q) => (
                  <div 
                    key={q.id} 
                    onClick={() => setSelectedQuery(q)}
                    className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition-all hover:scale-[1.01] cursor-pointer"
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-slate-900">{q.fullName}</h4>
                          <span className="text-xs text-slate-400 font-medium">{q.email} • {q.phone}</span>
                        </div>
                        <span className={\`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider \${
                          q.status === 'Resolved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100 animate-pulse'
                        }\`}>
                          {q.status}
                        </span>
                      </div>
                      
                      <p className="whitespace-pre-wrap text-slate-600 text-[13.5px] leading-relaxed italic bg-slate-50/50 p-4 border border-slate-100/50 rounded-2xl line-clamp-3 overflow-hidden">
                        "{q.message}"
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-50 text-[11px] font-bold text-slate-400">
                      <span>Received: {q.date}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleQueryStatus(q.id);
                        }}
                        className={\`px-3 py-1.5 rounded-xl border flex items-center gap-1 transition-all \${
                          q.status === 'Resolved' 
                            ? 'bg-red-50 hover:bg-red-100 text-red-600 border-red-100' 
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border-emerald-100'
                        }\`}
                      >
                        <Check size={12} />
                        <span>Mark as {q.status === 'Resolved' ? 'Pending' : 'Resolved'}</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            </>
            )}
          </StudentDirectory>
        )}

        {/* Question Bank Tab */}`;
content = content.replace(queriesRegex, replacementQueries);
fs.writeFileSync('src/components/AdminDashboard.jsx', content);
console.log('AdminDashboard updated');
