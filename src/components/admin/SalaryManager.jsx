import React, { useState, useEffect } from 'react';
import { 
  Search, Wallet, CheckCircle2, X, FileText, IndianRupee, History, Calendar, AlertCircle, FilePlus2
} from 'lucide-react';
import { db } from '../../firebase';
import { updateDoc, doc, collection, getDocs } from 'firebase/firestore';

const SalaryManager = ({ teachers, typists }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('All');
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);
  const [newBaseSalary, setNewBaseSalary] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const qSnapshot = await getDocs(collection(db, 'question_bank'));
        setQuestions(qSnapshot.docs.map(d => d.data()));
      } catch (error) {
        console.error("Failed to fetch questions", error);
      }
    };
    fetchQuestions();
  }, []);

  // Combine staff with a generic role tag and calculate per-question payouts for Typists
  const allStaff = [
    ...teachers.map(t => ({ ...t, systemRole: 'Teacher', collection: 'invited_teachers', baseSalary: t.baseSalary || 0, salaryHistory: t.salaryHistory || [] })),
    ...typists.map(t => {
      const nameStr = t.name || t.fullName || '';
      // Count questions typed by this typist
      const totalTyped = questions.filter(q => (q.typedBy === nameStr) || (q.pairId === t.pairId)).length;
      const paidQuestionsCount = t.paidQuestionsCount || 0;
      const pendingQuestionsCount = Math.max(0, totalTyped - paidQuestionsCount);
      const perQuestionRate = t.baseSalary || 0; // Using baseSalary as the per-question rate for Typists
      const pendingPayout = pendingQuestionsCount * perQuestionRate;

      return { 
        ...t, 
        systemRole: 'Typist', 
        collection: 'invited_typists', 
        baseSalary: perQuestionRate, 
        salaryHistory: t.salaryHistory || [],
        totalTyped,
        paidQuestionsCount,
        pendingQuestionsCount,
        pendingPayout
      };
    })
  ];

  const filteredStaff = allStaff.filter(staff => {
    const nameStr = staff.name || staff.fullName || '';
    const emailStr = staff.email || '';
    const matchesSearch = nameStr.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          emailStr.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === 'All' || staff.systemRole === filterRole;
    return matchesSearch && matchesRole;
  });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const handleUpdateSalary = async (e) => {
    e.preventDefault();
    if (!selectedStaff) return;
    
    setIsUpdating(true);
    try {
      const staffRef = doc(db, selectedStaff.collection, selectedStaff.id);
      await updateDoc(staffRef, {
        baseSalary: Number(newBaseSalary)
      });
      showToast(selectedStaff.systemRole === 'Typist' ? 'Per-question rate updated successfully' : 'Base salary updated successfully');
      
      setSelectedStaff(prev => ({ ...prev, baseSalary: Number(newBaseSalary) }));
      setIsSalaryModalOpen(false);
    } catch (error) {
      console.error("Error updating salary", error);
      showToast('Failed to update salary', 'error');
    }
    setIsUpdating(false);
  };

  const markCurrentMonthPaid = async (staff) => {
    const nameStr = staff.name || staff.fullName || 'Staff';
    if (window.confirm(`Mark salary as paid for ${nameStr}?`)) {
      try {
        const currentDate = new Date();
        const monthYear = currentDate.toLocaleString('default', { month: 'short', year: 'numeric' });
        
        let amountPaid = staff.baseSalary;
        let updateData = {};
        let newRecord = {
          month: monthYear,
          paidAt: currentDate.toISOString(),
          status: 'Paid'
        };

        if (staff.systemRole === 'Typist') {
          amountPaid = staff.pendingPayout;
          const newPaidCount = (staff.paidQuestionsCount || 0) + staff.pendingQuestionsCount;
          updateData.paidQuestionsCount = newPaidCount;
          newRecord.amount = amountPaid;
          newRecord.questionsPaid = staff.pendingQuestionsCount;
        } else {
          newRecord.amount = amountPaid;
        }

        const updatedHistory = [newRecord, ...(staff.salaryHistory || [])];
        const staffRef = doc(db, staff.collection, staff.id);
        
        updateData.salaryHistory = updatedHistory;
        
        await updateDoc(staffRef, updateData);
        
        showToast(`Payment recorded successfully for ${nameStr}`);
        
        if (selectedStaff && selectedStaff.id === staff.id) {
            setSelectedStaff(prev => ({ 
              ...prev, 
              salaryHistory: updatedHistory,
              ...(staff.systemRole === 'Typist' ? { paidQuestionsCount: updateData.paidQuestionsCount, pendingQuestionsCount: 0, pendingPayout: 0 } : {})
            }));
        }
        
        // Optimistic UI update for the list
        staff.salaryHistory = updatedHistory; 
        if (staff.systemRole === 'Typist') {
          staff.paidQuestionsCount = updateData.paidQuestionsCount;
          staff.pendingQuestionsCount = 0;
          staff.pendingPayout = 0;
        }
      } catch (error) {
        console.error("Error updating payment history", error);
        showToast('Failed to mark as paid', 'error');
      }
    }
  };

  return (
    <div className="bg-[#F8FAFC] min-h-full rounded-[2rem] px-8 pb-8 pt-0 relative overflow-hidden" style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(79, 70, 229, 0.04) 0%, transparent 70%)' }}>
      <div className="absolute inset-0 z-0 opacity-40 mix-blend-overlay pointer-events-none" style={{ backgroundImage: 'radial-gradient(#94A3B8 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

      {toast.show && (
        <div className={`fixed top-6 right-6 z-[100] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl transition-all animate-in fade-in slide-in-from-top-5 ${
          toast.type === 'success' ? 'bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]' : 'bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA]'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <p className="font-semibold text-sm">{toast.message}</p>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10 relative z-10 pt-8">
        <div>
          <h2 className="text-[36px] font-bold text-[#0F172A] tracking-tight leading-tight font-sans">
            Staff Salary Management
          </h2>
          <p className="text-[#64748B] text-[15px] font-medium mt-1">
            Track and manage salaries for teachers and typists across the academy.
          </p>
        </div>
      </div>

      <div className="space-y-7 relative z-10">
        {/* Filters and Search */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text"
                placeholder="Search staff by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 w-[300px]"
              />
            </div>
          </div>
          
          <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
            {['All', 'Teacher', 'Typist'].map(role => (
              <button 
                key={role}
                onClick={() => setFilterRole(role)}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${filterRole === role ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                {role === 'All' ? 'All Staff' : role + 's'}
              </button>
            ))}
          </div>
        </div>

        {/* Staff Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Staff Member</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role / Dept</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Salary / Rate</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Payout</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-12 text-center text-slate-500">No staff found matching criteria.</td>
                  </tr>
                ) : (
                  filteredStaff.map(staff => {
                    const lastPayment = staff.salaryHistory?.length > 0 ? staff.salaryHistory[0] : null;
                    const currentDate = new Date();
                    const currentMonthYear = currentDate.toLocaleString('default', { month: 'short', year: 'numeric' });
                    
                    let isPaidThisMonth = false;
                    let isPayable = false;
                    let pendingText = '';
                    
                    if (staff.systemRole === 'Teacher') {
                      isPaidThisMonth = lastPayment?.month === currentMonthYear;
                      isPayable = !isPaidThisMonth && staff.baseSalary > 0;
                      pendingText = isPaidThisMonth ? 'Paid this month' : `₹${(staff.baseSalary || 0).toLocaleString('en-IN')}`;
                    } else {
                      isPayable = staff.pendingQuestionsCount > 0 && staff.baseSalary > 0;
                      pendingText = `₹${staff.pendingPayout.toLocaleString('en-IN')}`;
                    }

                    const nameStr = staff.name || staff.fullName || 'Unknown';
                    const emailStr = staff.email || '';

                    return (
                      <tr key={staff.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm border border-blue-100">
                              {nameStr.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900 text-sm">{nameStr}</div>
                              <div className="text-xs text-slate-500">{emailStr}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex flex-col gap-1">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase w-fit ${
                              staff.systemRole === 'Teacher' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              {staff.systemRole}
                            </span>
                            <span className="text-xs text-slate-500">{staff.department || 'General'}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-bold text-slate-800 text-sm flex items-center gap-1">
                            <IndianRupee size={14} className="text-slate-400" />
                            {staff.baseSalary ? staff.baseSalary.toLocaleString('en-IN') : 'Not Set'}
                            <span className="text-[10px] text-slate-400 font-normal">
                              {staff.systemRole === 'Teacher' ? '/mo' : '/q'}
                            </span>
                          </div>
                          {staff.systemRole === 'Typist' && (
                            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                              <FilePlus2 size={12} className="text-indigo-400"/>
                              Typed: {staff.totalTyped || 0}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-6">
                           <div className="flex flex-col">
                              {staff.systemRole === 'Typist' ? (
                                <>
                                  <span className={`text-sm font-bold ${staff.pendingPayout > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                                    {pendingText}
                                  </span>
                                  {staff.pendingQuestionsCount > 0 && (
                                    <span className="text-[11px] text-slate-500">{staff.pendingQuestionsCount} unpaid questions</span>
                                  )}
                                </>
                              ) : (
                                <>
                                  <span className={`text-sm font-bold ${isPaidThisMonth ? 'text-emerald-600' : 'text-amber-600'}`}>
                                    {pendingText}
                                  </span>
                                  {lastPayment && (
                                    <span className="text-[11px] text-slate-500">Last: {lastPayment.month}</span>
                                  )}
                                </>
                              )}
                            </div>
                        </td>
                        <td className="py-4 px-6 text-right space-x-2">
                           <button
                            onClick={() => {
                              setSelectedStaff(staff);
                              setNewBaseSalary(staff.baseSalary?.toString() || '');
                              setIsSalaryModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 rounded-lg text-xs font-semibold transition-all shadow-sm"
                          >
                            <Wallet size={14} />
                            Manage
                          </button>
                          
                          <button
                            onClick={() => markCurrentMonthPaid(staff)}
                            disabled={!isPayable}
                            title={isPayable ? "Mark as paid" : "No pending payment"}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm ${
                              !isPayable
                                ? 'bg-slate-100 text-slate-400 border-transparent cursor-not-allowed'
                                : 'bg-emerald-500 hover:bg-emerald-600 text-white border-transparent'
                            }`}
                          >
                            <CheckCircle2 size={14} />
                            Pay
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Salary Manager Modal */}
      {isSalaryModalOpen && selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  {(selectedStaff.name || selectedStaff.fullName || 'Unknown').split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{selectedStaff.name || selectedStaff.fullName}</h2>
                  <p className="text-sm text-slate-500 font-medium">{selectedStaff.systemRole} • {selectedStaff.email}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsSalaryModalOpen(false)}
                className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors shadow-sm"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8 flex-1 overflow-y-auto">
              
              {/* Set Base Salary / Rate Form */}
              <form onSubmit={handleUpdateSalary} className="mb-10 p-6 bg-slate-50 border border-slate-200 rounded-2xl">
                <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Wallet size={16} className="text-blue-600" />
                  {selectedStaff.systemRole === 'Typist' ? 'Per Question Rate Configuration' : 'Base Salary Configuration'}
                </h3>
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">
                      {selectedStaff.systemRole === 'Typist' ? 'Rate per Question (₹)' : 'Monthly Salary (₹)'}
                    </label>
                    <div className="relative">
                      <IndianRupee size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="number"
                        min="0"
                        value={newBaseSalary}
                        onChange={(e) => setNewBaseSalary(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        placeholder="Enter amount..."
                        required
                      />
                    </div>
                  </div>
                  <button 
                    type="submit"
                    disabled={isUpdating}
                    className="h-[46px] px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-colors shadow-sm disabled:opacity-70 flex items-center justify-center"
                  >
                    {isUpdating ? 'Saving...' : 'Update Rate'}
                  </button>
                </div>
              </form>

              {/* Typist Stats Box */}
              {selectedStaff.systemRole === 'Typist' && (
                <div className="mb-10 p-6 bg-indigo-50 border border-indigo-100 rounded-2xl flex gap-6">
                  <div className="flex-1">
                    <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">Total Typed</div>
                    <div className="text-2xl font-black text-indigo-900">{selectedStaff.totalTyped || 0}</div>
                  </div>
                  <div className="w-px bg-indigo-200"></div>
                  <div className="flex-1">
                    <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">Total Paid</div>
                    <div className="text-2xl font-black text-indigo-900">{selectedStaff.paidQuestionsCount || 0}</div>
                  </div>
                  <div className="w-px bg-indigo-200"></div>
                  <div className="flex-1">
                    <div className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-1">Unpaid</div>
                    <div className="text-2xl font-black text-emerald-600">{selectedStaff.pendingQuestionsCount || 0}</div>
                  </div>
                </div>
              )}

              {/* Payment History */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <History size={16} className="text-indigo-600" />
                  Payment History
                </h3>
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Month</th>
                        <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Amount</th>
                        <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Paid On</th>
                        {selectedStaff.systemRole === 'Typist' && (
                          <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Questions</th>
                        )}
                        <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(!selectedStaff.salaryHistory || selectedStaff.salaryHistory.length === 0) ? (
                        <tr>
                          <td colSpan={selectedStaff.systemRole === 'Typist' ? "5" : "4"} className="px-6 py-8 text-center text-sm text-slate-500 italic">No payment history available.</td>
                        </tr>
                      ) : (
                        selectedStaff.salaryHistory.map((record, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="px-6 py-4 font-semibold text-sm text-slate-900">{record.month}</td>
                            <td className="px-6 py-4 font-medium text-sm text-slate-700">₹{record.amount?.toLocaleString('en-IN') || 0}</td>
                            <td className="px-6 py-4 text-sm text-slate-500 flex items-center gap-2">
                              <Calendar size={14} className="text-slate-400" />
                              {new Date(record.paidAt).toLocaleDateString('en-GB')}
                            </td>
                            {selectedStaff.systemRole === 'Typist' && (
                              <td className="px-6 py-4 font-medium text-sm text-slate-700">{record.questionsPaid || 0}</td>
                            )}
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-emerald-100 text-emerald-700">
                                {record.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SalaryManager;
