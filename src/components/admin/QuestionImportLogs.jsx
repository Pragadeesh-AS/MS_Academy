import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  getDocs, 
  deleteDoc, 
  doc, 
  addDoc 
} from 'firebase/firestore';
import { 
  FileSpreadsheet, 
  UploadCloud, 
  Database, 
  Image as ImageIcon, 
  XCircle, 
  MinusCircle, 
  CheckCircle2, 
  Clock, 
  Search, 
  X, 
  Download, 
  RefreshCw, 
  FileText, 
  Layers, 
  Eye,
  Trash2,
  CheckCircle
} from 'lucide-react';
import { hasDiagram } from '../../utils/questionLogger';

export default function QuestionImportLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterDept, setFilterDept] = useState('all');
  const [filterDiagram, setFilterDiagram] = useState('all'); // all | with_diagrams | text_only
  const [filterDate, setFilterDate] = useState('all'); // all | today | 7days | 30days
  const [selectedLog, setSelectedLog] = useState(null);
  const [isSyncingHistory, setIsSyncingHistory] = useState(false);
  const [syncNotice, setSyncNotice] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [deletingId, setDeletingId] = useState(null);

  // 1. Live subscribe to question_import_logs
  useEffect(() => {
    const q = query(collection(db, 'question_import_logs'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLogs(items);
      setLoading(false);
    }, (err) => {
      console.error('Failed to subscribe to question_import_logs:', err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // 2. One-click / auto sync for historical questions in question_bank
  const syncHistoricalImports = async () => {
    setIsSyncingHistory(true);
    setSyncNotice('');
    try {
      const qSnap = await getDocs(collection(db, 'question_bank'));
      const questions = qSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      if (questions.length === 0) {
        setSyncNotice('No questions found in Question Bank to sync.');
        setIsSyncingHistory(false);
        return;
      }

      // Group questions by import batch:
      // Group by importedAt if present, or by (typedByEmail + date of createdAt)
      const batchMap = new Map();

      questions.forEach(q => {
        const batchKey = q.importedAt 
          ? `IMPORT-${q.importedAt}` 
          : `DATE-${(q.createdAt || '').slice(0, 10)}-${(q.typedByEmail || q.typedBy || 'admin').toLowerCase()}`;
        
        if (!batchMap.has(batchKey)) {
          batchMap.set(batchKey, []);
        }
        batchMap.get(batchKey).push(q);
      });

      // Existing log batchIds or createdAts to prevent duplicate logs
      const existingBatchKeys = new Set(logs.map(l => l.importedAt || l.createdAt || l.batchId));

      let newlyCreated = 0;

      for (const [key, batchQuestions] of batchMap.entries()) {
        const sample = batchQuestions[0];
        const batchDate = sample.importedAt || sample.createdAt || new Date().toISOString();
        
        // Skip if a log with this exact date already exists
        if (existingBatchKeys.has(sample.importedAt) || existingBatchKeys.has(sample.createdAt)) {
          continue;
        }

        const diagramQuestions = batchQuestions.filter(q => hasDiagram(q)).length;
        const approvedCount = batchQuestions.filter(q => q.status === 'Approved' || !q.status).length;
        const inReviewCount = batchQuestions.filter(q => q.status === 'In Review').length;
        const draftCount = batchQuestions.filter(q => q.status === 'Draft').length;

        const importerName = sample.typedBy || 'Admin';
        const importerEmail = sample.typedByEmail || '';
        const pusherName = sample.reviewedBy || (sample.status === 'Approved' ? importerName : '');

        const newLogEntry = {
          batchId: `HIST-${key}`,
          type: inReviewCount > 0 ? 'import_for_review' : 'direct_push',
          action: inReviewCount > 0 ? 'Historical Import (In Review)' : 'Historical Import (Pushed to Question Bank)',
          fileName: sample.sourceFileName || (sample.topic ? `${String(sample.topic).replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_')}_Questions.pdf` : (sample.subject ? `${String(sample.subject).replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_')}_Questions.pdf` : 'Extracted_Questions.pdf')),
          department: sample.department || 'Multiple / General',
          subject: sample.subject || '',
          topic: sample.topic || '',
          totalExtracted: batchQuestions.length,
          importedCount: batchQuestions.length,
          pushedCount: approvedCount,
          skippedCount: 0,
          rejectedCount: draftCount,
          diagramCount: diagramQuestions,
          textOnlyCount: batchQuestions.length - diagramQuestions,
          questionTypes: {
            singleChoice: batchQuestions.filter(q => q.questionType === 'Single Choice' || !q.questionType).length,
            multipleChoice: batchQuestions.filter(q => q.questionType === 'Multiple Choice').length,
            nat: batchQuestions.filter(q => q.questionType === 'Fill in Blanks' || q.questionType === 'Fill in the Blanks').length,
            match: batchQuestions.filter(q => q.questionType === 'Match').length
          },
          user: {
            name: importerName,
            email: importerEmail,
            role: sample.pairId ? 'Typist' : 'Admin'
          },
          importedBy: {
            name: importerName,
            email: importerEmail,
            role: sample.pairId ? 'Typist' : 'Admin'
          },
          pushedBy: pusherName ? {
            name: pusherName,
            email: '',
            role: 'Admin/Reviewer'
          } : null,
          reviewerEmail: sample.reviewerEmail || '',
          notes: 'Synchronized from historical Question Bank records',
          importedAt: sample.importedAt || batchDate,
          createdAt: batchDate
        };

        await addDoc(collection(db, 'question_import_logs'), newLogEntry);
        newlyCreated++;
      }

      setSyncNotice(newlyCreated > 0 
        ? `Successfully synchronized ${newlyCreated} historical import batches from Question Bank!` 
        : 'All Question Bank records are already synchronized.');
    } catch (err) {
      console.error('Error syncing historical imports:', err);
      setSyncNotice('Failed to sync historical questions: ' + err.message);
    } finally {
      setIsSyncingHistory(false);
      setTimeout(() => setSyncNotice(''), 6000);
    }
  };

  // Delete a log record
  const handleDeleteLog = async (id) => {
    if (!id) return;
    try {
      await deleteDoc(doc(db, 'question_import_logs', id));
      if (selectedLog?.id === id) setSelectedLog(null);
    } catch (err) {
      console.error('Failed to delete log entry:', err);
    }
    setDeletingId(null);
  };

  // 3. Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter(item => {
      // Free-text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchFile = (item.fileName || '').toLowerCase().includes(q);
        const matchDept = (item.department || '').toLowerCase().includes(q);
        const matchSubj = (item.subject || '').toLowerCase().includes(q);
        const matchTopic = (item.topic || '').toLowerCase().includes(q);
        const matchUser = (item.importedBy?.name || item.user?.name || '').toLowerCase().includes(q);
        const matchEmail = (item.importedBy?.email || item.user?.email || '').toLowerCase().includes(q);
        const matchPusher = (item.pushedBy?.name || '').toLowerCase().includes(q);
        const matchAction = (item.action || '').toLowerCase().includes(q);
        if (!matchFile && !matchDept && !matchSubj && !matchTopic && !matchUser && !matchEmail && !matchPusher && !matchAction) {
          return false;
        }
      }

      // Filter by Type
      if (filterType !== 'all') {
        if (filterType === 'pushed' && Number(item.pushedCount || 0) === 0) return false;
        if (filterType === 'review' && item.type !== 'import_for_review') return false;
        if (filterType === 'skipped' && Number(item.skippedCount || 0) === 0) return false;
        if (filterType === 'rejected' && Number(item.rejectedCount || 0) === 0) return false;
      }

      // Filter by Department
      if (filterDept !== 'all' && item.department !== filterDept) {
        return false;
      }

      // Filter by Diagrams
      if (filterDiagram === 'with_diagrams' && Number(item.diagramCount || 0) === 0) return false;
      if (filterDiagram === 'text_only' && Number(item.diagramCount || 0) > 0) return false;

      // Filter by Date
      if (filterDate !== 'all') {
        const itemDate = new Date(item.createdAt || item.importedAt);
        const now = new Date();
        if (filterDate === 'today') {
          if (itemDate.toDateString() !== now.toDateString()) return false;
        } else if (filterDate === '7days') {
          const diffMs = now - itemDate;
          if (diffMs > 7 * 24 * 60 * 60 * 1000) return false;
        } else if (filterDate === '30days') {
          const diffMs = now - itemDate;
          if (diffMs > 30 * 24 * 60 * 60 * 1000) return false;
        }
      }

      return true;
    });
  }, [logs, searchQuery, filterType, filterDept, filterDiagram, filterDate]);

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  // Unique departments for filter dropdown
  const departmentOptions = useMemo(() => {
    const depts = new Set(logs.map(l => l.department).filter(Boolean));
    return Array.from(depts).sort();
  }, [logs]);

  // Overall Statistics calculated across filtered logs
  const stats = useMemo(() => {
    return filteredLogs.reduce((acc, l) => {
      acc.totalImported += Number(l.importedCount || 0);
      acc.totalPushed += Number(l.pushedCount || 0);
      acc.totalSkipped += Number(l.skippedCount || 0);
      acc.totalRejected += Number(l.rejectedCount || 0);
      acc.totalDiagrams += Number(l.diagramCount || 0);
      acc.totalBatches += 1;
      return acc;
    }, {
      totalImported: 0,
      totalPushed: 0,
      totalSkipped: 0,
      totalRejected: 0,
      totalDiagrams: 0,
      totalBatches: 0
    });
  }, [filteredLogs]);

  const diagramPercentage = stats.totalImported > 0 
    ? Math.round((stats.totalDiagrams / stats.totalImported) * 100) 
    : 0;

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;
    
    const headers = [
      'Batch ID',
      'Created Date',
      'Action',
      'File Name',
      'Department',
      'Subject',
      'Topic',
      'Imported By Name',
      'Imported By Email',
      'Imported By Role',
      'Pushed By Name',
      'Total Extracted',
      'Imported Count',
      'Pushed to Bank Count',
      'Skipped Count',
      'Rejected Count',
      'Diagram Questions Count',
      'Text Only Count',
      'Single Choice (MCQ)',
      'Multiple Choice (MSQ)',
      'NAT (Numerical)',
      'Match the Following',
      'Reviewer Email',
      'Notes'
    ];

    const rows = filteredLogs.map(l => [
      `"${l.batchId || l.id || ''}"`,
      `"${new Date(l.createdAt || l.importedAt).toLocaleString()}"`,
      `"${(l.action || '').replace(/"/g, '""')}"`,
      `"${(l.fileName || '').replace(/"/g, '""')}"`,
      `"${(l.department || '').replace(/"/g, '""')}"`,
      `"${(l.subject || '').replace(/"/g, '""')}"`,
      `"${(l.topic || '').replace(/"/g, '""')}"`,
      `"${(l.importedBy?.name || l.user?.name || '').replace(/"/g, '""')}"`,
      `"${(l.importedBy?.email || l.user?.email || '').replace(/"/g, '""')}"`,
      `"${(l.importedBy?.role || l.user?.role || '').replace(/"/g, '""')}"`,
      `"${(l.pushedBy?.name || '').replace(/"/g, '""')}"`,
      l.totalExtracted || l.importedCount || 0,
      l.importedCount || 0,
      l.pushedCount || 0,
      l.skippedCount || 0,
      l.rejectedCount || 0,
      l.diagramCount || 0,
      l.textOnlyCount || 0,
      l.questionTypes?.singleChoice || 0,
      l.questionTypes?.multipleChoice || 0,
      l.questionTypes?.nat || 0,
      l.questionTypes?.match || 0,
      `"${(l.reviewerEmail || '').replace(/"/g, '""')}"`,
      `"${(l.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `question_import_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Unknown date';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return { date: 'Unknown', time: '' };
    try {
      const d = new Date(dateStr);
      return {
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      };
    } catch {
      return { date: String(dateStr), time: '' };
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 p-4 sm:p-6 lg:p-8 bg-[#F8FAFC] min-h-screen">
      
      {/* ================= TOP HEADER ================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[24px] border border-[#EEF2F7] shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 shrink-0">
            <FileSpreadsheet size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[22px] sm:text-[26px] font-extrabold text-[#0F172A] tracking-tight">
                Logs and Activities
              </h1>
              <span className="text-[12px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                Live Audit Trail
              </span>
            </div>
            <p className="text-[14px] font-medium text-[#64748B] mt-0.5">
              Comprehensive tracking of imported, pushed, skipped, rejected, and diagram questions by user.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={syncHistoricalImports}
            disabled={isSyncingHistory}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100/70 text-blue-700 text-[13px] font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
            title="Scan Question Bank and reconstruct logs for past extractions"
          >
            <RefreshCw size={15} className={isSyncingHistory ? 'animate-spin' : ''} />
            <span>{isSyncingHistory ? 'Syncing...' : 'Sync Past History'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={filteredLogs.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[13px] font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            <Download size={15} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {syncNotice && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[14px] font-semibold animate-in fade-in">
          <CheckCircle size={18} className="shrink-0 text-emerald-600" />
          <span>{syncNotice}</span>
        </div>
      )}

      {/* ================= STATS CARDS ================= */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 sm:gap-4">
        {/* Total Imported */}
        <div className="bg-white p-4 sm:p-5 rounded-[20px] border border-[#EEF2F7] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold uppercase tracking-wider text-slate-400">Imported</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <UploadCloud size={16} />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-[24px] sm:text-[28px] font-extrabold text-[#0F172A] leading-tight">
              {stats.totalImported.toLocaleString()}
            </span>
            <p className="text-[11px] font-medium text-slate-400 mt-0.5">Total Questions Saved</p>
          </div>
        </div>

        {/* Pushed to Bank */}
        <div className="bg-white p-4 sm:p-5 rounded-[20px] border border-[#EEF2F7] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold uppercase tracking-wider text-emerald-600">Pushed to Bank</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Database size={16} />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-[24px] sm:text-[28px] font-extrabold text-emerald-600 leading-tight">
              {stats.totalPushed.toLocaleString()}
            </span>
            <p className="text-[11px] font-medium text-slate-400 mt-0.5">Active & Approved</p>
          </div>
        </div>

        {/* Diagram Questions */}
        <div className="bg-white p-4 sm:p-5 rounded-[20px] border border-purple-100 shadow-sm bg-gradient-to-br from-white to-purple-50/30 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold uppercase tracking-wider text-purple-600">Diagrams</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <ImageIcon size={16} />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[24px] sm:text-[28px] font-extrabold text-purple-700 leading-tight">
                {stats.totalDiagrams.toLocaleString()}
              </span>
              <span className="text-[12px] font-bold text-purple-600">
                ({diagramPercentage}%)
              </span>
            </div>
            <p className="text-[11px] font-medium text-purple-500/80 mt-0.5">With Figures / Images</p>
          </div>
        </div>

        {/* Skipped */}
        <div className="bg-white p-4 sm:p-5 rounded-[20px] border border-[#EEF2F7] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold uppercase tracking-wider text-amber-600">Skipped</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <MinusCircle size={16} />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-[24px] sm:text-[28px] font-extrabold text-amber-600 leading-tight">
              {stats.totalSkipped.toLocaleString()}
            </span>
            <p className="text-[11px] font-medium text-slate-400 mt-0.5">Duplicates & Excluded</p>
          </div>
        </div>

        {/* Rejected */}
        <div className="bg-white p-4 sm:p-5 rounded-[20px] border border-[#EEF2F7] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold uppercase tracking-wider text-rose-600">Rejected</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <XCircle size={16} />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-[24px] sm:text-[28px] font-extrabold text-rose-600 leading-tight">
              {stats.totalRejected.toLocaleString()}
            </span>
            <p className="text-[11px] font-medium text-slate-400 mt-0.5">Sent Back to Drafts</p>
          </div>
        </div>

        {/* Total Sessions */}
        <div className="bg-white p-4 sm:p-5 rounded-[20px] border border-[#EEF2F7] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold uppercase tracking-wider text-slate-400">Total Batches</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <Layers size={16} />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-[24px] sm:text-[28px] font-extrabold text-[#0F172A] leading-tight">
              {stats.totalBatches}
            </span>
            <p className="text-[11px] font-medium text-slate-400 mt-0.5">Log Records</p>
          </div>
        </div>
      </div>

      {/* ================= FILTER TOOLBAR ================= */}
      <div className="bg-white p-5 rounded-[22px] border border-[#EEF2F7] shadow-sm flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          
          {/* Search Bar */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search size={18} />
            </div>
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Search by file name, topic, subject, department, or user name/email..."
              className="w-full h-[46px] pl-10 pr-10 bg-[#F8FAFC] border border-[#EEF2F7] rounded-[14px] text-[14px] font-medium text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Action / Type Filter */}
            <select
              value={filterType}
              onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}
              className="h-[46px] px-3.5 border border-[#EEF2F7] rounded-[14px] bg-[#F8FAFC] text-[13px] font-semibold text-[#0F172A] focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Actions</option>
              <option value="pushed">Pushed to Bank</option>
              <option value="review">Sent for Review</option>
              <option value="skipped">Has Skipped Questions</option>
              <option value="rejected">Has Rejected Questions</option>
            </select>

            {/* Department Filter */}
            <select
              value={filterDept}
              onChange={(e) => { setFilterDept(e.target.value); setCurrentPage(1); }}
              className="h-[46px] px-3.5 border border-[#EEF2F7] rounded-[14px] bg-[#F8FAFC] text-[13px] font-semibold text-[#0F172A] focus:outline-none focus:border-blue-500 max-w-[180px]"
            >
              <option value="all">All Departments</option>
              {departmentOptions.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>

            {/* Diagrams Filter */}
            <select
              value={filterDiagram}
              onChange={(e) => { setFilterDiagram(e.target.value); setCurrentPage(1); }}
              className="h-[46px] px-3.5 border border-[#EEF2F7] rounded-[14px] bg-[#F8FAFC] text-[13px] font-semibold text-[#0F172A] focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Content Types</option>
              <option value="with_diagrams">Has Diagram Questions</option>
              <option value="text_only">Text-only Only</option>
            </select>

            {/* Date Preset Filter */}
            <select
              value={filterDate}
              onChange={(e) => { setFilterDate(e.target.value); setCurrentPage(1); }}
              className="h-[46px] px-3.5 border border-[#EEF2F7] rounded-[14px] bg-[#F8FAFC] text-[13px] font-semibold text-[#0F172A] focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
            </select>
          </div>
        </div>

        {/* Filter status indicator */}
        <div className="flex items-center justify-between text-[12px] font-semibold text-slate-500 pt-1 border-t border-slate-100">
          <span>
            Showing <strong className="text-slate-800">{filteredLogs.length}</strong> matching batch record{filteredLogs.length === 1 ? '' : 's'}
          </span>
          {(searchQuery || filterType !== 'all' || filterDept !== 'all' || filterDiagram !== 'all' || filterDate !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterType('all');
                setFilterDept('all');
                setFilterDiagram('all');
                setFilterDate('all');
                setCurrentPage(1);
              }}
              className="text-blue-600 hover:text-blue-700 font-bold transition-colors"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* ================= LOG ENTRIES TABLE / LIST ================= */}
      <div className="bg-white rounded-[24px] border border-[#EEF2F7] shadow-sm overflow-hidden flex flex-col">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-center">
            <RefreshCw size={28} className="text-blue-600 animate-spin mb-3" />
            <p className="text-[15px] font-bold text-slate-700">Loading Question Activity Logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
              <FileSpreadsheet size={32} />
            </div>
            <h3 className="text-[17px] font-extrabold text-[#0F172A]">No activity logs found</h3>
            <p className="text-[14px] font-medium text-[#64748B] mt-1 max-w-md">
              {logs.length === 0
                ? "No extraction or import logs have been recorded yet. Click 'Sync Past History' above to scan previously imported questions from your Question Bank!"
                : "No logs matched your current search and filter criteria."}
            </p>
            {logs.length === 0 && (
              <button
                type="button"
                onClick={syncHistoricalImports}
                disabled={isSyncingHistory}
                className="mt-4 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-[13px] transition-all shadow-md shadow-blue-500/20"
              >
                Sync Previous Imports Now
              </button>
            )}
          </div>
        ) : (
          <div className="w-full overflow-hidden">
            <table className="w-full table-fixed text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#EEF2F7] text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-3 w-[115px]">Date & Time</th>
                  <th className="py-3 px-3 w-[28%]">Uploaded File</th>
                  <th className="py-3 px-3 w-[18%]">Imported By</th>
                  <th className="py-3 px-3 w-[14%]">Pushed By</th>
                  <th className="py-3 px-3">Department / Subject</th>
                  <th className="py-3 px-3 w-[70px] text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF2F7] text-[13px]">
                {paginatedLogs.map((log) => {
                  const isPushed = (log.pushedCount || 0) > 0;
                  const importerName = log.importedBy?.name || log.user?.name || 'Admin';
                  const pusherName = log.pushedBy?.name || (isPushed ? importerName : '-');
                  const dt = formatDateTime(log.createdAt || log.importedAt);
                  const resolvedFileName = log.fileName && !log.fileName.includes('Question Bank Import') && !log.fileName.includes('AI Extracted Document')
                    ? log.fileName
                    : log.topic
                      ? `${String(log.topic).replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_')}_Questions.pdf`
                      : log.subject
                        ? `${String(log.subject).replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_')}_Questions.pdf`
                        : 'Extracted_Questions.pdf';

                  return (
                    <tr 
                      key={log.id} 
                      className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                      onClick={() => setSelectedLog(log)}
                    >
                      {/* Date & Time (compact 2-line layout, reduced width) */}
                      <td className="py-3 px-3 w-[115px]">
                        <div className="flex flex-col leading-tight" title={log.batchId || log.id}>
                          <span className="font-bold text-slate-800 text-[12px] whitespace-nowrap">
                            {dt.date}
                          </span>
                          <span className="text-[11px] font-medium text-slate-400 whitespace-nowrap mt-0.5">
                            {dt.time}
                          </span>
                        </div>
                      </td>

                      {/* Uploaded File Name */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-md bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100 shadow-xs">
                            <FileText size={14} />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-slate-800 truncate text-[12.5px]" title={resolvedFileName}>
                              {resolvedFileName}
                            </span>
                            <span className="text-[10px] font-medium text-slate-400">PDF Document</span>
                          </div>
                        </div>
                      </td>

                      {/* Imported By */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-[10.5px] flex items-center justify-center shrink-0">
                            {importerName.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-slate-800 text-[12px] truncate" title={importerName}>
                              {importerName}
                            </span>
                            <span className="text-[10.5px] font-medium text-slate-400 truncate" title={log.importedBy?.email || log.user?.email || 'System'}>
                              {log.importedBy?.email || log.user?.email || 'System'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Pushed By */}
                      <td className="py-3 px-3">
                        <span className={`font-semibold text-[12px] truncate block ${isPushed ? 'text-emerald-700 font-bold' : 'text-slate-400'}`} title={pusherName}>
                          {pusherName}
                        </span>
                      </td>

                      {/* Department / Subject */}
                      <td className="py-3 px-3">
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-slate-800 text-[12px] truncate" title={log.department || 'General'}>
                            {log.department || 'General'}
                          </span>
                          <span className="text-[10.5px] font-medium text-slate-500 truncate" title={`${log.subject || ''} ${log.topic ? `• ${log.topic}` : ''}`}>
                            {log.subject || 'All Subjects'}{log.topic ? ` • ${log.topic}` : ''}
                          </span>
                        </div>
                      </td>

                      {/* Action / Inspect */}
                      <td className="py-3 px-3 w-[70px] text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedLog(log)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Inspect details"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingId(log.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete log entry"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ================= PAGINATION ================= */}
        {filteredLogs.length > pageSize && (
          <div className="p-4 bg-[#F8FAFC] border-t border-[#EEF2F7] flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[13px] font-medium text-slate-500">
              <span>Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredLogs.length)} of {filteredLogs.length} logs</span>
              <span>•</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="bg-white border border-[#EEF2F7] rounded-lg px-2 py-1 text-[12px] font-bold text-slate-700"
              >
                <option value={10}>10 per page</option>
                <option value={15}>15 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg border border-[#EEF2F7] bg-white text-[13px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-[13px] font-bold text-slate-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg border border-[#EEF2F7] bg-white text-[13px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ================= DETAIL MODAL DRAWER ================= */}
      {selectedLog && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-3 sm:p-5"
          onClick={() => setSelectedLog(null)}
        >
          <div 
            className="bg-white rounded-[24px] w-full max-w-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-[#EEF2F7] flex items-center justify-between bg-gradient-to-r from-slate-50 to-blue-50/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <h3 className="text-[18px] font-bold text-[#0F172A] leading-tight">
                    Batch Log Inspection
                  </h3>
                  <p className="text-[12px] font-mono text-[#64748B] mt-0.5">
                    {selectedLog.batchId || selectedLog.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="w-9 h-9 rounded-full bg-white border border-[#EEF2F7] text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors shadow-sm"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              
              {/* Event & File Banner */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Action Performed</span>
                  <span className="text-[15px] font-extrabold text-slate-800 mt-0.5">
                    {selectedLog.action || 'Question Import'}
                  </span>
                  <span className="text-[12px] text-slate-500 mt-0.5">
                    {formatDate(selectedLog.createdAt || selectedLog.importedAt)}
                  </span>
                </div>
                <div className="flex flex-col sm:items-end">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Uploaded File</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <FileText size={15} className="text-red-500 shrink-0" />
                    <span className="text-[14px] font-bold text-slate-800">
                      {selectedLog.fileName && !selectedLog.fileName.includes('Question Bank Import') && !selectedLog.fileName.includes('AI Extracted Document')
                        ? selectedLog.fileName
                        : selectedLog.topic
                          ? `${String(selectedLog.topic).replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_')}_Questions.pdf`
                          : selectedLog.subject
                            ? `${String(selectedLog.subject).replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_')}_Questions.pdf`
                            : 'Extracted_Questions.pdf'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Counts Breakdown Grid */}
              <div>
                <h4 className="text-[13px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Questions Breakdown
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="p-3.5 rounded-xl border border-blue-100 bg-blue-50/40 flex flex-col">
                    <span className="text-[11px] font-bold text-blue-600">Imported</span>
                    <span className="text-[22px] font-extrabold text-blue-700 mt-1">
                      {selectedLog.importedCount || 0}
                    </span>
                    <span className="text-[11px] text-blue-500/80">Saved to DB</span>
                  </div>

                  <div className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/40 flex flex-col">
                    <span className="text-[11px] font-bold text-emerald-600">Pushed to Bank</span>
                    <span className="text-[22px] font-extrabold text-emerald-700 mt-1">
                      {selectedLog.pushedCount || 0}
                    </span>
                    <span className="text-[11px] text-emerald-500/80">Active in Tests</span>
                  </div>

                  <div className="p-3.5 rounded-xl border border-purple-100 bg-purple-50/40 flex flex-col">
                    <span className="text-[11px] font-bold text-purple-600">With Diagrams</span>
                    <span className="text-[22px] font-extrabold text-purple-700 mt-1">
                      {selectedLog.diagramCount || 0}
                    </span>
                    <span className="text-[11px] text-purple-500/80">Has image/crop</span>
                  </div>

                  <div className="p-3.5 rounded-xl border border-amber-100 bg-amber-50/40 flex flex-col">
                    <span className="text-[11px] font-bold text-amber-600">Skipped / Dups</span>
                    <span className="text-[22px] font-extrabold text-amber-700 mt-1">
                      {selectedLog.skippedCount || 0}
                    </span>
                    <span className="text-[11px] text-amber-500/80">Excluded</span>
                  </div>

                  <div className="p-3.5 rounded-xl border border-rose-100 bg-rose-50/40 flex flex-col">
                    <span className="text-[11px] font-bold text-rose-600">Rejected</span>
                    <span className="text-[22px] font-extrabold text-rose-700 mt-1">
                      {selectedLog.rejectedCount || 0}
                    </span>
                    <span className="text-[11px] text-rose-500/80">Sent to Drafts</span>
                  </div>
                </div>
              </div>

              {/* Diagram vs Text Only Bar */}
              <div>
                <div className="flex justify-between text-[12px] font-bold mb-1.5">
                  <span className="text-purple-700">
                    Diagram Questions: {selectedLog.diagramCount || 0} ({selectedLog.importedCount > 0 ? Math.round(((selectedLog.diagramCount || 0) / selectedLog.importedCount) * 100) : 0}%)
                  </span>
                  <span className="text-slate-500">
                    Text-only: {selectedLog.textOnlyCount ?? ((selectedLog.importedCount || 0) - (selectedLog.diagramCount || 0))}
                  </span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden flex">
                  <div 
                    className="bg-purple-600 h-full transition-all" 
                    style={{ width: `${selectedLog.importedCount > 0 ? ((selectedLog.diagramCount || 0) / selectedLog.importedCount) * 100 : 0}%` }}
                  />
                  <div 
                    className="bg-blue-400 h-full transition-all" 
                    style={{ width: `${selectedLog.importedCount > 0 ? (100 - (((selectedLog.diagramCount || 0) / selectedLog.importedCount) * 100)) : 100}%` }}
                  />
                </div>
              </div>

              {/* Question Types Split */}
              {selectedLog.questionTypes && (
                <div>
                  <h4 className="text-[13px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Question Formats in this Batch
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl text-center">
                      <span className="text-[11px] font-bold text-slate-400 block">Single Choice (MCQ)</span>
                      <span className="text-[18px] font-extrabold text-slate-800">{selectedLog.questionTypes.singleChoice || 0}</span>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl text-center">
                      <span className="text-[11px] font-bold text-slate-400 block">Multiple Choice (MSQ)</span>
                      <span className="text-[18px] font-extrabold text-slate-800">{selectedLog.questionTypes.multipleChoice || 0}</span>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl text-center">
                      <span className="text-[11px] font-bold text-slate-400 block">Numerical (NAT)</span>
                      <span className="text-[18px] font-extrabold text-slate-800">{selectedLog.questionTypes.nat || 0}</span>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl text-center">
                      <span className="text-[11px] font-bold text-slate-400 block">Match Items</span>
                      <span className="text-[18px] font-extrabold text-slate-800">{selectedLog.questionTypes.match || 0}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* User & Metadata Details */}
              <div className="p-4 rounded-2xl bg-white border border-[#EEF2F7] space-y-3">
                <h4 className="text-[13px] font-bold uppercase tracking-wider text-slate-400">
                  User & Hierarchy Details
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[13px]">
                  <div>
                    <span className="text-slate-400 font-semibold block text-[11px]">Imported By</span>
                    <span className="font-bold text-slate-800">
                      {selectedLog.importedBy?.name || selectedLog.user?.name || 'Admin'}
                    </span>
                    <span className="text-slate-500 block text-[11px]">
                      {selectedLog.importedBy?.email || selectedLog.user?.email || 'N/A'} • Role: {selectedLog.importedBy?.role || selectedLog.user?.role || 'Admin'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 font-semibold block text-[11px]">Pushed / Approved By</span>
                    <span className="font-bold text-emerald-700">
                      {selectedLog.pushedBy?.name || (selectedLog.pushedCount > 0 ? (selectedLog.importedBy?.name || 'Direct Import') : 'Pending Review')}
                    </span>
                    {selectedLog.reviewerEmail && (
                      <span className="text-slate-500 block text-[11px]">
                        Reviewer: {selectedLog.reviewerEmail}
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-slate-400 font-semibold block text-[11px]">Target Department</span>
                    <span className="font-bold text-slate-800">
                      {selectedLog.department || 'General'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 font-semibold block text-[11px]">Subject & Topic</span>
                    <span className="font-bold text-slate-800">
                      {selectedLog.subject || 'All Subjects'} {selectedLog.topic ? `• ${selectedLog.topic}` : ''}
                    </span>
                  </div>
                </div>

                {selectedLog.notes && (
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-slate-400 font-semibold block text-[11px]">Notes</span>
                    <p className="text-[12px] text-slate-600 mt-0.5">{selectedLog.notes}</p>
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#EEF2F7] flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[13px] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[22px] p-6 max-w-sm w-full border border-slate-200 shadow-2xl">
            <h4 className="text-[17px] font-bold text-slate-800">Delete Log Entry?</h4>
            <p className="text-[13px] text-slate-500 mt-2 leading-relaxed">
              Are you sure you want to remove this log record? The actual questions in the Question Bank will not be affected.
            </p>
            <div className="flex justify-end gap-2.5 mt-6">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-[13px] text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteLog(deletingId)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 font-bold text-[13px] text-white"
              >
                Delete Log
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
