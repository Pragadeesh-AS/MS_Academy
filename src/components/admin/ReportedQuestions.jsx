import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, updateDoc, doc, orderBy } from 'firebase/firestore';
import { AlertTriangle, CheckCircle2, Search, Clock, Check, X, ShieldAlert } from 'lucide-react';

export default function ReportedQuestions({ role = 'admin', department = '' }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, [role, department]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      let q;
      if (role === 'admin') {
        q = query(collection(db, 'reported_questions')); 
      } else {
        q = query(collection(db, 'reported_questions'), where('department', '==', department));
      }
      
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      data.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      setReports(data);
    } catch (err) {
      console.error("Error fetching reported questions:", err);
    } finally {
      setLoading(false);
    }
  };

  const markResolved = async (id) => {
    try {
      await updateDoc(doc(db, 'reported_questions', id), {
        status: 'resolved'
      });
      setReports(reports.map(r => r.id === id ? { ...r, status: 'resolved' } : r));
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-bold">Loading reported questions...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <ShieldAlert className="text-red-500" /> Reported Questions
          </h3>
          <p className="text-slate-500 text-sm font-medium mt-1">Review questions reported by students during tests.</p>
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-green-500" />
          </div>
          <h4 className="text-lg font-bold text-slate-800 mb-2">No Reports</h4>
          <p className="text-slate-500">There are no reported questions at the moment.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {reports.map((report) => (
            <div key={report.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col">
              <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1 ${report.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {report.status === 'resolved' ? <Check size={14}/> : <AlertTriangle size={14}/>} {report.status || 'Pending'}
                  </span>
                  <span className="text-sm font-bold text-slate-600 bg-white px-3 py-1 rounded-full border border-slate-200">
                    Dept: {report.department}
                  </span>
                  <span className="text-sm font-bold text-slate-600 bg-white px-3 py-1 rounded-full border border-slate-200">
                    Test: {report.testTitle}
                  </span>
                </div>
                <div className="text-sm font-bold text-slate-500">
                  {report.timestamp?.toDate ? report.timestamp.toDate().toLocaleString() : 'Recent'}
                </div>
              </div>
              
              <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  <div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Reported Reason</div>
                    <div className="bg-red-50 text-red-800 p-4 rounded-xl font-medium border border-red-100">
                      "{report.reason}"
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Question Context</div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm max-h-48 overflow-y-auto">
                      <div dangerouslySetInnerHTML={{ __html: report.questionText || '<i class="text-slate-400">No text provided</i>' }} />
                      <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs font-bold text-slate-500">
                        <span>Question ID: {report.questionId}</span>
                        <span>Author: {report.teacher}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Reporter Details</div>
                    <div className="flex flex-col gap-2">
                      <div className="font-bold text-slate-800">{report.studentName}</div>
                      <div className="text-sm text-slate-500">{report.studentEmail}</div>
                    </div>
                  </div>

                  {report.status !== 'resolved' && (
                    <button 
                      onClick={() => markResolved(report.id)}
                      className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-colors shadow-md"
                    >
                      Mark as Resolved
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
