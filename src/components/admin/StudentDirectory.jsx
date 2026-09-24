import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { doc, deleteDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
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
  RotateCcw,
  Package,
  Crown,
  Star
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

const YEAR_OPTIONS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Graduated'];

const StudentDirectory = ({
  joinedStudents,
  setJoinedStudents,
  onInvite,
  activeSubTab,
  setActiveSubTab,
  children
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [bundles, setBundles] = useState([]);
  const [editingStudent, setEditingStudent] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', department: '', collegeName: '', yearOfStudy: '', cgpa: '', batch: '', location: '', skills: '' });
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const studentsPerPage = 10;

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

  // Pull the RAW (unmocked) record so we never pre-fill the edit form with the
  // random placeholder department/year this component uses for display when a
  // real field is missing — saving those as real data would corrupt the record.
  const openEditStudent = (student) => {
    const raw = joinedStudents.find(s => String(s.id) === String(student.id)) || student;
    setEditForm({
      name: raw.name || '',
      department: raw.department || '',
      collegeName: raw.collegeName || '',
      yearOfStudy: raw.yearOfStudy || '',
      cgpa: raw.cgpa || '',
      batch: raw.batch || '',
      location: raw.location || '',
      skills: Array.isArray(raw.skills) ? raw.skills.join(', ') : ''
    });
    setEditingStudent(raw);
  };

  const handleSaveStudentEdit = async (e) => {
    e.preventDefault();
    if (!editingStudent) return;
    setIsSavingEdit(true);
    try {
      const updates = {
        name: editForm.name.trim(),
        department: editForm.department,
        collegeName: editForm.collegeName.trim(),
        yearOfStudy: editForm.yearOfStudy,
        cgpa: String(editForm.cgpa).trim(),
        batch: editForm.batch.trim(),
        location: editForm.location.trim(),
        skills: editForm.skills.split(',').map(sk => sk.trim()).filter(Boolean)
      };
      await updateDoc(doc(db, 'joined_students', String(editingStudent.id)), updates);
      setJoinedStudents(joinedStudents.map(s =>
        String(s.id) === String(editingStudent.id) ? { ...s, ...updates } : s
      ));
      setEditingStudent(null);
    } catch (err) {
      console.error('Failed to update student', err);
      alert('Failed to update student. Please try again.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  useEffect(() => {
    const fetchBundles = async () => {
      try {
        const bSnapshot = await getDocs(collection(db, 'course_bundles'));
        const bData = bSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setBundles(bData);
      } catch (error) {
        console.error("Error fetching bundles:", error);
      }
    };
    fetchBundles();
  }, []);

  // Enhance existing students with mock data deterministically
  const enhancedStudents = React.useMemo(() => {
    return joinedStudents.map((student, idx) => {
      const seed = (student.id ? String(student.id).length : 0) + idx;
      return {
        ...student,
        department: student.department || ['Computer Science', 'Mechanical Engineering', 'Electronics', 'Civil Engineering'][seed % 4],
        college: student.collegeName || '',
        lastLogin: student.lastLogin || null,
        status: student.status || ['Active', 'Pending', 'Inactive'][seed % 3]
      };
    });
  }, [joinedStudents]);

  const filteredStudents = enhancedStudents.filter(student => {
    const searchLow = searchQuery.toLowerCase();
    const nameLow = (student.name || '').toLowerCase();
    const emailLow = (student.email || '').toLowerCase();
    
    const matchesSearch = nameLow.includes(searchLow) || emailLow.includes(searchLow);
    
    const deptLow = (student.department || '').toLowerCase();
    const filterDeptLow = filterDepartment.toLowerCase();
    const matchesDept = filterDepartment ? deptLow === filterDeptLow || deptLow.includes(filterDeptLow) || filterDeptLow.includes(deptLow) : true;
    
    const matchesYear = filterYear ? (student.college || '') === filterYear : true;
    
    const statusLow = (student.status || '').toLowerCase();
    const filterStatusLow = filterStatus.toLowerCase();
    const matchesStatus = filterStatus ? statusLow === filterStatusLow || statusLow.includes(filterStatusLow) : true;
    
    return matchesSearch && matchesDept && matchesYear && matchesStatus;
  }).sort((a, b) => {
    // Pro users first, then students with bundles, then normal users (original order kept within each group)
    const rank = (st) => (st.purchasedBundles && st.purchasedBundles.length > 0 ? 1 : st.isPro ? 0 : 2);
    return rank(a) - rank(b);
  });

  const totalPages = Math.ceil(filteredStudents.length / studentsPerPage);
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * studentsPerPage, 
    currentPage * studentsPerPage
  );

  const [confirmDialog, setConfirmDialog] = useState(null);

  const executeDeleteStudent = async (studentId) => {
    try {
      // Convert to string in case it's a numeric mock ID (1, 2, 3...)
      const idString = String(studentId);
      await deleteDoc(doc(db, 'joined_students', idString));
      setJoinedStudents(joinedStudents.filter(s => s.id !== studentId));
    } catch (error) {
      console.error("Error deleting student:", error);
      alert("Failed to delete student from the database.");
    }
  };

  const handleDeleteStudent = (studentId) => {
    setConfirmDialog({
      message: "Are you sure you want to delete this student?",
      onConfirm: async () => {
        setConfirmDialog(null);
        await executeDeleteStudent(studentId);
      }
    });
  };

  return (
    <div className="bg-[#F8FAFC] min-h-full rounded-[2rem] px-4 sm:px-6 lg:px-8 pb-8 pt-0 relative overflow-hidden" style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(37, 99, 235, 0.03) 0%, transparent 70%)' }}>

      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10 relative z-10">
        <div>
          <h2 className="text-[26px] sm:text-[30px] lg:text-[36px] font-bold text-[#0F172A] tracking-tight leading-tight font-sans">
            Student Directory
          </h2>
          <p className="text-[#64748B] text-[15px] font-medium mt-1">
            Manage enrolled students and support inquiries across all departments.
          </p>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
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
              <select 
                value={filterDepartment} 
                onChange={e => { setFilterDepartment(e.target.value); setCurrentPage(1); }}
                className="h-[48px] px-4 bg-white border border-[#E5E7EB] hover:border-[#CBD5E1] rounded-[14px] flex items-center gap-2 text-[14px] font-medium text-[#475569] hover:text-[#0F172A] transition-colors shadow-sm focus:outline-none"
              >
                <option value="">All Departments</option>
                {Array.from(new Set(enhancedStudents.map(s => s.department).filter(Boolean))).sort().map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>

              <select 
                value={filterYear} 
                onChange={e => { setFilterYear(e.target.value); setCurrentPage(1); }}
                className="h-[48px] px-4 bg-white border border-[#E5E7EB] hover:border-[#CBD5E1] rounded-[14px] flex items-center gap-2 text-[14px] font-medium text-[#475569] hover:text-[#0F172A] transition-colors shadow-sm focus:outline-none"
              >
                <option value="">All Colleges</option>
                {Array.from(new Set(enhancedStudents.map(s => s.college).filter(Boolean))).sort().map(college => (
                  <option key={college} value={college}>{college}</option>
                ))}
              </select>

              <select 
                value={filterStatus} 
                onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                className="h-[48px] px-4 bg-white border border-[#E5E7EB] hover:border-[#CBD5E1] rounded-[14px] flex items-center gap-2 text-[14px] font-medium text-[#475569] hover:text-[#0F172A] transition-colors shadow-sm focus:outline-none"
              >
                <option value="">All Statuses</option>
                {Array.from(new Set(enhancedStudents.map(s => s.status).filter(Boolean))).sort().map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>

              <button 
                onClick={() => {
                  setSearchQuery('');
                  setFilterDepartment('');
                  setFilterYear('');
                  setFilterStatus('');
                  setCurrentPage(1);
                }}
                className="h-[48px] w-[48px] flex items-center justify-center ml-auto text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100 rounded-full transition-colors"
                title="Reset Filters"
              >
                <RotateCcw size={20} />
              </button>
            </div>
          </div>

          {/* Student Table */}
          <div className="bg-white rounded-[24px] border border-[#EEF2F7] shadow-[0_12px_30px_rgba(15,23,42,0.05)] overflow-hidden">
            <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="border-b border-[#EEF2F7]">
                    <th className="py-5 px-4 text-[14px] font-bold text-[#0B1220]">Student</th>
                    <th className="py-5 px-4 text-[14px] font-bold text-[#0B1220]">Department</th>
                    <th className="py-5 px-4 text-[14px] font-bold text-[#0B1220]">College</th>
                    <th className="py-5 px-4 text-[14px] font-bold text-[#0B1220]">Email</th>
                    <th className="py-5 px-4 text-[14px] font-bold text-[#0B1220]">Status</th>
                    <th className="py-5 px-4 text-[14px] font-bold text-[#0B1220]">Joined Date</th>
                    <th className="py-5 px-4 text-[14px] font-bold text-[#0B1220] text-center w-[160px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF2F7]/60">
                  {paginatedStudents.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-16 text-center">
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
                        <td className="px-4">
                          <div className="flex items-center gap-4">
                            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-100 to-blue-50 text-blue-600 font-bold flex items-center justify-center shrink-0 border border-blue-100 group-hover:scale-105 transition-transform">
                              <span className="text-[20px] leading-none">{getTier(student).icon}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="font-semibold text-[16px] text-[#0F172A] tracking-tight">{student.name}</span>
                              <TierPill tier={getTier(student)} />

                            </div>
                          </div>
                        </td>
                        <td className="px-4">
                          <span className="text-[14px] text-[#475569] font-medium">{student.department}</span>
                        </td>
                        <td className="px-4">
                          <span className="text-[14px] text-[#475569] font-medium block max-w-[240px] truncate" title={student.college}>{student.college || '—'}</span>
                        </td>
                        <td className="px-4">
                          <span className="text-[14px] text-[#475569] font-medium">{student.email}</span>
                        </td>
                        <td className="px-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-[12px] font-semibold tracking-wide ${
                            student.status === 'Active' 
                              ? 'bg-gradient-to-r from-emerald-50 to-emerald-100/50 text-[#10B981] border border-emerald-100' 
                              : 'bg-gradient-to-r from-slate-50 to-slate-100/50 text-[#64748B] border border-slate-200'
                          }`}>
                            {student.status === 'Active' && <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] mr-1.5 animate-pulse"></span>}
                            {student.status}
                          </span>
                        </td>
                        <td className="px-4">
                          <span className="text-[14px] text-[#475569] font-medium">{student.joinedDate}</span>
                        </td>
                        <td className="px-4 text-center relative">
                          <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <button onClick={() => setSelectedStudent(student)} className="p-2 text-[#64748B] hover:text-[#2563EB] hover:bg-blue-50 rounded-[10px] transition-colors" title="View Details">
                              <Eye size={18} />
                            </button>
                            <button 
                              onClick={() => {
                                setConfirmDialog({
                                  message: `Are you sure you want to ${student.isPro ? 'downgrade' : 'upgrade'} ${student.name}?`,
                                  onConfirm: async () => {
                                    setConfirmDialog(null);
                                    try {
                                      const updateData = { isPro: !student.isPro };
                                      await updateDoc(doc(db, 'joined_students', String(student.id)), updateData);
                                      setJoinedStudents(joinedStudents.map(s => 
                                        s.id === student.id ? { ...s, isPro: !s.isPro } : s
                                      ));
                                    } catch (err) {
                                      console.error("Failed to update status", err);
                                      alert("Failed to update student status");
                                    }
                                  }
                                });
                              }}
                              className={`p-2 rounded-[10px] transition-colors ${student.isPro ? 'text-amber-500 hover:bg-amber-50' : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50'}`}
                              title={student.isPro ? "Downgrade from Premium" : "Upgrade to Premium"}
                            >
                              <ShieldCheck size={18} />
                            </button>
                            <button onClick={() => openEditStudent(student)} className="p-2 text-[#64748B] hover:text-amber-500 hover:bg-amber-50 rounded-[10px] transition-colors" title="Edit Student">
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
              <div className="px-4 sm:px-6 py-4 border-t border-[#EEF2F7] flex flex-col sm:flex-row items-center justify-between gap-3 bg-white/50">
                <span className="text-[13px] sm:text-[14px] text-[#64748B] font-medium text-center sm:text-left">
                  Showing <strong className="text-[#0F172A] font-semibold">{filteredStudents.length === 0 ? 0 : (currentPage - 1) * studentsPerPage + 1}</strong> to <strong className="text-[#0F172A] font-semibold">{Math.min(currentPage * studentsPerPage, filteredStudents.length)}</strong> of <strong className="text-[#0F172A] font-semibold">{filteredStudents.length}</strong> students
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
        <div className="relative z-10">
          {children}
        </div>
      )}

      {/* Student Details Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setSelectedStudent(null)}>
          <div className="bg-white rounded-[24px] w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-[#EEF2F7] flex justify-between items-center shrink-0">
              <h3 className="text-[20px] font-bold text-[#0F172A]">Student Details</h3>
              <button onClick={() => setSelectedStudent(null)} className="text-[#64748B] hover:text-[#0F172A] transition-colors bg-slate-100 hover:bg-slate-200 p-2 rounded-full">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 sm:p-8 space-y-6 overflow-y-auto">
              <div className="flex items-center gap-5">
                <div className="w-[72px] h-[72px] rounded-full bg-gradient-to-br from-blue-100 to-blue-50 text-[#2563EB] border border-blue-100 font-bold text-[28px] flex items-center justify-center shrink-0 shadow-sm">
                  {getTier(selectedStudent).icon}
                </div>
                <div className="min-w-0">
                  <h4 className="text-[22px] font-bold text-[#0F172A] leading-tight truncate">{selectedStudent.name}</h4>
                  <p className="text-[15px] font-medium text-[#64748B] mt-1 truncate">{selectedStudent.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#EEF2F7]">
                <div className="bg-[#F8FAFC] p-4 rounded-[16px] border border-[#EEF2F7]">
                  <span className="text-[12px] font-bold text-[#94A3B8] uppercase tracking-wider">Department</span>
                  <p className="font-semibold text-[#0F172A] mt-1.5 text-[15px]">{selectedStudent.department}</p>
                </div>
                {[
                  { label: 'College', value: selectedStudent.collegeName },
                  { label: 'CGPA', value: selectedStudent.cgpa },
                  { label: 'Batch', value: selectedStudent.batch },
                  { label: 'Location', value: selectedStudent.location }
                ].map(f => (
                  <div key={f.label} className="bg-[#F8FAFC] p-4 rounded-[16px] border border-[#EEF2F7]">
                    <span className="text-[12px] font-bold text-[#94A3B8] uppercase tracking-wider">{f.label}</span>
                    <p className="font-semibold text-[#0F172A] mt-1.5 text-[15px]">{f.value || '—'}</p>
                  </div>
                ))}
                <div className="bg-[#F8FAFC] p-4 rounded-[16px] border border-[#EEF2F7] sm:col-span-2">
                  <span className="text-[12px] font-bold text-[#94A3B8] uppercase tracking-wider">Skills</span>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {Array.isArray(selectedStudent.skills) && selectedStudent.skills.length > 0
                      ? selectedStudent.skills.map(sk => (
                          <span key={sk} className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-[12px] font-semibold">{sk}</span>
                        ))
                      : <span className="font-semibold text-[#0F172A] text-[15px]">—</span>}
                  </div>
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
              
              <div className="pt-6 border-t border-[#EEF2F7]">
                <div className="flex items-center justify-between mb-4">
                  <h5 className="text-[12px] font-bold text-[#94A3B8] uppercase tracking-wider">Purchased Bundles</h5>
                  {(selectedStudent.purchasedBundles || []).length > 0 && (
                    <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{(selectedStudent.purchasedBundles || []).length}</span>
                  )}
                </div>
                
                {(!selectedStudent.purchasedBundles || selectedStudent.purchasedBundles.length === 0) ? (
                  <p className="text-[13px] font-medium text-[#64748B] mb-4">No active bundles for this student.</p>
                ) : (
                  <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full mb-4">
                    {selectedStudent.purchasedBundles.map((bundle, idx) => {
                      const b = bundles.find(bItem => bItem.id === bundle);
                      const bundleName = b ? b.name : (typeof bundle === 'string' ? bundle : (bundle.title || bundle.name || `Bundle ${idx + 1}`));
                      
                      return (
                        <div key={idx} className="flex items-center justify-between bg-white border border-[#EEF2F7] p-3 rounded-[12px] transition-all hover:border-blue-200 hover:shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                              <Package size={16} />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[14px] font-semibold text-[#0F172A] leading-tight">{bundleName}</span>
                              <span className="text-[11px] font-medium text-[#64748B]">Active Plan</span>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setConfirmDialog({
                                message: `Are you sure you want to cancel ${bundleName} for ${selectedStudent.name}?`,
                                onConfirm: async () => {
                                  setConfirmDialog(null);
                                  try {
                                    const updatedBundles = selectedStudent.purchasedBundles.filter((_, i) => i !== idx);
                                    const isPro = updatedBundles.length > 0 ? !!selectedStudent.isPro : false;
                                    
                                    await updateDoc(doc(db, 'joined_students', String(selectedStudent.id)), { 
                                      purchasedBundles: updatedBundles,
                                      isPro: isPro
                                    });
                                    
                                    const updatedStudent = { ...selectedStudent, purchasedBundles: updatedBundles, isPro: isPro };
                                    setSelectedStudent(updatedStudent);
                                    setJoinedStudents(joinedStudents.map(s => 
                                      s.id === selectedStudent.id ? updatedStudent : s
                                    ));
                                  } catch (error) {
                                    console.error('Error canceling bundle:', error);
                                    alert(`Failed to cancel bundle. Error: ${error.message}`);
                                  }
                                }
                              });
                            }}
                            className="p-1.5 text-[#94A3B8] hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Cancel Bundle"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                <div className="mt-2">
                  <select 
                    className="w-full border border-[#EEF2F7] rounded-[12px] px-4 py-2.5 text-[14px] font-medium text-[#0F172A] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-[#F8FAFC]"
                    onChange={async (e) => {
                      const bundleId = e.target.value;
                      if (!bundleId) return;
                      try {
                        const updatedBundles = [...(selectedStudent.purchasedBundles || []), bundleId];
                        await updateDoc(doc(db, 'joined_students', String(selectedStudent.id)), { 
                          purchasedBundles: updatedBundles,
                          isPro: true
                        });
                        const updatedStudent = { ...selectedStudent, purchasedBundles: updatedBundles, isPro: true };
                        setSelectedStudent(updatedStudent);
                        setJoinedStudents(joinedStudents.map(s => s.id === selectedStudent.id ? updatedStudent : s));
                      } catch (error) {
                        console.error('Error adding bundle:', error);
                        alert(`Failed to add bundle. Error: ${error.message}`);
                      }
                      e.target.value = '';
                    }}
                  >
                    <option value="">+ Assign New Bundle...</option>
                    {bundles.filter(b => !(selectedStudent.purchasedBundles || []).includes(b.id)).map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="p-6 bg-[#F8FAFC] border-t border-[#EEF2F7] flex justify-end shrink-0">
              <button onClick={() => setSelectedStudent(null)} className="px-6 py-2.5 bg-white border border-[#E5E7EB] hover:bg-slate-50 hover:text-[#0F172A] text-[#64748B] font-semibold rounded-[14px] transition-colors shadow-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {editingStudent && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => !isSavingEdit && setEditingStudent(null)}>
          <div className="bg-white rounded-[24px] w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-[#EEF2F7] flex justify-between items-center shrink-0">
              <h3 className="text-[20px] font-bold text-[#0F172A]">Edit Student</h3>
              <button onClick={() => !isSavingEdit && setEditingStudent(null)} className="text-[#64748B] hover:text-[#0F172A] transition-colors bg-slate-100 hover:bg-slate-200 p-2 rounded-full">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveStudentEdit} className="p-5 sm:p-8 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Student Name</label>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">College Name</label>
                  <input
                    type="text"
                    value={editForm.collegeName}
                    onChange={(e) => setEditForm({ ...editForm, collegeName: e.target.value })}
                    placeholder="e.g. NIT Trichy"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Year of Study</label>
                  <select
                    value={editForm.yearOfStudy}
                    onChange={(e) => setEditForm({ ...editForm, yearOfStudy: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold text-slate-800 bg-white"
                  >
                    <option value="">Select Year...</option>
                    {YEAR_OPTIONS.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { key: 'cgpa', label: 'CGPA', placeholder: 'e.g. 8.84' },
                  { key: 'batch', label: 'Batch', placeholder: 'e.g. 2023 - 2027' },
                  { key: 'location', label: 'Location', placeholder: 'e.g. Coimbatore' }
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">{f.label}</label>
                    <input
                      type="text"
                      value={editForm[f.key]}
                      onChange={(e) => setEditForm({ ...editForm, [f.key]: e.target.value })}
                      placeholder={f.placeholder}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold text-slate-800"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Skills</label>
                <input
                  type="text"
                  value={editForm.skills}
                  onChange={(e) => setEditForm({ ...editForm, skills: e.target.value })}
                  placeholder="Comma separated, e.g. Python, React, MySQL"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                <input
                  type="email"
                  disabled
                  value={editingStudent.email}
                  className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-500 cursor-not-allowed"
                />
                <p className="text-[11px] text-slate-400 font-medium mt-1.5">Email is tied to their login and can't be changed here.</p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
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

      {/* Generic Confirmation Modal */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center font-sans text-black p-4">
          <div className="bg-white rounded-md shadow-xl w-full max-w-sm overflow-hidden">
            <div className="bg-red-600 text-white px-4 py-3 font-bold text-lg border-b">Confirm Action</div>
            <div className="p-6">
              <p className="text-gray-800 text-base mb-6">{confirmDialog.message}</p>
              
              <div className="flex justify-end gap-3">
                <button onClick={() => setConfirmDialog(null)} className="px-4 py-2 border border-gray-300 rounded text-gray-700 font-bold hover:bg-gray-100 transition">Cancel</button>
                <button onClick={confirmDialog.onConfirm} className="px-4 py-2 bg-red-600 text-white font-bold rounded hover:bg-red-700 transition">Confirm</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Membership tier: Prime = has purchased bundles, Elite = Pro without bundles, Foundation = everyone else
const getTier = (st) => {
  const count = (st.purchasedBundles || []).length;
  if (count > 0) return { key: 'prime', label: 'Prime', icon: '⭐', text: 'Prime' };
  if (st.isPro) return { key: 'elite', label: 'Elite', icon: '👑', text: 'Elite' };
  return { key: 'foundation', label: 'Foundation', icon: '🌱', text: 'Foundation' };
};
// Foundation icon: green sprout on a brown soil mound
const SproutOnSoil = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="tier-pill__icon">
    <path d="M12 14c0-4-2.5-6.5-7-6.5 0 4 2.5 6.5 7 6.5z" fill="#22a05a" />
    <path d="M12 12c0-3.5 2.2-6 6.5-6 0 3.8-2.4 6-6.5 6z" fill="#3ec877" />
    <path d="M3 21c0-3.5 4-6 9-6s9 2.5 9 6z" fill="#7a3f14" />
  </svg>
);

const TIER_ICONS = { elite: Crown, prime: Star, foundation: null };

// Glossy pill badge (styles: .tier-pill in index.css)
const TierPill = ({ tier }) => {
  const Icon = TIER_ICONS[tier.key];
  return (
    <span className={`tier-pill tier-pill--${tier.key} mt-1 w-fit`}>
      {Icon
        ? <Icon size={14} fill="currentColor" strokeWidth={tier.key === 'elite' ? 1.5 : 0} className="tier-pill__icon" />
        : <SproutOnSoil size={16} />}
      <span>{tier.text}</span>
    </span>
  );
};

export default StudentDirectory;
