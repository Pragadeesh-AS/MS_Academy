import React, { useState } from 'react';
import { 
  Search, Wallet, CheckCircle2, X, FileText, IndianRupee, History, Calendar, AlertCircle
} from 'lucide-react';
import { db } from '../../firebase';
import { updateDoc, doc } from 'firebase/firestore';

const SalaryManager = ({ teachers, typists }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('All');
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);
  const [newBaseSalary, setNewBaseSalary] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Combine staff with a generic role tag and default salary fields if missing
  const allStaff = [
    ...teachers.map(t => ({ ...t, systemRole: 'Teacher', collection: 'invited_teachers', baseSalary: t.baseSalary || 0, salaryHistory: t.salaryHistory || [] })),
    ...typists.map(t => ({ ...t, systemRole: 'Typist', collection: 'invited_typists', baseSalary: t.baseSalary || 0, salaryHistory: t.salaryHistory || [] }))
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
      showToast('Base salary updated successfully');
      
      // Update local state by mutating the prop lists directly is tricky in React, 
      // but the AdminDashboard should ideally re-fetch or we just update the selectedStaff locally for immediate UI update.
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
    if (window.confirm(`Mark salary as paid for ${nameStr} this month?`)) {
      try {
        const currentDate = new Date();
        const monthYear = currentDate.toLocaleString('default', { month: 'short', year: 'numeric' });
        const newRecord = {
          month: monthYear,
          amount: staff.baseSalary,
          paidAt: currentDate.toISOString(),
          status: 'Paid'
        };

        const updatedHistory = [newRecord, ...(staff.salaryHistory || [])];
        const staffRef = doc(db, staff.collection, staff.id);
        
        await updateDoc(staffRef, {
          salaryHistory: updatedHistory
        });
        
        showToast(`Salary marked as paid for ${monthYear}`);
        
        if (selectedStaff && selectedStaff.id === staff.id) {
            setSelectedStaff(prev => ({ ...prev, salaryHistory: updatedHistory }));
        }
        
        staff.salaryHistory = updatedHistory; // Mutating prop directly just for optimitic UI if not selecting
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
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Base Salary</th>
                  <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Last Payment</th>
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
                    const isPaidThisMonth = lastPayment?.month === currentMonthYear;
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
                            <span className="text-[10px] text-slate-400 font-normal">/mo</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          {lastPayment ? (
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-slate-700">{lastPayment.month}</span>
                              <span className="text-xs text-emerald-600 font-medium">Paid</span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">No payments recorded</span>
                          )}
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
                            disabled={isPaidThisMonth || !staff.baseSalary}
                            title={isPaidThisMonth ? "Already paid this month" : !staff.baseSalary ? "Set base salary first" : "Mark current month as paid"}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm ${
                              isPaidThisMonth || !staff.baseSalary
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
              
              {/* Set Base Salary Form */}
              <form onSubmit={handleUpdateSalary} className="mb-10 p-6 bg-slate-50 border border-slate-200 rounded-2xl">
                <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Wallet size={16} className="text-blue-600" />
                  Base Salary Configuration
                </h3>
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Monthly Salary (₹)</label>
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
                    {isUpdating ? 'Saving...' : 'Update Salary'}
                  </button>
                </div>
              </form>

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
                        <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(!selectedStaff.salaryHistory || selectedStaff.salaryHistory.length === 0) ? (
                        <tr>
                          <td colSpan="4" className="px-6 py-8 text-center text-sm text-slate-500 italic">No payment history available.</td>
                        </tr>
                      ) : (
                        selectedStaff.salaryHistory.map((record, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="px-6 py-4 font-semibold text-sm text-slate-900">{record.month}</td>
                            <td className="px-6 py-4 font-medium text-sm text-slate-700">₹{record.amount.toLocaleString('en-IN')}</td>
                            <td className="px-6 py-4 text-sm text-slate-500 flex items-center gap-2">
                              <Calendar size={14} className="text-slate-400" />
                              {new Date(record.paidAt).toLocaleDateString('en-GB')}
                            </td>
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
