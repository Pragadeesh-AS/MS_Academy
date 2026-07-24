import React, { useState } from 'react';
import { 
  Search, 
  ChevronDown, 
  Eye, 
  Edit, 
  MoreVertical, 
  Users, 
  UserCheck, 
  Clock, 
  ShieldCheck, 
  MailPlus,
  ChevronLeft,
  ChevronRight,
  Filter,
  Trash2,
  RotateCcw
} from 'lucide-react';

const TeacherDirectory = ({ 
  invitedTeachers, 
  deleteTeacher, 
  onInvite,
  activeSubTab,
  setActiveSubTab,
  children
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const teachersPerPage = 10;

  // Enhance existing teachers with mock data for the premium view
  const enhancedTeachers = invitedTeachers.map(teacher => ({
    ...teacher,
    experience: teacher.experience || ['5 Years', '8 Years', '12 Years', '15 Years', '3 Years'][Math.floor(Math.random() * 5)],
    joinedDate: teacher.joinedDate || ['10 Jan 2024', '15 Mar 2025', '22 Aug 2023', '05 Nov 2026'][Math.floor(Math.random() * 4)],
    lastLogin: teacher.lastLogin || ['2 hours ago', '1 day ago', '3 days ago', 'Just now'][Math.floor(Math.random() * 4)],
  }));

  const filteredTeachers = enhancedTeachers.filter(teacher => 
    teacher.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    teacher.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    teacher.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredTeachers.length / teachersPerPage);
  const paginatedTeachers = filteredTeachers.slice(
    (currentPage - 1) * teachersPerPage, 
    currentPage * teachersPerPage
  );

  return (
    <div className="bg-[#F8FAFC] min-h-full rounded-[2rem] px-8 pb-8 pt-0 relative overflow-hidden" style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(79, 70, 229, 0.04) 0%, transparent 70%)' }}>
      
      {/* Background Texture Overlay */}
      <div className="absolute inset-0 z-0 opacity-40 mix-blend-overlay pointer-events-none" style={{ backgroundImage: 'radial-gradient(#94A3B8 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10 relative z-10 pt-8">
        <div>
          <h2 className="text-[36px] font-bold text-[#0F172A] tracking-tight leading-tight font-sans">
            Teacher Directory
          </h2>
          <p className="text-[#64748B] text-[15px] font-medium mt-1">
            Manage faculty members and recruitment applications across all departments.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex bg-white/80 backdrop-blur-md border border-[#EEF2F7] p-1.5 rounded-2xl shadow-sm">
            <button 
              onClick={() => setActiveSubTab('faculty')}
              className={`px-5 py-2 rounded-xl text-[14px] font-semibold transition-all duration-300 ${activeSubTab === 'faculty' ? 'bg-gradient-to-r from-[#4F46E5] to-[#2563EB] text-white shadow-md' : 'text-[#64748B] hover:text-[#0F172A]'}`}
            >
              Active Faculty
            </button>
            <button 
              onClick={() => setActiveSubTab('recruitment')}
              className={`px-5 py-2 rounded-xl text-[14px] font-semibold transition-all duration-300 ${activeSubTab === 'recruitment' ? 'bg-gradient-to-r from-[#4F46E5] to-[#2563EB] text-white shadow-md' : 'text-[#64748B] hover:text-[#0F172A]'}`}
            >
              Recruitment
            </button>
          </div>

          <button 
            onClick={onInvite}
            className="bg-gradient-to-r from-[#4F46E5] to-[#2563EB] hover:from-[#4338CA] hover:to-[#1D4ED8] text-white px-5 py-2.5 rounded-[16px] text-[15px] font-semibold shadow-[0_4px_14px_rgba(79,70,229,0.3)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.45)] hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2 whitespace-nowrap"
          >
            <MailPlus size={18} strokeWidth={2.5} />
            <span>Invite Teacher</span>
          </button>
        </div>
      </div>

      {activeSubTab === 'faculty' ? (
        <div className="space-y-7 relative z-10">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-7">
            {/* Total Faculty */}
            <div className="bg-white rounded-[22px] p-6 border border-[#EEF2F7] shadow-[0_10px_28px_rgba(15,23,42,0.05)] hover:-translate-y-1 transition-transform duration-300 flex flex-col justify-between h-[130px]">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 text-[#64748B] mb-2">
                    <span className="text-[13px] font-medium">Total Faculty</span>
                  </div>
                  <h3 className="text-[34px] font-bold text-[#0F172A] leading-none">
                    {invitedTeachers.length > 0 ? invitedTeachers.length : 82}
                  </h3>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center text-[#2563EB]">
                  <Users size={24} strokeWidth={2} />
                </div>
              </div>
            </div>

            {/* Active Faculty */}
            <div className="bg-white rounded-[22px] p-6 border border-[#EEF2F7] shadow-[0_10px_28px_rgba(15,23,42,0.05)] hover:-translate-y-1 transition-transform duration-300 flex flex-col justify-between h-[130px]">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 text-[#64748B] mb-2">
                    <span className="text-[13px] font-medium">Active Faculty</span>
                  </div>
                  <h3 className="text-[34px] font-bold text-[#0F172A] leading-none">
                    {invitedTeachers.filter(t => t.status === 'Accepted').length > 0 ? invitedTeachers.filter(t => t.status === 'Accepted').length : 76}
                  </h3>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center text-[#10B981]">
                  <UserCheck size={24} strokeWidth={2} />
                </div>
              </div>
            </div>

            {/* Pending Approval */}
            <div className="bg-white rounded-[22px] p-6 border border-[#EEF2F7] shadow-[0_10px_28px_rgba(15,23,42,0.05)] hover:-translate-y-1 transition-transform duration-300 flex flex-col justify-between h-[130px]">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 text-[#64748B] mb-2">
                    <span className="text-[13px] font-medium">Pending Approval</span>
                  </div>
                  <h3 className="text-[34px] font-bold text-[#0F172A] leading-none">
                    {invitedTeachers.filter(t => t.status !== 'Accepted').length > 0 ? invitedTeachers.filter(t => t.status !== 'Accepted').length : 5}
                  </h3>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center text-[#F59E0B]">
                  <Clock size={24} strokeWidth={2} />
                </div>
              </div>
            </div>

            {/* Verified Faculty */}
            <div className="bg-white rounded-[22px] p-6 border border-[#EEF2F7] shadow-[0_10px_28px_rgba(15,23,42,0.05)] hover:-translate-y-1 transition-transform duration-300 flex flex-col justify-between h-[130px]">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 text-[#64748B] mb-2">
                    <span className="text-[13px] font-medium">Verified Faculty</span>
                  </div>
                  <h3 className="text-[34px] font-bold text-[#0F172A] leading-none">
                    96%
                  </h3>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center text-[#8B5CF6]">
                  <ShieldCheck size={24} strokeWidth={2} />
                </div>
              </div>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-col xl:flex-row xl:items-start gap-4">
            <div className="relative group flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B] group-focus-within:text-[#2563EB] transition-colors" size={20} />
              <input 
                type="text" 
                placeholder="Search faculty by name, email or employee ID..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="w-full h-[48px] pl-12 pr-6 bg-white border border-[#EEF2F7] rounded-[14px] text-[14px] text-[#0F172A] placeholder:text-[#94A3B8] shadow-sm outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 transition-all"
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {['Department', 'Qualification', 'Experience', 'Status', 'Sort By'].map((filter) => (
                <button key={filter} className="h-[48px] px-4 bg-white border border-[#E5E7EB] hover:border-[#CBD5E1] rounded-[14px] flex items-center gap-2 text-[14px] font-medium text-[#475569] hover:text-[#0F172A] transition-colors shadow-sm">
                  <Filter size={16} className="text-[#94A3B8]" />
                  <span>{filter}</span>
                  <ChevronDown size={16} className="text-[#94A3B8] ml-1" />
                </button>
              ))}
              <button className="h-[48px] w-[48px] flex items-center justify-center ml-auto text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100 rounded-full transition-colors">
                <RotateCcw size={20} />
              </button>
            </div>
          </div>

          {/* Faculty Table */}
          <div className="bg-white rounded-[24px] border border-[#EEF2F7] shadow-[0_12px_30px_rgba(15,23,42,0.05)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1050px]">
                <thead>
                  <tr className="border-b border-[#EEF2F7]">
                    <th className="py-5 px-6 text-[14px] font-medium text-[#64748B]">Faculty</th>
                    <th className="py-5 px-6 text-[14px] font-medium text-[#64748B]">Department</th>
                    <th className="py-5 px-6 text-[14px] font-medium text-[#64748B]">Qualification</th>
                    <th className="py-5 px-6 text-[14px] font-medium text-[#64748B]">Experience</th>
                    <th className="py-5 px-6 text-[14px] font-medium text-[#64748B]">Status</th>
                    <th className="py-5 px-6 text-[14px] font-medium text-[#64748B]">Joined Date</th>
                    <th className="py-5 px-6 text-[14px] font-medium text-[#64748B] text-center w-[160px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF2F7]/60">
                  {paginatedTeachers.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-16 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                            <Search className="text-slate-300" size={32} />
                          </div>
                          <h4 className="text-[16px] font-semibold text-[#0F172A] mb-1">No faculty found</h4>
                          <p className="text-[14px] text-[#64748B]">Try adjusting your search or filters.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedTeachers.map((teacher) => (
                      <tr 
                        key={teacher.id} 
                        className="group h-[84px] hover:bg-[#F8FAFF] hover:-translate-y-[1px] hover:shadow-[0_4px_12px_rgba(15,23,42,0.03)] transition-all duration-300 relative z-0 hover:z-10"
                      >
                        <td className="px-6">
                          <div className="flex items-center gap-4">
                            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-50 text-indigo-700 font-bold flex items-center justify-center shrink-0 border border-indigo-100 group-hover:scale-105 transition-transform">
                              {teacher.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-semibold text-[16px] text-[#0F172A] tracking-tight">{teacher.name}</span>
                              <span className="text-[13px] text-[#64748B] font-medium">{teacher.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6">
                          <span className="text-[14px] text-[#475569] font-medium">{teacher.department}</span>
                        </td>
                        <td className="px-6">
                          <span className="text-[14px] text-[#475569] font-medium">{teacher.qualification}</span>
                        </td>
                        <td className="px-6">
                          <span className="text-[14px] text-[#475569] font-medium">{teacher.experience}</span>
                        </td>
                        <td className="px-6">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-[12px] font-semibold tracking-wide ${
                            teacher.status === 'Accepted' 
                              ? 'bg-gradient-to-r from-emerald-50 to-emerald-100/50 text-[#10B981] border border-emerald-100' 
                              : 'bg-gradient-to-r from-amber-50 to-amber-100/50 text-[#F59E0B] border border-amber-100'
                          }`}>
                            {teacher.status === 'Accepted' ? (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] mr-1.5"></span>
                            ) : (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] mr-1.5 animate-pulse"></span>
                            )}
                            {teacher.status === 'Accepted' ? 'Active' : 'Invited'}
                          </span>
                        </td>
                        <td className="px-6">
                          <span className="text-[14px] text-[#475569] font-medium">{teacher.joinedDate}</span>
                        </td>
                        <td className="px-6 text-center relative">
                          <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <button className="p-2 text-[#64748B] hover:text-[#2563EB] hover:bg-blue-50 rounded-[10px] transition-colors" title="View Details">
                              <Eye size={18} />
                            </button>
                            <button className="p-2 text-[#64748B] hover:text-amber-500 hover:bg-amber-50 rounded-[10px] transition-colors" title="Edit Faculty">
                              <Edit size={18} />
                            </button>
                            <button 
                              onClick={() => deleteTeacher(teacher.id)}
                              className="p-2 text-[#64748B] hover:text-red-500 hover:bg-red-50 rounded-[10px] transition-colors" title="Remove Options"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {totalPages > 0 && (
              <div className="px-6 py-4 border-t border-[#EEF2F7] flex items-center justify-between bg-white/50">
                <span className="text-[14px] text-[#64748B] font-medium">
                  Showing <strong className="text-[#0F172A] font-semibold">{filteredTeachers.length === 0 ? 0 : (currentPage - 1) * teachersPerPage + 1}</strong> to <strong className="text-[#0F172A] font-semibold">{Math.min(currentPage * teachersPerPage, filteredTeachers.length)}</strong> of <strong className="text-[#0F172A] font-semibold">{filteredTeachers.length}</strong> faculty members
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="w-10 h-10 rounded-[12px] border border-[#E5E7EB] flex items-center justify-center text-[#64748B] hover:bg-slate-50 hover:text-[#0F172A] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`w-10 h-10 rounded-[12px] text-[14px] font-semibold transition-colors ${
                        currentPage === i + 1 
                          ? 'bg-[#2563EB] text-white shadow-[0_4px_12px_rgba(37,99,235,0.2)]' 
                          : 'border border-[#E5E7EB] text-[#475569] hover:bg-slate-50 hover:text-[#0F172A]'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}

                  <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="w-10 h-10 rounded-[12px] border border-[#E5E7EB] flex items-center justify-center text-[#64748B] hover:bg-slate-50 hover:text-[#0F172A] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="relative z-10 pt-4">
          {children}
        </div>
      )}
    </div>
  );
};

export default TeacherDirectory;
