import React, { useState } from 'react';
import {
  Search,
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
  Trash2,
  RotateCcw,
  X
} from 'lucide-react';

const DEPARTMENT_OPTIONS = [
  'Computer Science (CSE)',
  'Electronics (ECE)',
  'Mechanical (ME)',
  'Civil (CE)',
  'Electrical (EE)',
  'Data Science & AI (DS)',
  'Production & Industrial Engg (PI)',
  'Instrumentation Engg (IN)',
  'Biotechnology (BT)',
  'Chemical Engineering (CH)',
  'Biomedical Engineering (BM)',
  'Physics (PH)',
  'Architecture & Planning (AR)',
  'Agricultural Engineering (AG)',
  'Metallurgical Engineering (MT)',
  'Environmental Science (ES)',
  'Life Sciences (XL)',
  'Aerospace Engineering (AE)',
  'Other'
];

const TeacherDirectory = ({
  invitedTeachers,
  deleteTeacher,
  updateTeacher,
  onInvite,
  activeSubTab,
  setActiveSubTab,
  children
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', department: '', qualification: '', experience: '' });
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterQualification, setFilterQualification] = useState('');
  const [filterExperience, setFilterExperience] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState('');
  const teachersPerPage = 10;

  const resetTeacherFilters = () => {
    setSearchQuery('');
    setFilterDepartment('');
    setFilterQualification('');
    setFilterExperience('');
    setFilterStatus('');
    setSortBy('');
    setCurrentPage(1);
  };

  // Pull the RAW record so we never pre-fill the edit form with the "Not set" /
  // "Unknown" display placeholders this component uses when a real field is
  // missing — saving those as-is would write the placeholder text as real data.
  const openEditTeacher = (teacher) => {
    const raw = invitedTeachers.find(t => t.id === teacher.id) || teacher;
    setEditForm({
      name: raw.name || '',
      department: raw.department || '',
      qualification: raw.qualification || '',
      experience: raw.experience || ''
    });
    setEditingTeacher(raw);
  };

  const handleSaveTeacherEdit = async (e) => {
    e.preventDefault();
    if (!editingTeacher) return;
    setIsSavingEdit(true);
    const ok = await updateTeacher(editingTeacher.id, {
      name: editForm.name.trim(),
      department: editForm.department,
      qualification: editForm.qualification.trim(),
      experience: editForm.experience.trim()
    });
    setIsSavingEdit(false);
    if (ok) setEditingTeacher(null);
  };

  const formatLastLogin = (lastLogin) => {
    if (!lastLogin) return 'Never logged in';
    const date = lastLogin.toDate ? lastLogin.toDate() : new Date(lastLogin);
    const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) { const m = Math.floor(diffSec / 60); return `${m} min${m === 1 ? '' : 's'} ago`; }
    if (diffSec < 86400) { const h = Math.floor(diffSec / 3600); return `${h} hour${h === 1 ? '' : 's'} ago`; }
    if (diffSec < 172800) return 'Yesterday';
    if (diffSec < 604800) { const d = Math.floor(diffSec / 86400); return `${d} days ago`; }
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const enhancedTeachers = invitedTeachers.map(teacher => ({
    ...teacher,
    experience: teacher.experience || 'Not set',
    invitedDate: teacher.invitedDate || 'Unknown',
    lastLogin: formatLastLogin(teacher.lastLogin),
  }));

  const filteredTeachers = enhancedTeachers
    .filter(teacher => {
      const matchesSearch = teacher.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        teacher.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        teacher.department.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDept = !filterDepartment || teacher.department === filterDepartment;
      const matchesQualification = !filterQualification || teacher.qualification === filterQualification;
      const matchesExperience = !filterExperience || teacher.experience === filterExperience;
      const matchesStatus = !filterStatus || teacher.status === filterStatus;
      return matchesSearch && matchesDept && matchesQualification && matchesExperience && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
      if (sortBy === 'status') return a.status.localeCompare(b.status);
      return 0;
    });

  const totalPages = Math.ceil(filteredTeachers.length / teachersPerPage);
  const paginatedTeachers = filteredTeachers.slice(
    (currentPage - 1) * teachersPerPage, 
    currentPage * teachersPerPage
  );

  return (
    <div className="bg-[#F8FAFC] min-h-full rounded-[2rem] px-4 sm:px-6 lg:px-8 pb-8 pt-0 relative overflow-hidden" style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(79, 70, 229, 0.04) 0%, transparent 70%)' }}>
      
      {/* Background Texture Overlay */}
      <div className="absolute inset-0 z-0 opacity-40 mix-blend-overlay pointer-events-none" style={{ backgroundImage: 'radial-gradient(#94A3B8 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10 relative z-10 pt-8">
        <div>
          <h2 className="text-[26px] sm:text-[30px] lg:text-[36px] font-bold text-[#0F172A] tracking-tight leading-tight font-sans">
            Teacher Directory
          </h2>
          <p className="text-[#64748B] text-[15px] font-medium mt-1">
            Manage faculty members and recruitment applications across all departments.
          </p>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex bg-white/80 backdrop-blur-md border border-[#EEF2F7] p-1.5 rounded-2xl shadow-sm">
            <button 
              onClick={() => setActiveSubTab('faculty')}
              className={`px-4 py-2 rounded-xl text-[14px] font-semibold transition-all duration-300 whitespace-nowrap ${activeSubTab === 'faculty' ? 'bg-gradient-to-r from-[#4F46E5] to-[#2563EB] text-white shadow-md' : 'text-[#64748B] hover:text-[#0F172A]'}`}
            >
              Active Faculty
            </button>
            <button 
              onClick={() => setActiveSubTab('recruitment')}
              className={`px-4 py-2 rounded-xl text-[14px] font-semibold transition-all duration-300 whitespace-nowrap ${activeSubTab === 'recruitment' ? 'bg-gradient-to-r from-[#4F46E5] to-[#2563EB] text-white shadow-md' : 'text-[#64748B] hover:text-[#0F172A]'}`}
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
              <select
                value={filterDepartment}
                onChange={e => { setFilterDepartment(e.target.value); setCurrentPage(1); }}
                className="h-[48px] px-4 bg-white border border-[#E5E7EB] hover:border-[#CBD5E1] rounded-[14px] text-[14px] font-medium text-[#475569] hover:text-[#0F172A] transition-colors shadow-sm focus:outline-none"
              >
                <option value="">All Departments</option>
                {Array.from(new Set(enhancedTeachers.map(t => t.department).filter(Boolean))).sort().map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>

              <select
                value={filterQualification}
                onChange={e => { setFilterQualification(e.target.value); setCurrentPage(1); }}
                className="h-[48px] px-4 bg-white border border-[#E5E7EB] hover:border-[#CBD5E1] rounded-[14px] text-[14px] font-medium text-[#475569] hover:text-[#0F172A] transition-colors shadow-sm focus:outline-none"
              >
                <option value="">All Qualifications</option>
                {Array.from(new Set(enhancedTeachers.map(t => t.qualification).filter(Boolean))).sort().map(q => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </select>

              <select
                value={filterExperience}
                onChange={e => { setFilterExperience(e.target.value); setCurrentPage(1); }}
                className="h-[48px] px-4 bg-white border border-[#E5E7EB] hover:border-[#CBD5E1] rounded-[14px] text-[14px] font-medium text-[#475569] hover:text-[#0F172A] transition-colors shadow-sm focus:outline-none"
              >
                <option value="">All Experience</option>
                {Array.from(new Set(enhancedTeachers.map(t => t.experience).filter(Boolean))).sort().map(exp => (
                  <option key={exp} value={exp}>{exp}</option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                className="h-[48px] px-4 bg-white border border-[#E5E7EB] hover:border-[#CBD5E1] rounded-[14px] text-[14px] font-medium text-[#475569] hover:text-[#0F172A] transition-colors shadow-sm focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="Accepted">Active</option>
                <option value="Invited">Invited</option>
              </select>

              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="h-[48px] px-4 bg-white border border-[#E5E7EB] hover:border-[#CBD5E1] rounded-[14px] text-[14px] font-medium text-[#475569] hover:text-[#0F172A] transition-colors shadow-sm focus:outline-none"
              >
                <option value="">Sort By</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="status">Status</option>
              </select>

              <button onClick={resetTeacherFilters} className="h-[48px] w-[48px] flex items-center justify-center ml-auto text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100 rounded-full transition-colors" title="Reset Filters">
                <RotateCcw size={20} />
              </button>
            </div>
          </div>

          {/* Faculty Table */}
          <div className="bg-white rounded-[24px] border border-[#EEF2F7] shadow-[0_12px_30px_rgba(15,23,42,0.05)] overflow-hidden">
            <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="border-b border-[#EEF2F7]">
                    <th className="py-5 px-4 text-[14px] font-bold text-[#0B1220]">Faculty</th>
                    <th className="py-5 px-4 text-[14px] font-bold text-[#0B1220]">Department</th>
                    <th className="py-5 px-4 text-[14px] font-bold text-[#0B1220]">Qualification</th>
                    <th className="py-5 px-4 text-[14px] font-bold text-[#0B1220]">Experience</th>
                    <th className="py-5 px-4 text-[14px] font-bold text-[#0B1220]">Status</th>
                    <th className="py-5 px-4 text-[14px] font-bold text-[#0B1220]">Invited Date</th>
                    <th className="py-5 px-4 text-[14px] font-bold text-[#0B1220]">Last Login</th>
                    <th className="py-5 px-4 text-[14px] font-bold text-[#0B1220] text-center w-[160px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF2F7]/60">
                  {paginatedTeachers.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-16 text-center">
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
                        <td className="px-4">
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
                        <td className="px-4">
                          <span className="text-[14px] text-[#475569] font-medium">{teacher.department}</span>
                        </td>
                        <td className="px-4">
                          <span className="text-[14px] text-[#475569] font-medium">{teacher.qualification}</span>
                        </td>
                        <td className="px-4">
                          <span className="text-[14px] text-[#475569] font-medium">{teacher.experience}</span>
                        </td>
                        <td className="px-4">
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
                        <td className="px-4">
                          <span className="text-[14px] text-[#475569] font-medium">{teacher.invitedDate}</span>
                        </td>
                        <td className="px-4">
                          <span className="text-[14px] text-[#475569] font-medium">{teacher.lastLogin}</span>
                        </td>
                        <td className="px-4 text-center relative">
                          <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <button onClick={() => setSelectedTeacher(teacher)} className="p-2 text-[#64748B] hover:text-[#2563EB] hover:bg-blue-50 rounded-[10px] transition-colors" title="View Details">
                              <Eye size={18} />
                            </button>
                            <button onClick={() => openEditTeacher(teacher)} className="p-2 text-[#64748B] hover:text-amber-500 hover:bg-amber-50 rounded-[10px] transition-colors" title="Edit Faculty">
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
              <div className="px-4 sm:px-6 py-4 border-t border-[#EEF2F7] flex flex-col sm:flex-row items-center justify-between gap-3 bg-white/50">
                <span className="text-[13px] sm:text-[14px] text-[#64748B] font-medium text-center sm:text-left">
                  Showing <strong className="text-[#0F172A] font-semibold">{filteredTeachers.length === 0 ? 0 : (currentPage - 1) * teachersPerPage + 1}</strong> to <strong className="text-[#0F172A] font-semibold">{Math.min(currentPage * teachersPerPage, filteredTeachers.length)}</strong> of <strong className="text-[#0F172A] font-semibold">{filteredTeachers.length}</strong> faculty members
                </span>
                <div className="flex items-center gap-2 flex-wrap justify-center">
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

      {/* Teacher Details Modal */}
      {selectedTeacher && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setSelectedTeacher(null)}>
          <div className="bg-white rounded-[24px] w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-[#EEF2F7] flex justify-between items-center shrink-0">
              <h3 className="text-[20px] font-bold text-[#0F172A]">Teacher Details</h3>
              <button onClick={() => setSelectedTeacher(null)} className="text-[#64748B] hover:text-[#0F172A] transition-colors bg-slate-100 hover:bg-slate-200 p-2 rounded-full">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 sm:p-8 space-y-6 overflow-y-auto">
              <div className="flex items-center gap-5">
                <div className="w-[72px] h-[72px] rounded-full bg-gradient-to-br from-indigo-100 to-indigo-50 text-indigo-700 border border-indigo-100 font-bold text-[28px] flex items-center justify-center shrink-0 shadow-sm">
                  {selectedTeacher.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h4 className="text-[22px] font-bold text-[#0F172A] leading-tight truncate">{selectedTeacher.name}</h4>
                  <p className="text-[15px] font-medium text-[#64748B] mt-1 truncate">{selectedTeacher.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#EEF2F7]">
                <div className="bg-[#F8FAFC] p-4 rounded-[16px] border border-[#EEF2F7]">
                  <span className="text-[12px] font-bold text-[#94A3B8] uppercase tracking-wider">Department</span>
                  <p className="font-semibold text-[#0F172A] mt-1.5 text-[15px]">{selectedTeacher.department}</p>
                </div>
                <div className="bg-[#F8FAFC] p-4 rounded-[16px] border border-[#EEF2F7]">
                  <span className="text-[12px] font-bold text-[#94A3B8] uppercase tracking-wider">Qualification</span>
                  <p className="font-semibold text-[#0F172A] mt-1.5 text-[15px]">{selectedTeacher.qualification || 'N/A'}</p>
                </div>
                <div className="bg-[#F8FAFC] p-4 rounded-[16px] border border-[#EEF2F7]">
                  <span className="text-[12px] font-bold text-[#94A3B8] uppercase tracking-wider">Experience</span>
                  <p className="font-semibold text-[#0F172A] mt-1.5 text-[15px]">{selectedTeacher.experience}</p>
                </div>
                <div className="bg-[#F8FAFC] p-4 rounded-[16px] border border-[#EEF2F7]">
                  <span className="text-[12px] font-bold text-[#94A3B8] uppercase tracking-wider">Status</span>
                  <p className="font-semibold text-[#0F172A] mt-1.5 text-[15px]">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-semibold ${selectedTeacher.status === 'Accepted' ? 'bg-emerald-100 text-[#10B981]' : 'bg-amber-100 text-[#F59E0B]'}`}>
                      {selectedTeacher.status === 'Accepted' ? 'Active' : 'Invited'}
                    </span>
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6 bg-[#F8FAFC] border-t border-[#EEF2F7] flex justify-end shrink-0">
              <button onClick={() => setSelectedTeacher(null)} className="px-6 py-2.5 bg-white border border-[#E5E7EB] hover:bg-slate-50 hover:text-[#0F172A] text-[#64748B] font-semibold rounded-[14px] transition-colors shadow-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Teacher Modal */}
      {editingTeacher && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => !isSavingEdit && setEditingTeacher(null)}>
          <div className="bg-white rounded-[24px] w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-[#EEF2F7] flex justify-between items-center shrink-0">
              <h3 className="text-[20px] font-bold text-[#0F172A]">Edit Faculty</h3>
              <button onClick={() => !isSavingEdit && setEditingTeacher(null)} className="text-[#64748B] hover:text-[#0F172A] transition-colors bg-slate-100 hover:bg-slate-200 p-2 rounded-full">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveTeacherEdit} className="p-5 sm:p-8 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Teacher Name</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Department</label>
                <select
                  required
                  value={editForm.department}
                  onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold text-slate-800 bg-white"
                >
                  <option value="">Select Department...</option>
                  {DEPARTMENT_OPTIONS.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Qualification</label>
                <input
                  type="text"
                  value={editForm.qualification}
                  onChange={(e) => setEditForm({ ...editForm, qualification: e.target.value })}
                  placeholder="e.g. Ph.D. in AI"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Experience</label>
                <input
                  type="text"
                  value={editForm.experience}
                  onChange={(e) => setEditForm({ ...editForm, experience: e.target.value })}
                  placeholder="e.g. 8 Years"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                <input
                  type="email"
                  disabled
                  value={editingTeacher.email}
                  className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-500 cursor-not-allowed"
                />
                <p className="text-[11px] text-slate-400 font-medium mt-1.5">Email is tied to their login and can't be changed here. Remove and re-invite the teacher to use a different email.</p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingTeacher(null)}
                  disabled={isSavingEdit}
                  className="px-6 py-2.5 bg-white border border-[#E5E7EB] hover:bg-slate-50 hover:text-[#0F172A] text-[#64748B] font-semibold rounded-[14px] transition-colors shadow-sm disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-6 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold rounded-[14px] transition-colors shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDirectory;
