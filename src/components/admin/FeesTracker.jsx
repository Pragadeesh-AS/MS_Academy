import React, { useState } from 'react';
import { 
  Search, 
  Wallet, 
  TrendingUp, 
  IndianRupee, 
  Filter,
  Eye,
  Plus,
  X,
  CreditCard,
  Calendar,
  Banknote,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';

// Mock Data
const MOCK_FEES_DATA = [
  {
    id: 1,
    name: "Alex Johnson",
    course: "Full Stack Development",
    totalFee: 50000,
    paid: 30000,
    status: "Partial", // Fully Paid, Partial, Pending
    history: [
      { id: 101, amount: 15000, date: "2023-08-01", method: "Bank Transfer" },
      { id: 102, amount: 15000, date: "2023-09-05", method: "Credit Card" }
    ],
    installments: [
      { id: 201, amount: 10000, dueDate: "2023-10-05" },
      { id: 202, amount: 10000, dueDate: "2023-11-05" }
    ]
  },
  {
    id: 2,
    name: "Sarah Williams",
    course: "Data Science Bootcamp",
    totalFee: 75000,
    paid: 75000,
    status: "Fully Paid",
    history: [
      { id: 103, amount: 75000, date: "2023-08-10", method: "UPI" }
    ],
    installments: []
  },
  {
    id: 3,
    name: "Michael Chen",
    course: "UI/UX Design Masterclass",
    totalFee: 35000,
    paid: 10000,
    status: "Partial",
    history: [
      { id: 104, amount: 10000, date: "2023-09-01", method: "Cash" }
    ],
    installments: [
      { id: 203, amount: 12500, dueDate: "2023-10-01" },
      { id: 204, amount: 12500, dueDate: "2023-11-01" }
    ]
  },
  {
    id: 4,
    name: "Emily Davis",
    course: "Full Stack Development",
    totalFee: 50000,
    paid: 0,
    status: "Pending",
    history: [],
    installments: [
      { id: 205, amount: 25000, dueDate: "2023-09-15" },
      { id: 206, amount: 25000, dueDate: "2023-10-15" }
    ]
  }
];

export default function FeesTracker() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedStudent, setSelectedStudent] = useState(null);
  
  // Calculate KPIs
  const totalExpected = MOCK_FEES_DATA.reduce((acc, curr) => acc + curr.totalFee, 0);
  const totalCollected = MOCK_FEES_DATA.reduce((acc, curr) => acc + curr.paid, 0);
  const totalPending = totalExpected - totalCollected;

  const filteredData = MOCK_FEES_DATA.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          student.course.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || student.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    switch(status) {
      case 'Fully Paid':
        return <span className="px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full text-[13px] font-bold flex items-center gap-1.5 w-fit"><CheckCircle2 size={14}/> {status}</span>;
      case 'Partial':
        return <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-[13px] font-bold flex items-center gap-1.5 w-fit"><Clock size={14}/> {status}</span>;
      case 'Pending':
        return <span className="px-3 py-1 bg-orange-50 text-orange-700 border border-orange-200 rounded-full text-[13px] font-bold flex items-center gap-1.5 w-fit"><AlertCircle size={14}/> {status}</span>;
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div className="bg-[#F8FAFC] min-h-full rounded-[2rem] px-8 pb-8 pt-0 relative overflow-hidden" style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(37, 99, 235, 0.03) 0%, transparent 70%)' }}>
      
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10 relative z-10">
        <div>
          <h2 className="text-[36px] font-bold text-[#0F172A] tracking-tight leading-tight font-sans">
            Fees Tracker
          </h2>
          <p className="text-[#64748B] text-[15px] font-medium mt-1">
            Monitor student payments, track installments, and view revenue analytics.
          </p>
        </div>
      </div>

      <div className="space-y-8 relative z-10">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-[22px] p-6 border border-[#EEF2F7] shadow-[0_10px_28px_rgba(15,23,42,0.04)] flex flex-col justify-between">
            <div className="flex items-center gap-3 text-[#64748B] mb-4">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <Wallet size={22} />
              </div>
              <span className="text-[15px] font-bold">Total Expected Revenue</span>
            </div>
            <h3 className="text-[32px] font-black text-[#0F172A]">₹{totalExpected.toLocaleString('en-IN')}</h3>
          </div>
          
          <div className="bg-white rounded-[22px] p-6 border border-[#EEF2F7] shadow-[0_10px_28px_rgba(15,23,42,0.04)] flex flex-col justify-between">
            <div className="flex items-center gap-3 text-[#64748B] mb-4">
              <div className="p-2.5 bg-green-50 text-green-600 rounded-xl">
                <TrendingUp size={22} />
              </div>
              <span className="text-[15px] font-bold">Total Collected</span>
            </div>
            <h3 className="text-[32px] font-black text-[#0F172A]">₹{totalCollected.toLocaleString('en-IN')}</h3>
          </div>

          <div className="bg-white rounded-[22px] p-6 border border-[#EEF2F7] shadow-[0_10px_28px_rgba(15,23,42,0.04)] flex flex-col justify-between">
            <div className="flex items-center gap-3 text-[#64748B] mb-4">
              <div className="p-2.5 bg-orange-50 text-orange-600 rounded-xl">
                <IndianRupee size={22} />
              </div>
              <span className="text-[15px] font-bold">Total Pending</span>
            </div>
            <h3 className="text-[32px] font-black text-[#0F172A]">₹{totalPending.toLocaleString('en-IN')}</h3>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="bg-white rounded-[24px] border border-[#EEF2F7] shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col">
          
          {/* Controls Bar */}
          <div className="p-6 border-b border-[#EEF2F7] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
            <div className="relative w-full sm:w-[320px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search students or courses..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[14px] font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl shadow-sm">
                <Filter size={16} className="text-slate-400" />
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent text-[14px] font-bold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="All">All Statuses</option>
                  <option value="Fully Paid">Fully Paid</option>
                  <option value="Partial">Partial</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-slate-100">
                  <th className="px-6 py-5 text-[13px] font-bold text-slate-400 uppercase tracking-wider">Student & Course</th>
                  <th className="px-6 py-5 text-[13px] font-bold text-slate-400 uppercase tracking-wider text-right">Total Fee</th>
                  <th className="px-6 py-5 text-[13px] font-bold text-slate-400 uppercase tracking-wider text-right">Amount Paid</th>
                  <th className="px-6 py-5 text-[13px] font-bold text-slate-400 uppercase tracking-wider text-right">Balance</th>
                  <th className="px-6 py-5 text-[13px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-5 text-[13px] font-bold text-slate-400 uppercase tracking-wider text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredData.length > 0 ? filteredData.map(student => (
                  <tr key={student.id} className="hover:bg-slate-50/70 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-[15px] font-bold text-slate-800">{student.name}</span>
                        <span className="text-[13px] font-medium text-slate-500 mt-0.5">{student.course}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[15px] font-bold text-slate-700 text-right">
                      ₹{student.totalFee.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 text-[15px] font-bold text-green-600 text-right">
                      ₹{student.paid.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 text-[15px] font-bold text-red-500 text-right">
                      ₹{(student.totalFee - student.paid).toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(student.status)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => setSelectedStudent(student)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex"
                        title="View Details"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-slate-500 font-medium">
                      No matching records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Student Details Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedStudent(null)}></div>
          <div className="bg-white rounded-3xl w-full max-w-2xl relative z-10 shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/50 rounded-t-3xl">
              <div>
                <h2 className="text-[22px] font-bold text-slate-800">{selectedStudent.name}</h2>
                <p className="text-[14px] font-medium text-slate-500 mt-1">{selectedStudent.course}</p>
              </div>
              <button 
                onClick={() => setSelectedStudent(null)}
                className="p-2 text-slate-400 hover:bg-white hover:text-slate-700 rounded-full transition-colors shadow-sm bg-slate-100/50 border border-slate-200/50"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-8 overflow-y-auto">
              
              {/* Summary Strip */}
              <div className="flex gap-4 mb-8">
                <div className="flex-1 bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <div className="text-[13px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total Fee</div>
                  <div className="text-[20px] font-black text-slate-800">₹{selectedStudent.totalFee.toLocaleString('en-IN')}</div>
                </div>
                <div className="flex-1 bg-green-50 rounded-2xl p-4 border border-green-100">
                  <div className="text-[13px] font-bold text-green-600 uppercase tracking-wider mb-1">Paid</div>
                  <div className="text-[20px] font-black text-green-700">₹{selectedStudent.paid.toLocaleString('en-IN')}</div>
                </div>
                <div className="flex-1 bg-orange-50 rounded-2xl p-4 border border-orange-100">
                  <div className="text-[13px] font-bold text-orange-600 uppercase tracking-wider mb-1">Balance</div>
                  <div className="text-[20px] font-black text-orange-700">₹{(selectedStudent.totalFee - selectedStudent.paid).toLocaleString('en-IN')}</div>
                </div>
              </div>

              {/* Installments & History Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Payment History */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[16px] font-bold text-slate-800 flex items-center gap-2">
                      <CreditCard size={18} className="text-blue-500"/> Payment History
                    </h3>
                  </div>
                  {selectedStudent.history.length > 0 ? (
                    <div className="space-y-3">
                      {selectedStudent.history.map(payment => (
                        <div key={payment.id} className="p-4 rounded-xl border border-slate-100 bg-white shadow-sm flex items-start justify-between">
                          <div>
                            <div className="text-[15px] font-bold text-slate-800">₹{payment.amount.toLocaleString('en-IN')}</div>
                            <div className="text-[12px] font-semibold text-slate-400 mt-0.5 flex items-center gap-1">
                              <Calendar size={12}/> {new Date(payment.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                          </div>
                          <div className="text-[12px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
                            {payment.method}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[14px] text-slate-500 font-medium italic p-4 bg-slate-50 rounded-xl border border-slate-100 border-dashed text-center">
                      No payments recorded yet.
                    </div>
                  )}
                </div>

                {/* Upcoming Installments */}
                <div>
                  <h3 className="text-[16px] font-bold text-slate-800 flex items-center gap-2 mb-4">
                    <Banknote size={18} className="text-orange-500"/> Upcoming Installments
                  </h3>
                  {selectedStudent.installments.length > 0 ? (
                    <div className="space-y-3">
                      {selectedStudent.installments.map(inst => (
                        <div key={inst.id} className="p-4 rounded-xl border border-orange-100 bg-orange-50/30 flex items-start justify-between">
                          <div>
                            <div className="text-[15px] font-bold text-slate-800">₹{inst.amount.toLocaleString('en-IN')}</div>
                            <div className="text-[12px] font-semibold text-orange-600 mt-0.5 flex items-center gap-1">
                              Due: {new Date(inst.dueDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                          </div>
                          <button className="text-[13px] font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg transition-colors shadow-sm">
                            Pay Now
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[14px] text-slate-500 font-medium italic p-4 bg-slate-50 rounded-xl border border-slate-100 border-dashed text-center">
                      No pending installments.
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 rounded-b-3xl flex justify-end">
              <button className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-2.5 rounded-xl text-[14px] font-bold shadow-[0_4px_14px_rgba(15,23,42,0.25)] hover:shadow-[0_6px_20px_rgba(15,23,42,0.3)] hover:-translate-y-0.5 transition-all flex items-center gap-2">
                <Plus size={18} strokeWidth={2.5}/> Record Custom Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
