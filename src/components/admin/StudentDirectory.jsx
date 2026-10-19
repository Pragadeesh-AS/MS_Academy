import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { doc, deleteDoc, updateDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
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
  Star,
  UsersRound,
  Pencil,
  FileSignature,
  Send,
  UserPlus,
  CalendarDays,
  Mail
} from 'lucide-react';
import AdmissionFormViewer from './AdmissionFormViewer';
import { needsAdmissionForm, isAdmissionFormExempt } from '../../utils/admissionForm';
import { tierKeyOf, fullBundleOf } from '../../utils/membership';
import { hasUnlimitedPractice } from '../../utils/practiceTests';
import StudentPracticeStats from './StudentPracticeStats';
import AdmissionFormsArchive from './AdmissionFormsArchive';
import { paletteFor } from '../../utils/departmentColors';

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
  'Statistics (ST)',
  'Other'
];

const YEAR_OPTIONS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Graduated'];

// Each group name always gets the same colour, so a group is easy to spot in the list
const GROUP_COLORS = [
  'bg-blue-50 text-blue-700 border-blue-200',
  'bg-emerald-50 text-emerald-700 border-emerald-200',
  'bg-violet-50 text-violet-700 border-violet-200',
  'bg-amber-50 text-amber-700 border-amber-200',
  'bg-rose-50 text-rose-700 border-rose-200',
  'bg-cyan-50 text-cyan-700 border-cyan-200',
  'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
  'bg-lime-50 text-lime-700 border-lime-200',
];
const groupColor = (name) => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return GROUP_COLORS[h % GROUP_COLORS.length];
};

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
  const [filterTier, setFilterTier] = useState(''); // '' | 'elite' | 'prime' | 'foundation'
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [viewingForm, setViewingForm] = useState(null); // student whose admission form is open
  const [detailTab, setDetailTab] = useState('overview'); // Student Details tab: overview | practice | bundles
  const [sendingForm, setSendingForm] = useState(false);

  // Sends the admission form to a student who skipped it (e.g. joined offline on instalments): the
  // portal stays locked for them until they fill it in. Cancelling the request unlocks it again.
  const setAdmissionFormRequested = async (student, requested) => {
    setSendingForm(true);
    try {
      const updates = { admissionFormRequested: requested, admissionFormRequestedAt: requested ? new Date().toISOString() : null };
      await updateDoc(doc(db, 'joined_students', String(student.id)), updates);
      const updatedStudent = { ...student, ...updates };
      setSelectedStudent(updatedStudent);
      setJoinedStudents(prev => prev.map(s => (s.id === student.id ? updatedStudent : s)));
    } catch (error) {
      console.error('Error updating admission form request:', error);
      alert(`Failed to ${requested ? 'send' : 'cancel'} the admission form. Error: ${error.message}`);
    } finally {
      setSendingForm(false);
    }
  };
  const [bundles, setBundles] = useState([]);
  const [editingStudent, setEditingStudent] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', department: '', collegeName: '', yearOfStudy: '', cgpa: '', batch: '', location: '', skills: '', groupName: '' });
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const studentsPerPage = 10;

  // --- Student groups: one named group per student, stored as `groupName` on joined_students
  const [filterGroup, setFilterGroup] = useState(''); // '' = all groups
  const [selectedIds, setSelectedIds] = useState([]);
  const [groupDialog, setGroupDialog] = useState(null); // { mode: 'assign' | 'rename', from? }
  const [groupInput, setGroupInput] = useState('');
  const [isSavingGroup, setIsSavingGroup] = useState(false);

  const groups = React.useMemo(() => {
    const counts = {};
    joinedStudents.forEach(s => {
      const g = (s.groupName || '').trim();
      if (g) counts[g] = (counts[g] || 0) + 1;
    });
    return Object.keys(counts).sort((a, b) => a.localeCompare(b)).map(name => ({ name, count: counts[name] }));
  }, [joinedStudents]);

  // Writes groupName for many students at once (Firestore batches cap at 500 writes)
  const saveGroupFor = async (ids, groupName) => {
    const value = (groupName || '').trim();
    for (let i = 0; i < ids.length; i += 450) {
      const batch = writeBatch(db);
      ids.slice(i, i + 450).forEach(id => batch.update(doc(db, 'joined_students', String(id)), { groupName: value }));
      await batch.commit();
    }
    const idSet = new Set(ids.map(String));
    setJoinedStudents(joinedStudents.map(s => (idSet.has(String(s.id)) ? { ...s, groupName: value } : s)));
  };

  const runGroupAction = async (action, successReset = true) => {
    setIsSavingGroup(true);
    try {
      await action();
      if (successReset) {
        setGroupDialog(null);
        setGroupInput('');
      }
    } catch (err) {
      console.error('Failed to update student groups', err);
      alert('Failed to update the group. Please try again.');
    }
    setIsSavingGroup(false);
  };

  const confirmGroupDialog = () => {
    const name = groupInput.trim();
    if (!name || !groupDialog) return;
    if (groupDialog.mode === 'assign') {
      runGroupAction(async () => {
        await saveGroupFor(selectedIds, name);
        setSelectedIds([]);
      });
    } else {
      const memberIds = joinedStudents.filter(s => (s.groupName || '').trim() === groupDialog.from).map(s => s.id);
      runGroupAction(async () => {
        await saveGroupFor(memberIds, name);
        if (filterGroup === groupDialog.from) setFilterGroup(name);
      });
    }
  };

  const removeSelectedFromGroup = () => runGroupAction(async () => {
    await saveGroupFor(selectedIds, '');
    setSelectedIds([]);
  }, false);

  const disbandGroup = (name) => {
    const memberIds = joinedStudents.filter(s => (s.groupName || '').trim() === name).map(s => s.id);
    setConfirmDialog({
      message: `Disband the group "${name}"? Its ${memberIds.length} student(s) stay in the directory, just without a group.`,
      onConfirm: async () => {
        setConfirmDialog(null);
        await runGroupAction(async () => {
          await saveGroupFor(memberIds, '');
          setFilterGroup('');
        }, false);
      }
    });
  };

  const toggleSelected = (id) => setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

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

  // Pull the RAW record so the edit form is only ever pre-filled with values
  // actually stored in Firestore.
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
      skills: Array.isArray(raw.skills) ? raw.skills.join(', ') : '',
      groupName: raw.groupName || ''
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
        skills: editForm.skills.split(',').map(sk => sk.trim()).filter(Boolean),
        groupName: editForm.groupName.trim()
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

  // Normalise stored records for display; missing fields stay empty rather than being invented.
  // A student who has logged in is 'Active'; one who was only invited stays 'Invited'.
  const enhancedStudents = React.useMemo(() => {
    return joinedStudents.map((student) => ({
      ...student,
      department: student.department || '',
      college: student.collegeName || '',
      lastLogin: student.lastLogin || null,
      status: student.status || (student.lastLogin ? 'Active' : 'Invited')
    }));
  }, [joinedStudents]);

  // Recently Joined tab: newest students first. joinedAt is the exact time (saved for new students);
  // older records only have the day ("Oct 04, 2026"), so same-day students keep their list order.
  useEffect(() => { setDetailTab('overview'); }, [selectedStudent?.id]);

  const RECENT_COUNT = 5;
  const joinedMs = (st) => st.joinedAt?.toMillis?.() ?? (Date.parse(st.joinedDate) || 0);
  const recentStudents = [...enhancedStudents].sort((a, b) => joinedMs(b) - joinedMs(a)).slice(0, RECENT_COUNT);
  const joinedAgo = (st) => {
    const ms = joinedMs(st);
    if (!ms) return 'Date unknown';
    const startOfDay = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
    const days = Math.round((startOfDay(Date.now()) - startOfDay(ms)) / 86400000);
    return days <= 0 ? 'Today' : days === 1 ? 'Yesterday' : `${days} days ago`;
  };

  const activeCount = enhancedStudents.filter(s => s.status === 'Active').length;
  const invitedCount = enhancedStudents.filter(s => s.status === 'Invited').length;
  const loggedInPct = enhancedStudents.length > 0 ? Math.round((enhancedStudents.filter(s => s.lastLogin).length / enhancedStudents.length) * 100) : 0;

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

    const studentGroup = (student.groupName || '').trim();
    const matchesGroup = !filterGroup || studentGroup === filterGroup;

    const matchesTier = !filterTier || getTier(student, bundles).key === filterTier;

    return matchesSearch && matchesDept && matchesYear && matchesStatus && matchesGroup && matchesTier;
  }).sort((a, b) => {
    // Elite first, then Prime, then Foundation (original order kept within each group)
    const rank = (st) => ({ elite: 0, prime: 1, foundation: 2 })[getTier(st, bundles).key];
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

      {/* Page Header: title and Invite on one row, the tabs on their own row below */}
      <div className="mb-8 relative z-10 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-[26px] sm:text-[30px] lg:text-[36px] font-bold text-[#0F172A] tracking-tight leading-tight font-sans">
              Student Directory
            </h2>
            <p className="text-[#64748B] text-[15px] font-medium mt-1">
              Manage enrolled students and support inquiries across all departments.
            </p>
          </div>

          <button 
            onClick={onInvite}
            className="self-start sm:self-center shrink-0 bg-gradient-to-r from-[#2563EB] to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white px-5 py-2.5 rounded-[16px] text-[15px] font-semibold shadow-[0_4px_14px_rgba(37,99,235,0.25)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.4)] hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2 whitespace-nowrap"
          >
            <MailPlus size={18} strokeWidth={2.5} />
            <span>Invite Student</span>
          </button>
        </div>

        <div className="flex w-full sm:w-fit max-w-full overflow-x-auto bg-white/70 backdrop-blur-md border border-[#EEF2F7] p-1.5 rounded-2xl shadow-sm gap-1">
          <button 
            onClick={() => setActiveSubTab('joined')}
            className={`px-4 py-2 rounded-xl text-[14px] font-semibold transition-all duration-300 whitespace-nowrap flex items-center justify-center gap-1.5 ${activeSubTab === 'joined' ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md' : 'text-[#64748B] hover:text-[#0F172A] hover:bg-white/80'}`}
          >
            <Users size={15} /> Enrolled Students
          </button>
          <button
            onClick={() => setActiveSubTab('recent')}
            className={`px-4 py-2 rounded-xl text-[14px] font-semibold transition-all duration-300 whitespace-nowrap flex items-center justify-center gap-1.5 ${activeSubTab === 'recent' ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md' : 'text-[#64748B] hover:text-[#0F172A] hover:bg-white/80'}`}
          >
            <UserPlus size={15} /> Recently Joined
          </button>
          <button
            onClick={() => setActiveSubTab('forms')}
            className={`px-4 py-2 rounded-xl text-[14px] font-semibold transition-all duration-300 whitespace-nowrap flex items-center justify-center gap-1.5 ${activeSubTab === 'forms' ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md' : 'text-[#64748B] hover:text-[#0F172A] hover:bg-white/80'}`}
          >
            <FileSignature size={15} /> Admission Forms
          </button>
          <button 
            onClick={() => setActiveSubTab('queries')}
            className={`px-4 py-2 rounded-xl text-[14px] font-semibold transition-all duration-300 whitespace-nowrap flex items-center justify-center gap-1.5 ${activeSubTab === 'queries' ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md' : 'text-[#64748B] hover:text-[#0F172A] hover:bg-white/80'}`}
          >
            <Mail size={15} /> Support Queries
          </button>
        </div>
      </div>

      {activeSubTab === 'forms' ? (
        <AdmissionFormsArchive joinedStudents={joinedStudents} onView={setViewingForm} />
      ) : activeSubTab === 'recent' ? (
        <div className="space-y-5 relative z-10">
          <div className="flex items-center gap-3">
            <span className="text-[13px] font-[800] text-slate-400 uppercase tracking-widest">Last {RECENT_COUNT} students to join</span>
            <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent"></div>
            <span className="text-[12px] font-bold text-slate-400">Newest first</span>
          </div>
          {recentStudents.length === 0 ? (
            <div className="bg-white rounded-[22px] border border-[#EEF2F7] p-12 text-center text-slate-500 font-semibold">No students have joined yet.</div>
          ) : (
            <div className="space-y-3">
              {recentStudents.map((student, i) => (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => setSelectedStudent(student)}
                  className="w-full text-left bg-white rounded-[20px] border border-[#EEF2F7] p-4 sm:p-5 shadow-[0_10px_28px_rgba(15,23,42,0.04)] hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(37,99,235,0.10)] hover:border-blue-200 transition-all duration-300 flex items-center gap-4 group"
                >
                  <span className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 text-[13px] font-black flex items-center justify-center shrink-0">{i + 1}</span>
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-black text-[16px] flex items-center justify-center shrink-0 shadow-md">
                    {(student.name || student.email || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-[15px] text-[#0F172A] truncate">{student.name || 'Unnamed student'}</span>
                      <TierPill tier={getTier(student, bundles)} />
                    </div>
                    <p className="text-[13px] font-medium text-[#64748B] truncate mt-0.5">{student.email}{student.department ? ` · ${student.department}` : ''}</p>
                  </div>
                  <div className="text-right shrink-0 hidden sm:block">
                    <div className={`text-[13px] font-bold ${joinedAgo(student) === 'Today' ? 'text-emerald-600' : 'text-[#0F172A]'}`}>{joinedAgo(student)}</div>
                    <div className="text-[12px] font-medium text-[#94A3B8] flex items-center justify-end gap-1 mt-0.5"><CalendarDays size={12} /> {student.joinedDate || '-'}</div>
                  </div>
                  <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      ) : activeSubTab === 'joined' ? (
        <div className="space-y-8 relative z-10">
          {/* Overview: the numbers at a glance, plus how the students split across memberships */}
          {(() => {
            const tierCounts = { elite: 0, prime: 0, foundation: 0 };
            enhancedStudents.forEach(st => { tierCounts[getTier(st, bundles).key] += 1; });
            const stats = [
              { label: 'Total Students', value: enhancedStudents.length, icon: Users, tile: 'bg-blue-50/70 border-blue-100', iconBg: 'from-blue-500 to-indigo-600' },
              { label: 'Active', value: activeCount, icon: UserCheck, tile: 'bg-emerald-50/70 border-emerald-100', iconBg: 'from-emerald-500 to-teal-600' },
              { label: 'Invited (not logged in)', value: invitedCount, icon: Clock, tile: 'bg-amber-50/70 border-amber-100', iconBg: 'from-amber-500 to-orange-600' },
              { label: 'Logged in', value: `${loggedInPct}%`, icon: ShieldCheck, tile: 'bg-violet-50/70 border-violet-100', iconBg: 'from-violet-500 to-purple-600' },
            ];
            const tiers = [
              { key: 'elite', label: 'Elite', icon: '👑', chip: 'bg-amber-50 border-amber-200 text-amber-800' },
              { key: 'prime', label: 'Prime', icon: '⭐', chip: 'bg-indigo-50 border-indigo-200 text-indigo-800' },
              { key: 'foundation', label: 'Foundation', icon: '🌱', chip: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
            ];
            return (
              <div className="bg-white rounded-[24px] border border-[#EEF2F7] shadow-[0_10px_28px_rgba(15,23,42,0.04)] p-4 sm:p-5">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {stats.map(st => (
                    <div key={st.label} className={`rounded-[18px] border px-4 py-3.5 flex items-center gap-3 ${st.tile}`}>
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${st.iconBg} text-white flex items-center justify-center shrink-0 shadow-md`}><st.icon size={20} /></div>
                      <div className="min-w-0">
                        <div className="text-[24px] font-bold text-[#0F172A] leading-none">{st.value}</div>
                        <div className="text-[12.5px] font-medium text-[#64748B] mt-1 truncate">{st.label}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-[#EEF2F7] flex flex-wrap items-center gap-3">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-[#94A3B8] mr-1">Membership</span>
                  {tiers.map(t => (
                    <span key={t.key} className={`inline-flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-full border text-[13px] font-semibold ${t.chip}`}>
                      <span className="text-[14px] leading-none">{t.icon}</span>
                      {t.label}
                      <span className="text-[15px] font-bold text-[#0F172A]">{tierCounts[t.key]}</span>
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Control panel: search, filters and groups together */}
          <div className="@container bg-white rounded-[24px] border border-[#EEF2F7] shadow-[0_10px_28px_rgba(15,23,42,0.04)] p-4 sm:p-5 space-y-4">
          {/* Search & Filter Toolbar - one row when the panel is wide, search on top with the filters below otherwise */}
          <div className="grid grid-cols-2 @3xl:grid-cols-4 @5xl:grid-cols-[minmax(240px,1.5fr)_repeat(4,minmax(0,1fr))] items-center gap-3">
            <div className="relative group col-span-2 @3xl:col-span-4 @5xl:col-span-1 min-w-0">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B] group-focus-within:text-[#2563EB] transition-colors" size={20} />
              <input 
                type="text" 
                placeholder="Search students by name, email or ID..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="w-full h-[48px] pl-12 pr-4 bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#CBD5E1] rounded-[14px] text-[14px] font-medium outline-none focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 transition-all text-[#0F172A] placeholder:text-[#94A3B8] placeholder:font-normal"
              />
            </div>
            
            <div className="contents">
              <select 
                value={filterDepartment} 
                onChange={e => { setFilterDepartment(e.target.value); setCurrentPage(1); }}
                className="h-[48px] w-full min-w-0 truncate pl-4 pr-8 bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#CBD5E1] rounded-[14px] text-[14px] font-medium outline-none focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 transition-all text-[#475569] hover:text-[#0F172A] cursor-pointer"
              >
                <option value="">All Departments</option>
                {Array.from(new Set(enhancedStudents.map(s => s.department).filter(Boolean))).sort().map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>

              <select 
                value={filterYear} 
                onChange={e => { setFilterYear(e.target.value); setCurrentPage(1); }}
                className="h-[48px] w-full min-w-0 truncate pl-4 pr-8 bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#CBD5E1] rounded-[14px] text-[14px] font-medium outline-none focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 transition-all text-[#475569] hover:text-[#0F172A] cursor-pointer"
              >
                <option value="">All Colleges</option>
                {Array.from(new Set(enhancedStudents.map(s => s.college).filter(Boolean))).sort().map(college => (
                  <option key={college} value={college}>{college}</option>
                ))}
              </select>

              <select
                value={filterTier}
                onChange={e => { setFilterTier(e.target.value); setCurrentPage(1); }}
                className="h-[48px] w-full min-w-0 truncate pl-4 pr-8 bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#CBD5E1] rounded-[14px] text-[14px] font-medium outline-none focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 transition-all text-[#475569] hover:text-[#0F172A] cursor-pointer"
                title="Filter by membership"
              >
                <option value="">All Memberships</option>
                {['elite', 'prime', 'foundation'].map(key => {
                  const count = enhancedStudents.filter(st => getTier(st, bundles).key === key).length;
                  const label = { elite: '👑 Elite', prime: '⭐ Prime', foundation: '🌱 Foundation' }[key];
                  return <option key={key} value={key}>{label} ({count})</option>;
                })}
              </select>

              <select 
                value={filterStatus} 
                onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                className="h-[48px] w-full min-w-0 truncate pl-4 pr-8 bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#CBD5E1] rounded-[14px] text-[14px] font-medium outline-none focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 transition-all text-[#475569] hover:text-[#0F172A] cursor-pointer"
              >
                <option value="">All Statuses</option>
                {Array.from(new Set(enhancedStudents.map(s => s.status).filter(Boolean))).sort().map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>

            </div>
          </div>

          {/* Student Groups - click a group to show just its students */}
          <div className="pt-4 border-t border-[#EEF2F7]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 text-[13px] font-bold text-[#0F172A] mr-1">
                <UsersRound size={16} className="text-[#2563EB]" /> Groups
              </span>
              <button
                onClick={() => { setFilterGroup(''); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-full text-[12.5px] font-semibold border transition-colors ${!filterGroup ? 'bg-[#2563EB] text-white border-[#2563EB]' : 'bg-white text-[#475569] border-[#E5E7EB] hover:border-[#CBD5E1]'}`}
              >
                All ({joinedStudents.length})
              </button>
              {groups.map(g => (
                <button
                  key={g.name}
                  onClick={() => { setFilterGroup(filterGroup === g.name ? '' : g.name); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-full text-[12.5px] font-semibold border transition-all ${groupColor(g.name)} ${filterGroup === g.name ? 'ring-2 ring-offset-1 ring-[#2563EB]' : 'hover:brightness-95'}`}
                >
                  {g.name} ({g.count})
                </button>
              ))}
              {groups.length === 0 && (
                <span className="text-[12.5px] text-[#94A3B8] font-medium">Tick students in the list below and use "Add to group" to create one.</span>
              )}
              <div className="flex flex-wrap items-center gap-2 ml-auto">
              {filterGroup && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setGroupInput(filterGroup); setGroupDialog({ mode: 'rename', from: filterGroup }); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-semibold text-[#475569] hover:text-[#0F172A] hover:bg-slate-100 transition-colors"
                  >
                    <Pencil size={14} /> Rename group
                  </button>
                  <button
                    onClick={() => disbandGroup(filterGroup)}
                    disabled={isSavingGroup}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-semibold text-red-600 hover:bg-red-50 transition-colors disabled:opacity-60"
                  >
                    <Trash2 size={14} /> Disband group
                  </button>
                </div>
              )}
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilterDepartment('');
                    setFilterYear('');
                    setFilterStatus('');
                    setFilterTier('');
                    setCurrentPage(1);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-semibold text-[#475569] hover:text-[#0F172A] hover:bg-slate-100 transition-colors"
                  title="Reset Filters"
                >
                  <RotateCcw size={14} /> Reset filters
                </button>
              </div>
            </div>
          </div>
          </div>

          {/* Bulk actions for the ticked students */}
          {selectedIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3">
              <span className="text-[13px] font-bold text-blue-800">{selectedIds.length} selected</span>
              <div className="flex flex-wrap items-center gap-2 ml-auto">
                <button
                  onClick={() => { setGroupInput(''); setGroupDialog({ mode: 'assign' }); }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-bold bg-[#2563EB] hover:bg-[#1D4ED8] text-white transition-colors shadow-sm"
                >
                  <UsersRound size={15} /> Add to group...
                </button>
                <button
                  onClick={removeSelectedFromGroup}
                  disabled={isSavingGroup}
                  className="px-4 py-2 rounded-xl text-[13px] font-bold bg-white border border-[#E5E7EB] text-[#475569] hover:text-[#0F172A] transition-colors disabled:opacity-60"
                >
                  Remove from group
                </button>
                <button
                  onClick={() => setSelectedIds([])}
                  className="px-3 py-2 rounded-xl text-[13px] font-bold text-[#64748B] hover:text-[#0F172A] hover:bg-white transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Student Table - sized to the page (no sideways scrolling): email sits under the name and the
              college under the department, and the actions are always visible */}
          <div className="bg-white rounded-[24px] border border-[#EEF2F7] shadow-[0_12px_30px_rgba(15,23,42,0.05)] overflow-hidden">
            <table className="w-full table-fixed text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#EEF2F7]">
                  <th className="py-3.5 pl-5 pr-0 w-[44px]">
                    <input
                      type="checkbox"
                      checked={paginatedStudents.length > 0 && paginatedStudents.every(s => selectedIds.includes(s.id))}
                      onChange={() => {
                        const pageIds = paginatedStudents.map(s => s.id);
                        const allOn = pageIds.every(id => selectedIds.includes(id));
                        setSelectedIds(prev => (allOn ? prev.filter(id => !pageIds.includes(id)) : [...new Set([...prev, ...pageIds])]));
                      }}
                      disabled={paginatedStudents.length === 0}
                      title="Select all students on this page"
                      className="w-4 h-4 accent-blue-600 cursor-pointer align-middle"
                    />
                  </th>
                  <th className="py-3.5 px-4 text-[11.5px] font-bold text-[#64748B] uppercase tracking-wider">Student</th>
                  <th className="py-3.5 px-4 text-[11.5px] font-bold text-[#64748B] uppercase tracking-wider hidden lg:table-cell w-[30%]">Department &amp; College</th>
                  <th className="py-3.5 px-4 text-[11.5px] font-bold text-[#64748B] uppercase tracking-wider w-[112px]">Status</th>
                  <th className="py-3.5 pl-2 pr-5 text-[11.5px] font-bold text-[#64748B] uppercase tracking-wider text-right w-[136px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF2F7]">
                {paginatedStudents.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-16 text-center">
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
                  paginatedStudents.map((student) => {
                    const tier = getTier(student, bundles);
                    return (
                      <tr
                        key={student.id}
                        className={`group transition-colors duration-200 ${selectedIds.includes(student.id) ? 'bg-blue-50/60 hover:bg-blue-50' : 'hover:bg-[#F8FAFF]'}`}
                      >
                        <td className="pl-5 pr-0 py-4 align-middle">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(student.id)}
                            onChange={() => toggleSelected(student.id)}
                            className="w-4 h-4 accent-blue-600 cursor-pointer align-middle"
                          />
                        </td>
                        <td className="px-4 py-4 align-middle">
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="relative shrink-0 group-hover:scale-105 transition-transform">
                              <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${TIER_AVATAR[tier.key] || TIER_AVATAR.foundation} text-white font-bold text-[15px] flex items-center justify-center shadow-md ring-2 ring-white`}>
                                {initialsOf(student.name || student.email)}
                              </div>
                              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white shadow flex items-center justify-center text-[11px] leading-none" title={tier.label}>{tier.icon}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-[15px] text-[#0F172A] tracking-tight truncate" title={student.name}>{student.name}</div>
                              <div className="text-[13px] text-[#64748B] font-medium truncate" title={student.email}>{student.email}</div>
                              <div className="text-[12.5px] text-[#475569] font-medium truncate lg:hidden" title={student.department}>{student.department || '—'}</div>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                <TierPill tier={tier} />
                                {needsAdmissionForm(student) && (
                                  <span className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-amber-700 text-[11px] font-bold" title="Has not submitted the Admission Application Form yet">
                                    <FileSignature size={11} /> Form pending
                                  </span>
                                )}
                                {(student.groupName || '').trim() && (
                                  <span className={`mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-bold ${groupColor(student.groupName.trim())}`} title="Student group">
                                    <UsersRound size={11} /> {student.groupName.trim()}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 align-middle hidden lg:table-cell">
                          <div className="flex items-center gap-2 min-w-0">
                            {student.department && <span className={`w-2.5 h-2.5 rounded-full shrink-0 bg-gradient-to-br ${paletteFor(student.department).badge}`} />}
                            <span className="text-[14px] text-[#0F172A] font-medium truncate" title={student.department}>{student.department || '—'}</span>
                          </div>
                          <div className={`text-[12.5px] text-[#64748B] font-medium truncate mt-0.5 ${student.department ? 'pl-[18px]' : ''}`} title={student.college}>{student.college || 'College not added'}</div>
                        </td>
                        <td className="px-4 py-4 align-middle">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-[12px] font-semibold tracking-wide whitespace-nowrap ${
                            student.status === 'Active'
                              ? 'bg-gradient-to-r from-emerald-50 to-emerald-100/50 text-[#10B981] border border-emerald-100'
                              : 'bg-gradient-to-r from-slate-50 to-slate-100/50 text-[#64748B] border border-slate-200'
                          }`}>
                            {student.status === 'Active' && <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] mr-1.5 animate-pulse"></span>}
                            {student.status}
                          </span>
                        </td>
                        <td className="pl-2 pr-5 py-4 align-middle">
                          <div className="flex items-center justify-end gap-1.5">
                            <button onClick={() => setSelectedStudent(student)} className="w-9 h-9 flex items-center justify-center text-[#64748B] bg-[#F8FAFC] border border-[#EEF2F7] hover:text-[#2563EB] hover:bg-blue-50 hover:border-blue-100 rounded-[10px] transition-colors" title="View Details">
                              <Eye size={17} />
                            </button>
                            <button onClick={() => openEditStudent(student)} className="w-9 h-9 flex items-center justify-center text-[#64748B] bg-[#F8FAFC] border border-[#EEF2F7] hover:text-amber-600 hover:bg-amber-50 hover:border-amber-100 rounded-[10px] transition-colors" title="Edit Student">
                              <Edit size={17} />
                            </button>
                            <button
                              onClick={() => handleDeleteStudent(student.id)}
                              className="w-9 h-9 flex items-center justify-center text-[#64748B] bg-[#F8FAFC] border border-[#EEF2F7] hover:text-red-600 hover:bg-red-50 hover:border-red-100 rounded-[10px] transition-colors" title="Delete Student"
                            >
                              <Trash2 size={17} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

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
      {viewingForm && <AdmissionFormViewer student={viewingForm} onClose={() => setViewingForm(null)} />}

      {selectedStudent && (() => {
        const tier = getTier(selectedStudent, bundles);
        const bundleCount = (selectedStudent.purchasedBundles || []).length;
        const fields = [
          { label: 'Department', value: selectedStudent.department },
          { label: 'College', value: selectedStudent.collegeName },
          { label: 'CGPA', value: selectedStudent.cgpa },
          { label: 'Batch', value: selectedStudent.batch },
          { label: 'Location', value: selectedStudent.location },
          { label: 'Group', value: selectedStudent.groupName },
        ];
        const tabs = [
          { key: 'overview', label: 'Overview' },
          { key: 'practice', label: 'Practice Tests' },
          { key: 'bundles', label: 'Bundles', count: bundleCount },
        ];
        return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setSelectedStudent(null)}>
          <div className="bg-white rounded-[24px] w-full max-w-4xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header: who it is, at a glance */}
            <div className="relative shrink-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50/60 border-b border-[#EEF2F7] px-5 sm:px-8 pt-6 pb-0">
              <button onClick={() => setSelectedStudent(null)} className="absolute top-5 right-5 text-[#64748B] hover:text-[#0F172A] transition-colors bg-white/80 hover:bg-white border border-[#EEF2F7] p-2 rounded-full shadow-sm" title="Close">
                <X size={18} />
              </button>
              <div className="flex items-center gap-4 pr-12">
                <div className="w-16 h-16 rounded-2xl bg-white text-[#2563EB] border border-blue-100 font-bold text-[28px] flex items-center justify-center shrink-0 shadow-sm">
                  {tier.icon}
                </div>
                <div className="min-w-0">
                  <h4 className="text-[22px] font-bold text-[#0F172A] leading-tight truncate">{selectedStudent.name}</h4>
                  <p className="text-[14px] font-medium text-[#64748B] mt-0.5 truncate">{selectedStudent.email}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <TierPill tier={tier} />
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-semibold ${selectedStudent.status === 'Active' ? 'bg-emerald-100 text-[#10B981]' : 'bg-slate-200 text-[#64748B]'}`}>
                      {selectedStudent.status}
                    </span>
                    {selectedStudent.department && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-semibold bg-white border border-[#EEF2F7] text-[#475569]">{selectedStudent.department}</span>}
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[12px] font-semibold bg-white border border-[#EEF2F7] text-[#475569]"><CalendarDays size={12} /> Joined {selectedStudent.joinedDate || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 mt-5 -mb-px overflow-x-auto">
                {tabs.map(t => (
                  <button
                    key={t.key}
                    onClick={() => setDetailTab(t.key)}
                    className={`px-4 py-2.5 text-[14px] font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${detailTab === t.key ? 'border-[#2563EB] text-[#2563EB]' : 'border-transparent text-[#64748B] hover:text-[#0F172A]'}`}
                  >
                    {t.label}
                    {t.count > 0 && <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${detailTab === t.key ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>{t.count}</span>}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5 sm:p-8 overflow-y-auto min-h-[440px]">
              {detailTab === 'overview' && (
                <div className="space-y-5">
                  {selectedStudent.admissionFormSubmitted ? (
                    <button
                      onClick={() => setViewingForm(selectedStudent)}
                      className="w-full flex items-center justify-between gap-3 p-4 rounded-[16px] border border-emerald-100 bg-emerald-50/60 hover:bg-emerald-50 transition-colors text-left"
                    >
                      <span className="flex items-center gap-3 min-w-0">
                        <FileSignature size={20} className="text-emerald-600 shrink-0" />
                        <span className="min-w-0">
                          <span className="block text-[14px] font-bold text-[#0F172A]">Admission Application Form</span>
                          <span className="block text-[12.5px] font-medium text-[#64748B] truncate">Signed · {selectedStudent.admissionFormNo || 'Form submitted'}</span>
                        </span>
                      </span>
                      <span className="text-[13px] font-bold text-emerald-700 shrink-0">View</span>
                    </button>
                  ) : isAdmissionFormExempt(selectedStudent) ? (
                    <div className="flex items-center gap-3 p-4 rounded-[16px] border border-slate-200 bg-slate-50">
                      <FileSignature size={20} className="text-slate-400 shrink-0" />
                      <span className="text-[13.5px] font-medium text-slate-600">Admission form not required for the {selectedStudent.groupName.trim()} group.</span>
                    </div>
                  ) : selectedStudent.admissionFormRequested ? (
                    <div className="flex flex-wrap items-center gap-3 p-4 rounded-[16px] border border-blue-100 bg-blue-50/60">
                      <FileSignature size={20} className="text-blue-600 shrink-0" />
                      <span className="flex-1 min-w-[200px] text-[13.5px] font-medium text-blue-800">Admission form sent - they must fill it in before they can use the portal.</span>
                      <button
                        onClick={() => setAdmissionFormRequested(selectedStudent, false)}
                        disabled={sendingForm}
                        className="px-4 py-2 rounded-[12px] border border-blue-200 bg-white text-[13px] font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-50 transition-colors shrink-0"
                      >
                        {sendingForm ? 'Saving…' : 'Cancel request'}
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-3 p-4 rounded-[16px] border border-amber-100 bg-amber-50/60">
                      <FileSignature size={20} className="text-amber-600 shrink-0" />
                      <span className="flex-1 min-w-[200px] text-[13.5px] font-medium text-amber-800">Admission form not submitted yet - they'll be asked to fill it in before their first payment. Send it to make them fill it in now.</span>
                      <button
                        onClick={() => setAdmissionFormRequested(selectedStudent, true)}
                        disabled={sendingForm}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[12px] bg-amber-500 hover:bg-amber-600 text-white text-[13px] font-bold disabled:opacity-50 transition-colors shrink-0"
                      >
                        <Send size={14} /> {sendingForm ? 'Sending…' : 'Send form'}
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {fields.map(f => (
                      <div key={f.label} className="bg-[#F8FAFC] px-4 py-3 rounded-[14px] border border-[#EEF2F7] min-w-0">
                        <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">{f.label}</span>
                        <p className="font-semibold text-[#0F172A] mt-1 text-[14.5px] truncate" title={f.value || ''}>{f.value || '—'}</p>
                      </div>
                    ))}
                  </div>

                  <div className="bg-[#F8FAFC] px-4 py-3 rounded-[14px] border border-[#EEF2F7]">
                    <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">Skills</span>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {Array.isArray(selectedStudent.skills) && selectedStudent.skills.length > 0
                        ? selectedStudent.skills.map(sk => (
                            <span key={sk} className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-[12px] font-semibold">{sk}</span>
                          ))
                        : <span className="font-semibold text-[#0F172A] text-[14.5px]">—</span>}
                    </div>
                  </div>
                </div>
              )}

              {detailTab === 'practice' && (
                <StudentPracticeStats
                  embedded
                  email={selectedStudent.email}
                  unlimited={hasUnlimitedPractice({ purchasedBundles: selectedStudent.purchasedBundles || [], bundles, department: selectedStudent.department })}
                />
              )}

              {detailTab === 'bundles' && (
                <div>
                  {(!selectedStudent.purchasedBundles || selectedStudent.purchasedBundles.length === 0) ? (
                    <p className="text-[13px] font-medium text-[#64748B] mb-4">No active bundles for this student.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mb-4">
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
                                      // Premium (Elite) is its own switch in Edit Student - removing a bundle doesn't change it
                                      await updateDoc(doc(db, 'joined_students', String(selectedStudent.id)), {
                                        purchasedBundles: updatedBundles
                                      });

                                      const updatedStudent = { ...selectedStudent, purchasedBundles: updatedBundles };
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
                          // A bundle unlocks only what it includes; Premium (Elite) is turned on separately in Edit Student
                          await updateDoc(doc(db, 'joined_students', String(selectedStudent.id)), {
                            purchasedBundles: updatedBundles
                          });
                          const updatedStudent = { ...selectedStudent, purchasedBundles: updatedBundles };
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
              )}
            </div>
          </div>
        </div>
        );
      })()}

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

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Group</label>
                <input
                  type="text"
                  list="student-group-names"
                  value={editForm.groupName}
                  onChange={(e) => setEditForm({ ...editForm, groupName: e.target.value })}
                  placeholder="Pick an existing group or type a new one (leave blank for none)"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold text-slate-800"
                />
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

              {(() => {
                const owned = editingStudent.purchasedBundles || [];
                const full = fullBundleOf({ purchasedBundles: owned, bundles, department: editForm.department });
                const tier = getTier({ ...editingStudent, department: editForm.department }, bundles);
                return (
                  <div className="flex items-start gap-3 px-4 py-3 bg-amber-50/60 border border-amber-100 rounded-2xl">
                    <ShieldCheck size={20} className="text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-slate-800">Membership: {tier.icon} {tier.label}</p>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {full
                          ? `Elite because they own "${full.name}", which includes every resource.`
                          : 'Elite is automatic for students who own a bundle with Academy Tests, Live Classes, Recordings and Study Notes all ticked in Course Setup. Assign one under Bundles to make them Elite.'}
                      </p>
                    </div>
                  </div>
                );
              })()}

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

      {/* Existing group names, suggested by the group inputs */}
      <datalist id="student-group-names">
        {groups.map(g => <option key={g.name} value={g.name} />)}
      </datalist>

      {/* Add to group / Rename group */}
      {groupDialog && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => !isSavingGroup && setGroupDialog(null)}>
          <form
            onSubmit={(e) => { e.preventDefault(); confirmGroupDialog(); }}
            className="bg-white rounded-[24px] w-full max-w-md shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b border-[#EEF2F7] flex justify-between items-center">
              <h3 className="text-[20px] font-bold text-[#0F172A]">
                {groupDialog.mode === 'assign' ? `Add ${selectedIds.length} student${selectedIds.length === 1 ? '' : 's'} to a group` : 'Rename group'}
              </h3>
              <button type="button" onClick={() => !isSavingGroup && setGroupDialog(null)} className="text-[#64748B] hover:text-[#0F172A] bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Group name</label>
                <input
                  type="text"
                  list="student-group-names"
                  autoFocus
                  required
                  value={groupInput}
                  onChange={(e) => setGroupInput(e.target.value)}
                  placeholder="e.g. Weekend Batch A"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold text-slate-800"
                />
              </div>
              {groupDialog.mode === 'assign' && groups.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Or pick an existing group</p>
                  <div className="flex flex-wrap gap-2">
                    {groups.map(g => (
                      <button
                        key={g.name}
                        type="button"
                        onClick={() => setGroupInput(g.name)}
                        className={`px-3 py-1.5 rounded-full text-[12.5px] font-semibold border ${groupColor(g.name)} ${groupInput.trim() === g.name ? 'ring-2 ring-offset-1 ring-[#2563EB]' : ''}`}
                      >
                        {g.name} ({g.count})
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-[12px] text-slate-500 font-medium">
                {groupDialog.mode === 'assign'
                  ? 'A student belongs to one group - anyone already in another group is moved to this one.'
                  : `Every student in "${groupDialog.from}" moves to the new name.`}
              </p>
            </div>
            <div className="px-6 pb-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setGroupDialog(null)}
                disabled={isSavingGroup}
                className="px-6 py-2.5 bg-white border border-[#E5E7EB] hover:bg-slate-50 text-[#64748B] font-semibold rounded-[14px] transition-colors disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingGroup || !groupInput.trim()}
                className="px-6 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold rounded-[14px] transition-colors shadow-md disabled:opacity-60"
              >
                {isSavingGroup ? 'Saving...' : groupDialog.mode === 'assign' ? 'Add to group' : 'Rename'}
              </button>
            </div>
          </form>
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

// Membership tier (utils/membership): Elite = owns a bundle with every resource ticked, Prime = owns other
// bundles, Foundation = no bundles
const TIERS = {
  elite: { key: 'elite', label: 'Elite', icon: '👑', text: 'Elite' },
  prime: { key: 'prime', label: 'Prime', icon: '⭐', text: 'Prime' },
  foundation: { key: 'foundation', label: 'Foundation', icon: '🌱', text: 'Foundation' },
};
// Avatar colours per tier, and the student's initials ("Muthu Raman L" -> "MR")
const TIER_AVATAR = {
  elite: 'from-amber-400 to-orange-500',
  prime: 'from-indigo-500 to-violet-600',
  foundation: 'from-emerald-500 to-teal-600',
};
const initialsOf = (name) => String(name || '?').replace(/[^A-Za-z\s.@]/g, ' ').split(/[\s.@]+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?';
const getTier = (st, bundles) => TIERS[tierKeyOf({ purchasedBundles: st.purchasedBundles || [], bundles, department: st.department })];
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
