// Exports one test's Analytics report (the Global Tests drill-down) as an Excel-friendly CSV or a PDF.
// `report` is the per-test summary Analytics builds: title, department, subject, date, participants,
// avgScore / highestScore (%), avgTime, distribution [{ range, count }] and students
// [{ name, email, score, maxScore, correct, wrong, unattempted, timeTaken, timeSeconds, submittedAt }].
import { jsPDF } from 'jspdf';
import logoImg from '../assets/msgate_logo.png';

// Best score first; equal scores -> the faster attempt ranks higher
const rankedStudents = (report) => [...report.students]
  .sort((a, b) => b.score - a.score || (a.timeSeconds || 0) - (b.timeSeconds || 0));

const percentOf = (s) => (s.maxScore > 0 ? Math.round((s.score / s.maxScore) * 100) : 0);

const safeFileName = (title) => `${(title || 'Test').replace(/[\\/:*?"<>|]+/g, '').trim() || 'Test'} - Report`;

const today = () => new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const download = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// ---------------------------------------------------------------------------- CSV (Excel)
const csvCell = (value) => {
  const s = value === null || value === undefined ? '' : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const exportTestReportCsv = (report) => {
  const rows = [
    ['Test Report', report.title],
    ['Department', report.department],
    ['Subject', report.subject],
    ['Created', report.date],
    ['Exported', today()],
    [],
    ['Total Attempts', report.participants],
    ['Average Score', `${report.avgScore}%`],
    ['Highest Score', `${report.highestScore}%`],
    ['Average Time Taken', report.avgTime],
    [],
    ['Score Distribution', 'Students'],
    ...report.distribution.map(d => [d.range, d.count]),
    [],
    ['Rank', 'Student Name', 'Email', 'Score', 'Max Marks', 'Percentage', 'Correct', 'Wrong', 'Unattempted', 'Time Taken', 'Submitted On'],
    ...rankedStudents(report).map((s, i) => [
      i + 1, s.name, s.email, s.score, s.maxScore, `${percentOf(s)}%`,
      s.correct, s.wrong, s.unattempted, s.timeTaken, s.submittedAt,
    ]),
  ];
  // BOM so Excel opens it as UTF-8; CRLF line endings for Windows Excel
  const csv = '﻿' + rows.map(r => r.map(csvCell).join(',')).join('\r\n');
  download(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `${safeFileName(report.title)}.csv`);
};

// ---------------------------------------------------------------------------- PDF
const loadImage = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = reject;
  img.src = src;
});

const BLUE = [30, 58, 138];
const TEXT = [30, 41, 59];
const MUTED = [100, 116, 139];
const LINE = [226, 232, 240];

// Trim text with "..." so it fits a table cell
const fit = (pdf, text, maxWidth) => {
  let s = String(text ?? '');
  if (pdf.getTextWidth(s) <= maxWidth) return s;
  while (s.length > 1 && pdf.getTextWidth(`${s}...`) > maxWidth) s = s.slice(0, -1);
  return `${s}...`;
};

export const exportTestReportPdf = async (report) => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 14;
  const contentW = pageW - margin * 2;

  // Header band
  pdf.setFillColor(...BLUE);
  pdf.rect(0, 0, pageW, 30, 'F');
  let titleX = margin;
  try {
    pdf.addImage(await loadImage(logoImg), 'PNG', margin, 6, 18, 18);
    titleX = margin + 22;
  } catch {
    // No logo - the text header still works
  }
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(20);
  pdf.text('MS ACADEMY', titleX, 18);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.text('TEST REPORT', pageW - margin, 18, { align: 'right' });

  // Test details
  let y = 42;
  pdf.setTextColor(...TEXT);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  const titleLines = pdf.splitTextToSize(report.title || 'Untitled Test', contentW);
  pdf.text(titleLines, margin, y);
  y += titleLines.length * 7;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(...MUTED);
  pdf.text(`Department: ${report.department}    Subject: ${report.subject}`, margin, y);
  y += 5;
  pdf.text(`Created: ${report.date}    Exported: ${today()}`, margin, y);
  y += 9;

  // Summary cards
  const cards = [
    ['Total Attempts', String(report.participants)],
    ['Average Score', `${report.avgScore}%`],
    ['Highest Score', `${report.highestScore}%`],
    ['Avg Time Taken', report.avgTime],
  ];
  const gap = 4;
  const cardW = (contentW - gap * (cards.length - 1)) / cards.length;
  cards.forEach(([label, value], i) => {
    const x = margin + i * (cardW + gap);
    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(...LINE);
    pdf.roundedRect(x, y, cardW, 20, 2, 2, 'FD');
    pdf.setTextColor(...BLUE);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text(value, x + cardW / 2, y + 9, { align: 'center' });
    pdf.setTextColor(...MUTED);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.text(label.toUpperCase(), x + cardW / 2, y + 15.5, { align: 'center' });
  });
  y += 30;

  // Score distribution as horizontal bars
  pdf.setTextColor(...TEXT);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.text('Score Distribution', margin, y);
  y += 6;
  const maxCount = Math.max(1, ...report.distribution.map(d => d.count));
  const barX = margin + 22;
  const barMaxW = contentW - 22 - 18;
  pdf.setFontSize(9);
  report.distribution.forEach(d => {
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...MUTED);
    pdf.text(d.range, margin, y + 3.5);
    pdf.setFillColor(241, 245, 249);
    pdf.rect(barX, y, barMaxW, 5, 'F');
    if (d.count > 0) {
      pdf.setFillColor(59, 130, 246);
      pdf.rect(barX, y, (d.count / maxCount) * barMaxW, 5, 'F');
    }
    pdf.setTextColor(...TEXT);
    pdf.setFont('helvetica', 'bold');
    pdf.text(String(d.count), barX + barMaxW + 3, y + 3.8);
    y += 7.5;
  });
  y += 6;

  // Student results table
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(...TEXT);
  pdf.text('Student Results', margin, y);
  y += 4;

  const cols = [
    { label: '#', w: 8, align: 'center' },
    { label: 'Student', w: 38 },
    { label: 'Email', w: 41 },
    { label: 'Score', w: 20, align: 'right' },
    { label: '%', w: 12, align: 'right' },
    { label: 'Correct', w: 13, align: 'right' },
    { label: 'Wrong', w: 12, align: 'right' },
    { label: 'Unattempted', w: 20, align: 'right' },
    { label: 'Time', w: 18, align: 'right' },
  ];
  const rowH = 7;
  const cellText = (text, col, x, rowY) => {
    const pad = 1.5;
    const s = fit(pdf, text, col.w - pad * 2);
    if (col.align === 'right') pdf.text(s, x + col.w - pad, rowY, { align: 'right' });
    else if (col.align === 'center') pdf.text(s, x + col.w / 2, rowY, { align: 'center' });
    else pdf.text(s, x + pad, rowY);
  };
  const drawHeader = () => {
    pdf.setFillColor(...BLUE);
    pdf.rect(margin, y, contentW, rowH, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    let x = margin;
    cols.forEach(col => { cellText(col.label, col, x, y + 4.7); x += col.w; });
    y += rowH;
  };

  drawHeader();
  const students = rankedStudents(report);
  if (students.length === 0) {
    pdf.setTextColor(...MUTED);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text('No students have attempted this test yet.', margin + 2, y + 5);
  }
  students.forEach((s, i) => {
    if (y + rowH > pageH - 16) {
      pdf.addPage();
      y = 16;
      drawHeader();
    }
    if (i % 2 === 1) {
      pdf.setFillColor(248, 250, 252);
      pdf.rect(margin, y, contentW, rowH, 'F');
    }
    pdf.setTextColor(...TEXT);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    const values = [i + 1, s.name, s.email || '-', `${s.score} / ${s.maxScore}`, `${percentOf(s)}%`, s.correct, s.wrong, s.unattempted, s.timeTaken];
    let x = margin;
    cols.forEach((col, c) => { cellText(values[c], col, x, y + 4.7); x += col.w; });
    pdf.setDrawColor(...LINE);
    pdf.line(margin, y + rowH, margin + contentW, y + rowH);
    y += rowH;
  });

  // Footer on every page
  const pages = pdf.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    pdf.setPage(p);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(...MUTED);
    pdf.text(fit(pdf, `MS Academy - ${report.title}`, contentW - 30), margin, pageH - 8);
    pdf.text(`Page ${p} of ${pages}`, pageW - margin, pageH - 8, { align: 'right' });
  }

  pdf.save(`${safeFileName(report.title)}.pdf`);
};
