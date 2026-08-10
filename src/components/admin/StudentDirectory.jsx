import React, { useState } from 'react';
import { db } from '../../firebase';
import { doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { 
  Search, 
  ChevronDown, 
  Eye, 
  Edit, 
  Trash2, 
  Users, 
  UserCheck, 
  Clock, 
  ShieldCheck, 
  MailPlus,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  RotateCcw
} from 'lucide-react';

const StudentDirectory = ({ 
  joinedStudents, 
  setJoinedStudents, 
  onInvite,
  activeSubTab,
  setActiveSubTab,
  children
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const studentsPerPage = 10;

  // Enhance existing students with mock data for the premium view
  const enhancedStudents = joinedStudents.map(student => ({
    ...student,
    department: student.department || ['Computer Science', 'Mechanical Engineering', 'Electronics', 'Civil Engineering'][Math.floor(Math.random() * 4)],
    year: student.year || ['1st Year', '2nd Year', '3rd Year', '4th Year'][Math.floor(Math.random() * 4)],
    lastLogin: student.lastLogin || ['2 hours ago', '1 day ago', '3 days ago', 'Just now'][Math.floor(Math.random() * 4)],
  }));

  const filteredStudents = enhancedStudents.filter(student => 
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    student.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredStudents.length / studentsPerPage);
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * studentsPerPage, 
    currentPage * studentsPerPage
  );

  const handleDeleteStudent = async (studentId) => {
    if (window.confirm("Are you sure you want to delete this student?")) {
      try {
        // Convert to string in case it's a numeric mock ID (1, 2, 3...)
        const idString = String(studentId);
        await deleteDoc(doc(db, 'joined_students', idString));
        setJoinedStudents(joinedStudents.filter(s => s.id !== studentId));
      } catch (error) {
        console.error("Error deleting student:", error);
        alert("Failed to delete student from the database.");
      }
    }
  };

  return (
    <div className="bg-[#F8FAFC] min-h-full rounded-[2rem] px-8 pb-8 pt-0 relative overflow-hidden" style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(37, 99, 235, 0.03) 0%, transparent 70%)' }}>
      
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10 relative z-10">
        <div>
          <h2 className="text-[36px] font-bold text-[#0F172A] tracking-tight leading-tight font-sans">
            Student Directory
          </h2>
          <p className="text-[#64748B] text-[15px] font-medium mt-1">
            Manage enrolled students and support inquiries across all departments.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-white/60 backdrop-blur-md border border-[#EEF2F7] p-1.5 rounded-2xl shadow-sm">
            <button 
              onClick={() => setActiveSubTab('joined')}
              className={`px-4 py-2 rounded-xl text-[14px] font-semibold transition-all duration-300 whitespace-nowrap ${activeSubTab === 'joined' ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md' : 'text-[#64748B] hover:text-[#0F172A]'}`}
            >
              Enrolled Students
            </button>
            <button 
              onClick={() => setActiveSubTab('queries')}
              className={`px-4 py-2 rounded-xl text-[14px] font-semibold transition-all duration-300 whitespace-nowrap ${activeSubTab === 'queries' ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md' : 'text-[#64748B] hover:text-[#0F172A]'}`}
            >
              Support Queries
            </button>
          </div>

          <button 
            onClick={onInvite}
            className="bg-gradient-to-r from-[#2563EB] to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white px-5 py-2.5 rounded-[16px] text-[15px] font-semibold shadow-[0_4px_14px_rgba(37,99,235,0.25)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.4)] hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2 whitespace-nowrap"
          >
            <MailPlus size={18} strokeWidth={2.5} />
            <span>Invite Student</span>
          </button>
        </div>
      </div>

      {activeSubTab === 'joined' ? (
        <div className="space-y-8 relative z-10">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Students */}
            <div className="bg-white rounded-[22px] p-6 border border-[#EEF2F7] shadow-[0_10px_28px_rgba(15,23,42,0.04)] hover:-translate-y-1 transition-transform duration-300 flex flex-col justify-between h-[130px]">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 text-[#64748B] mb-2">
                    <span className="text-[13px] font-medium">Total Students</span>
                  </div>
                  <h3 className="text-[32px] font-bold text-[#0F172A] leading-none">
                    {enhancedStudents.length > 0 ? enhancedStudents.length : 542}
                  </h3>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center text-[#2563EB]">
                  <Users size={24} strokeWidth={2} />
                </div>
              </div>
            </div>

            {/* Active Students */}
            <div className="bg-white rounded-[22px] p-6 border border-[#EEF2F7] shadow-[0_10px_28px_rgba(15,23,42,0.04)] hover:-translate-y-1 transition-transform duration-300 flex flex-col justify-between h-[130px]">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 text-[#64748B] mb-2">
                    <span className="text-[13px] font-medium">Active Students</span>
                  </div>
                  <h3 className="text-[32px] font-bold text-[#0F172A] leading-none">
                    {enhancedStudents.filter(s => s.status === 'Active').length > 0 ? enhancedStudents.filter(s => s.status === 'Active').length : 489}
                  </h3>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center text-[#10B981]">
                  <UserCheck size={24} strokeWidth={2} />
                </div>
              </div>
            </div>

            {/* Pending Approval */}
            <div className="bg-white rounded-[22px] p-6 border border-[#EEF2F7] shadow-[0_10px_28px_rgba(15,23,42,0.04)] hover:-translate-y-1 transition-transform duration-300 flex flex-col justify-between h-[130px]">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 text-[#64748B] mb-2">
                    <span className="text-[13px] font-medium">Pending Approval</span>
                  </div>
                  <h3 className="text-[32px] font-bold text-[#0F172A] leading-none">
                    18
                  </h3>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center text-[#F59E0B]">
                  <Clock size={24} strokeWidth={2} />
                </div>
              </div>
            </div>

            {/* Verified Students */}
            <div className="bg-white rounded-[22px] p-6 border border-[#EEF2F7] shadow-[0_10px_28px_rgba(15,23,42,0.04)] hover:-translate-y-1 transition-transform duration-300 flex flex-col justify-between h-[130px]">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 text-[#64748B] mb-2">
                    <span className="text-[13px] font-medium">Verified Students</span>
                  </div>
                  <h3 className="text-[32px] font-bold text-[#0F172A] leading-none">
                    94%
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
                placeholder="Search students by name, email or ID..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="w-full h-[48px] pl-12 pr-6 bg-white border border-[#EEF2F7] rounded-[14px] text-[14px] text-[#0F172A] placeholder:text-[#94A3B8] shadow-[0_4px_12px_rgba(15,23,42,0.02)] outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 transition-all"
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {['Department', 'Year', 'Status', 'Joined Date', 'Sort By'].map((filter) => (
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

          {/* Student Table */}
          <div className="bg-white rounded-[24px] border border-[#EEF2F7] shadow-[0_12px_30px_rgba(15,23,42,0.05)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="border-b border-[#EEF2F7]">
                    <th className="py-5 px-6 text-[14px] font-medium text-[#64748B]">Student</th>
                    <th className="py-5 px-6 text-[14px] font-medium text-[#64748B]">Department</th>
                    <th className="py-5 px-6 text-[14px] font-medium text-[#64748B]">Year</th>
                    <th className="py-5 px-6 text-[14px] font-medium text-[#64748B]">Tier</th>
                    <th className="py-5 px-6 text-[14px] font-medium text-[#64748B]">Status</th>
                    <th className="py-5 px-6 text-[14px] font-medium text-[#64748B]">Joined Date</th>
                    <th className="py-5 px-6 text-[14px] font-medium text-[#64748B]">Last Login</th>
                    <th className="py-5 px-6 text-[14px] font-medium text-[#64748B] text-center w-[160px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF2F7]/60">
                  {paginatedStudents.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-16 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                            <Search className="text-slate-300" size={32} />
                          </div>
                          <h4 className="text-[16px] font-semibold text-[#0F172A] mb-1">No students found</h4>
                          <p className="text-[14px] text-[#64748B]">Try adjusting your search or filters.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedStudents.map((student) => (
                      <tr 
                        key={student.id} 
                        className="group h-[82px] hover:bg-[#F8FAFF] transition-colors duration-200"
                      >
                        <td className="px-6">
                          <div className="flex items-center gap-4">
                            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-100 to-blue-50 text-blue-600 font-bold flex items-center justify-center shrink-0 border border-blue-100 group-hover:scale-105 transition-transform">
                              {student.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-semibold text-[16px] text-[#0F172A] tracking-tight">{student.name}</span>
                              <span className="text-[13px] text-[#64748B] font-medium">{student.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6">
                          <span className="text-[14px] text-[#475569] font-medium">{student.department}</span>
                        </td>
                        <td className="px-6">
                          <span className="text-[14px] text-[#475569] font-medium">{student.year}</span>
                        </td>
                        <td className="px-6">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-bold tracking-wide ${
                            student.isPro 
                              ? 'bg-gradient-to-r from-amber-100 to-amber-50 text-amber-700 border border-amber-200 shadow-sm' 
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}>
                            {student.isPro ? '✨ PRO' : 'Normal'}
                          </span>
                        </td>
                        <td className="px-6">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-[12px] font-semibold tracking-wide ${
                            student.status === 'Active' 
                              ? 'bg-gradient-to-r from-emerald-50 to-emerald-100/50 text-[#10B981] border border-emerald-100' 
                              : 'bg-gradient-to-r from-slate-50 to-slate-100/50 text-[#64748B] border border-slate-200'
                          }`}>
                            {student.status === 'Active' && <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] mr-1.5 animate-pulse"></span>}
                            {student.status}
                          </span>
                        </td>
                        <td className="px-6">
                          <span className="text-[14px] text-[#475569] font-medium">{student.joinedDate}</span>
                        </td>
                        <td className="px-6">
                          <span className="text-[14px] text-[#64748B] font-medium">{student.lastLogin}</span>
                        </td>
                        <td className="px-6 text-center relative">
                          <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <button onClick={() => setSelectedStudent(student)} className="p-2 text-[#64748B] hover:text-[#2563EB] hover:bg-blue-50 rounded-[10px] transition-colors" title="View Details">
                              <Eye size={18} />
                            </button>
                            <button 
                              onClick={async () => {
                                if (window.confirm(`Are you sure you want to ${student.isPro ? 'downgrade' : 'upgrade'} ${student.name}?`)) {
                                  try {
                                    const updateData = { isPro: !student.isPro };
                                    if (student.isPro) {
                                      updateData.purchasedBundles = [];
                                    }
                                    await updateDoc(doc(db, 'joined_students', String(student.id)), updateData);
                                    setJoinedStudents(joinedStudents.map(s => 
                                      s.id === student.id ? { ...s, isPro: !student.isPro, ...(student.isPro ? { purchasedBundles: [] } : {}) } : s
                                    ));
                                  } catch (error) {
                                    console.error('Error updating tier:', error);
                                    alert(`Failed to update student tier. Error: ${error.message}`);
                                  }
                                }
                              }}
                              className={`p-2 rounded-[10px] transition-colors ${student.isPro ? 'text-amber-600 hover:bg-amber-50' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`} 
                              title={student.isPro ? "Downgrade to Normal" : "Upgrade to Pro"}
                            >
                              <ShieldCheck size={18} />
                            </button>
                            <button className="p-2 text-[#64748B] hover:text-amber-500 hover:bg-amber-50 rounded-[10px] transition-colors" title="Edit Student">
                              <Edit size={18} />
                            </button>
                            <button 
                              onClick={() => handleDeleteStudent(student.id)}
                              className="p-2 text-[#64748B] hover:text-red-500 hover:bg-red-50 rounded-[10px] transition-colors" title="Delete Student"
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
                  Showing <strong className="text-[#0F172A] font-semibold">{filteredStudents.length === 0 ? 0 : (currentPage - 1) * studentsPerPage + 1}</strong> to <strong className="text-[#0F172A] font-semibold">{Math.min(currentPage * studentsPerPage, filteredStudents.length)}</strong> of <strong className="text-[#0F172A] font-semibold">{filteredStudents.length}</strong> students
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
        <div className="relative z-10">
          {children}
        </div>
      )}

      {/* Student Details Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setSelectedStudent(null)}>
          <div className="bg-white rounded-[24px] w-full max-w-lg shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-[#EEF2F7] flex justify-between items-center">
              <h3 className="text-[20px] font-bold text-[#0F172A]">Student Details</h3>
              <button onClick={() => setSelectedStudent(null)} className="text-[#64748B] hover:text-[#0F172A] transition-colors bg-slate-100 hover:bg-slate-200 p-2 rounded-full">
                <X size={20} />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="flex items-center gap-5">
                <div className="w-[72px] h-[72px] rounded-full bg-gradient-to-br from-blue-100 to-blue-50 text-[#2563EB] border border-blue-100 font-bold text-[28px] flex items-center justify-center shrink-0 shadow-sm">
                  {selectedStudent.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-[22px] font-bold text-[#0F172A] leading-tight">{selectedStudent.name}</h4>
                  <p className="text-[15px] font-medium text-[#64748B] mt-1">{selectedStudent.email}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#EEF2F7]">
                <div className="bg-[#F8FAFC] p-4 rounded-[16px] border border-[#EEF2F7]">
                  <span className="text-[12px] font-bold text-[#94A3B8] uppercase tracking-wider">Department</span>
                  <p className="font-semibold text-[#0F172A] mt-1.5 text-[15px]">{selectedStudent.department}</p>
                </div>
                <div className="bg-[#F8FAFC] p-4 rounded-[16px] border border-[#EEF2F7]">
                  <span className="text-[12px] font-bold text-[#94A3B8] uppercase tracking-wider">Year</span>
                  <p className="font-semibold text-[#0F172A] mt-1.5 text-[15px]">{selectedStudent.year}</p>
                </div>
                <div className="bg-[#F8FAFC] p-4 rounded-[16px] border border-[#EEF2F7]">
                  <span className="text-[12px] font-bold text-[#94A3B8] uppercase tracking-wider">Status</span>
                  <p className="font-semibold text-[#0F172A] mt-1.5 text-[15px]">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-semibold ${selectedStudent.status === 'Active' ? 'bg-emerald-100 text-[#10B981]' : 'bg-slate-200 text-[#64748B]'}`}>
                      {selectedStudent.status}
                    </span>
                  </p>
                </div>
                <div className="bg-[#F8FAFC] p-4 rounded-[16px] border border-[#EEF2F7]">
                  <span className="text-[12px] font-bold text-[#94A3B8] uppercase tracking-wider">Joined</span>
                  <p className="font-semibold text-[#0F172A] mt-1.5 text-[15px]">{selectedStudent.joinedDate}</p>
                </div>
              </div>
            </div>
            <div className="p-6 bg-[#F8FAFC] border-t border-[#EEF2F7] flex justify-end">
              <button onClick={() => setSelectedStudent(null)} className="px-6 py-2.5 bg-white border border-[#E5E7EB] hover:bg-slate-50 hover:text-[#0F172A] text-[#64748B] font-semibold rounded-[14px] transition-colors shadow-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDirectory;
