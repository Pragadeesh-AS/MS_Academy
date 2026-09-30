// Exports one test's Analytics report (the Global Tests drill-down) as an Excel-friendly CSV or a PDF.
// `report` is the per-test summary Analytics builds: title, department, subject, date, participants,
// avgScore / highestScore (%), avgTime, distribution [{ range, count }] and students
// [{ name, score, maxScore, correct, wrong, unattempted, timeTaken, timeSeconds, submittedAt }].
// Student emails are deliberately left out of both exports.
import { jsPDF } from 'jspdf';
import logoImg from '../assets/msgate_logo.png';

// Best score first; equal scores -> the faster attempt ranks higher
const rankedStudents = (report) => [...report.students]
  .sort((a, b) => b.score - a.score || (a.timeSeconds || 0) - (b.timeSeconds || 0));

// Scores can carry float noise from negative marks (0.33 + 0.67...) - show at most 2 decimals
const num = (n) => String(Math.round((Number(n) || 0) * 100) / 100);

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
    ['Rank', 'Student Name', 'Score', 'Max Marks', 'Percentage', 'Correct', 'Wrong', 'Unattempted', 'Time Taken', 'Submitted On'],
    ...rankedStudents(report).map((s, i) => [
      i + 1, s.name, num(s.score), num(s.maxScore), `${percentOf(s)}%`,
      s.correct, s.wrong, s.unattempted, s.timeTaken, s.submittedAt,
    ]),
  ];
  // BOM so Excel opens it as UTF-8; CRLF line endings for Windows Excel
  const csv = '﻿' + rows.map(r => r.map(csvCell).join(',')).join('\r\n');
  download(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `${safeFileName(report.title)}.csv`);
};

// ---------------------------------------------------------------------------- PDF
// Landscape A4. Page 1: header, summary cards and three charts (score distribution, answer
// breakdown donut, top performers). Then the ranked results table, continued over pages.
const loadImage = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = reject;
  img.src = src;
});

const NAVY = [30, 58, 138];
const BLUE = [37, 99, 235];
const GREEN = [16, 185, 129];
const RED = [239, 68, 68];
const AMBER = [245, 158, 11];
const VIOLET = [124, 58, 237];
const TEXT = [30, 41, 59];
const MUTED = [100, 116, 139];
const LINE = [226, 232, 240];
const PANEL = [248, 250, 252];
const WHITE = [255, 255, 255];
// Score-distribution bars, low (red) to high (green)
const BAND_COLORS = [[239, 68, 68], [249, 115, 22], [245, 158, 11], [59, 130, 246], [16, 185, 129]];
// Gold, silver, bronze for the top three
const MEDALS = [[234, 179, 8], [148, 163, 184], [217, 119, 6]];

// Trim text with "..." so it fits a width
const fit = (pdf, text, maxWidth) => {
  let s = String(text ?? '');
  if (pdf.getTextWidth(s) <= maxWidth) return s;
  while (s.length > 1 && pdf.getTextWidth(`${s}...`) > maxWidth) s = s.slice(0, -1);
  return `${s}...`;
};

const setFont = (pdf, size, style = 'normal', color = TEXT) => {
  pdf.setFont('helvetica', style);
  pdf.setFontSize(size);
  pdf.setTextColor(...color);
};

// Rounded panel with a title, one per chart
const panel = (pdf, x, y, w, h, title) => {
  pdf.setFillColor(...PANEL);
  pdf.setDrawColor(...LINE);
  pdf.setLineWidth(0.2);
  pdf.roundedRect(x, y, w, h, 3, 3, 'FD');
  setFont(pdf, 10.5, 'bold');
  pdf.text(title, x + 5, y + 8);
};

// Donut chart drawn as triangle fans (jsPDF has no filled arc)
const drawDonut = (pdf, cx, cy, r, inner, segments) => {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (!total) {
    pdf.setFillColor(...LINE);
    pdf.circle(cx, cy, r, 'F');
  } else {
    let angle = -Math.PI / 2;
    segments.forEach(seg => {
      if (!seg.value) return;
      const sweep = (seg.value / total) * Math.PI * 2;
      const steps = Math.max(2, Math.ceil(sweep / (Math.PI / 90)));
      pdf.setFillColor(...seg.color);
      pdf.setDrawColor(...seg.color); // same-colour outline hides the seams between triangles
      pdf.setLineWidth(0.15);
      for (let i = 0; i < steps; i++) {
        const a0 = angle + (sweep * i) / steps;
        const a1 = angle + (sweep * (i + 1)) / steps;
        pdf.triangle(cx, cy, cx + r * Math.cos(a0), cy + r * Math.sin(a0), cx + r * Math.cos(a1), cy + r * Math.sin(a1), 'FD');
      }
      angle += sweep;
    });
  }
  pdf.setFillColor(...PANEL);
  pdf.circle(cx, cy, inner, 'F');
};

export const exportTestReportPdf = async (report) => {
  const pdf = new jsPDF('l', 'mm', 'a4');
  const pageW = pdf.internal.pageSize.getWidth(); // 297
  const pageH = pdf.internal.pageSize.getHeight(); // 210
  const margin = 12;
  const contentW = pageW - margin * 2;
  const students = rankedStudents(report);
  const pcts = students.map(percentOf);

  // ---------------- Header band
  pdf.setFillColor(...NAVY);
  pdf.rect(0, 0, pageW, 26, 'F');
  pdf.setFillColor(...BLUE);
  pdf.rect(0, 26, pageW, 1.2, 'F');
  let titleX = margin;
  try {
    pdf.addImage(await loadImage(logoImg), 'PNG', margin, 4, 18, 18);
    titleX = margin + 22;
  } catch {
    // No logo - the text header still works
  }
  setFont(pdf, 18, 'bold', WHITE);
  pdf.text('MS ACADEMY', titleX, 13);
  setFont(pdf, 9, 'normal', [191, 219, 254]);
  pdf.text('Test Performance Report', titleX, 19.5);
  pdf.text(`Exported ${today()}`, pageW - margin, 13, { align: 'right' });

  // ---------------- Test details
  let y = 37;
  setFont(pdf, 16, 'bold');
  pdf.text(fit(pdf, report.title || 'Untitled Test', contentW), margin, y);
  y += 6.5;
  setFont(pdf, 9.5, 'normal', MUTED);
  pdf.text(`${report.department || 'General'}   |   ${report.subject || 'General'}   |   Created ${report.date}`, margin, y);
  y += 7;

  // ---------------- Summary cards
  const lowest = pcts.length ? Math.min(...pcts) : 0;
  const cards = [
    { label: 'Total Attempts', value: String(report.participants), color: VIOLET },
    { label: 'Average Score', value: `${report.avgScore}%`, color: BLUE },
    { label: 'Highest Score', value: `${report.highestScore}%`, color: GREEN },
    { label: 'Lowest Score', value: `${lowest}%`, color: RED },
    { label: 'Avg Time Taken', value: report.avgTime, color: AMBER },
  ];
  const gap = 5;
  const cardW = (contentW - gap * (cards.length - 1)) / cards.length;
  const cardH = 21;
  cards.forEach((c, i) => {
    const x = margin + i * (cardW + gap);
    pdf.setFillColor(...WHITE);
    pdf.setDrawColor(...LINE);
    pdf.setLineWidth(0.2);
    pdf.roundedRect(x, y, cardW, cardH, 2.5, 2.5, 'FD');
    pdf.setFillColor(...c.color);
    pdf.roundedRect(x, y, 2.2, cardH, 1.1, 1.1, 'F');
    setFont(pdf, 15, 'bold', c.color);
    pdf.text(c.value, x + 7, y + 10);
    setFont(pdf, 7.5, 'bold', MUTED);
    pdf.text(c.label.toUpperCase(), x + 7, y + 16.5);
  });
  y += cardH + 7;

  // ---------------- Charts row
  const chartH = pageH - y - 16;
  const chartGap = 6;
  const chartW = (contentW - chartGap * 2) / 3;
  const [cx1, cx2, cx3] = [0, 1, 2].map(i => margin + i * (chartW + chartGap));

  // 1. Score distribution - vertical bars with gridlines
  panel(pdf, cx1, y, chartW, chartH, 'Score Distribution');
  {
    const plotX = cx1 + 12;
    const plotY = y + 15;
    const plotW = chartW - 18;
    const plotH = chartH - 30;
    const maxCount = Math.max(1, ...report.distribution.map(d => d.count));
    const ticks = Math.min(4, maxCount);
    pdf.setLineWidth(0.2);
    for (let t = 0; t <= ticks; t++) {
      const value = Math.round((maxCount * t) / ticks);
      const ty = plotY + plotH - (value / maxCount) * plotH;
      pdf.setDrawColor(...LINE);
      pdf.line(plotX, ty, plotX + plotW, ty);
      setFont(pdf, 7, 'normal', MUTED);
      pdf.text(String(value), plotX - 2, ty + 1, { align: 'right' });
    }
    const slot = plotW / report.distribution.length;
    const barW = slot * 0.58;
    report.distribution.forEach((d, i) => {
      const bx = plotX + i * slot + (slot - barW) / 2;
      const bh = (d.count / maxCount) * plotH;
      if (d.count > 0) {
        pdf.setFillColor(...BAND_COLORS[i % BAND_COLORS.length]);
        pdf.roundedRect(bx, plotY + plotH - bh, barW, bh, 1, 1, 'F');
        setFont(pdf, 8, 'bold');
        pdf.text(String(d.count), bx + barW / 2, plotY + plotH - bh - 1.5, { align: 'center' });
      }
      setFont(pdf, 7, 'normal', MUTED);
      pdf.text(d.range, bx + barW / 2, plotY + plotH + 5, { align: 'center' });
    });
    setFont(pdf, 7, 'normal', MUTED);
    pdf.text('Students by score band', plotX + plotW / 2, y + chartH - 3, { align: 'center' });
  }

  // 2. Answer breakdown - donut over every question of every attempt
  panel(pdf, cx2, y, chartW, chartH, 'Answer Breakdown');
  {
    const totals = students.reduce((acc, s) => ({
      correct: acc.correct + (s.correct || 0),
      wrong: acc.wrong + (s.wrong || 0),
      unattempted: acc.unattempted + (s.unattempted || 0),
    }), { correct: 0, wrong: 0, unattempted: 0 });
    const all = totals.correct + totals.wrong + totals.unattempted;
    const share = (n) => (all ? Math.round((n / all) * 100) : 0);
    const segments = [
      { label: 'Correct', value: totals.correct, color: GREEN },
      { label: 'Wrong', value: totals.wrong, color: RED },
      { label: 'Unattempted', value: totals.unattempted, color: [203, 213, 225] },
    ];
    const r = Math.min(chartW * 0.24, (chartH - 22) / 2);
    const dcx = cx2 + 8 + r;
    const dcy = y + 12 + (chartH - 12) / 2;
    drawDonut(pdf, dcx, dcy, r, r * 0.6, segments);
    setFont(pdf, 13, 'bold');
    pdf.text(`${share(totals.correct)}%`, dcx, dcy + 1, { align: 'center' });
    setFont(pdf, 6.5, 'bold', MUTED);
    pdf.text('CORRECT', dcx, dcy + 5, { align: 'center' });

    const lx = dcx + r + 8;
    let ly = dcy - 9;
    segments.forEach(seg => {
      pdf.setFillColor(...seg.color);
      pdf.roundedRect(lx, ly - 2.6, 3.2, 3.2, 0.6, 0.6, 'F');
      setFont(pdf, 8.5, 'bold');
      pdf.text(seg.label, lx + 5, ly);
      setFont(pdf, 8, 'normal', MUTED);
      pdf.text(`${seg.value} (${share(seg.value)}%)`, lx + 5, ly + 4);
      ly += 10;
    });
  }

  // 3. Top performers - horizontal bars, medal colours for the top three
  panel(pdf, cx3, y, chartW, chartH, 'Top Performers');
  {
    const top = students.slice(0, 8);
    if (top.length === 0) {
      setFont(pdf, 8.5, 'normal', MUTED);
      pdf.text('No attempts yet.', cx3 + 5, y + 18);
    }
    const nameW = 44;
    const barX = cx3 + 5 + nameW + 2;
    const barMaxW = chartW - nameW - 22;
    const rowGap = Math.min(11, (chartH - 20) / Math.max(1, top.length));
    top.forEach((s, i) => {
      const ry = y + 16 + i * rowGap;
      const pct = percentOf(s);
      setFont(pdf, 8, 'bold');
      pdf.text(fit(pdf, `${i + 1}. ${s.name}`, nameW), cx3 + 5, ry + 3);
      pdf.setFillColor(...LINE);
      pdf.roundedRect(barX, ry, barMaxW, 4.2, 1.5, 1.5, 'F');
      if (pct > 0) {
        pdf.setFillColor(...(i < 3 ? MEDALS[i] : BLUE));
        pdf.roundedRect(barX, ry, Math.max(3, (Math.min(pct, 100) / 100) * barMaxW), 4.2, 1.5, 1.5, 'F');
      }
      setFont(pdf, 8, 'bold', pct < 0 ? RED : TEXT);
      pdf.text(`${pct}%`, barX + barMaxW + 2, ry + 3.2);
    });
  }

  // ---------------- Results table (from page 2)
  pdf.addPage();
  y = 16;
  setFont(pdf, 14, 'bold');
  pdf.text('Student Results', margin, y);
  setFont(pdf, 9, 'normal', MUTED);
  pdf.text(`${students.length} student${students.length === 1 ? '' : 's'} - ranked by score, then time taken`, margin + 44, y);
  y += 6;

  // Widths add up to the landscape content width (273mm) - wide enough for every full heading
  const cols = [
    { key: 'rank', label: 'Rank', w: 16, align: 'center' },
    { key: 'name', label: 'Student', w: 84 },
    { key: 'score', label: 'Score', w: 30, align: 'right' },
    { key: 'pct', label: 'Percentage', w: 48 },
    { key: 'correct', label: 'Correct', w: 20, align: 'center' },
    { key: 'wrong', label: 'Wrong', w: 20, align: 'center' },
    { key: 'unattempted', label: 'Unattempted', w: 27, align: 'center' },
    { key: 'time', label: 'Time Taken', w: 28, align: 'right' },
  ];
  const rowH = 9;
  const pad = 2.5;
  const textAt = (text, col, x, rowY) => {
    const s = fit(pdf, text, col.w - pad * 2);
    if (col.align === 'right') pdf.text(s, x + col.w - pad, rowY, { align: 'right' });
    else if (col.align === 'center') pdf.text(s, x + col.w / 2, rowY, { align: 'center' });
    else pdf.text(s, x + pad, rowY);
  };
  const drawHeader = () => {
    pdf.setFillColor(...NAVY);
    pdf.roundedRect(margin, y, contentW, rowH, 1.5, 1.5, 'F');
    setFont(pdf, 8.5, 'bold', WHITE);
    let x = margin;
    cols.forEach(col => { textAt(col.label, col, x, y + 5.9); x += col.w; });
    y += rowH;
  };

  drawHeader();
  if (students.length === 0) {
    setFont(pdf, 9, 'normal', MUTED);
    pdf.text('No students have attempted this test yet.', margin + 3, y + 6);
  }
  students.forEach((s, i) => {
    if (y + rowH > pageH - 14) {
      pdf.addPage();
      y = 14;
      drawHeader();
    }
    if (i % 2 === 1) {
      pdf.setFillColor(...PANEL);
      pdf.rect(margin, y, contentW, rowH, 'F');
    }
    const pct = percentOf(s);
    const midY = y + 5.9;
    let x = margin;
    cols.forEach(col => {
      switch (col.key) {
        case 'rank':
          if (i < 3) {
            pdf.setFillColor(...MEDALS[i]);
            pdf.circle(x + col.w / 2, y + rowH / 2, 3.1, 'F');
            setFont(pdf, 8, 'bold', WHITE);
          } else {
            setFont(pdf, 8.5, 'bold', MUTED);
          }
          pdf.text(String(i + 1), x + col.w / 2, midY - 0.1, { align: 'center' });
          break;
        case 'name':
          setFont(pdf, 9, 'bold');
          textAt(s.name, col, x, midY);
          break;
        case 'score':
          setFont(pdf, 9, 'bold', s.score < 0 ? RED : TEXT);
          textAt(`${num(s.score)} / ${num(s.maxScore)}`, col, x, midY);
          break;
        case 'pct': {
          // Small bar + value; green >= 70%, amber >= 40%, red below
          const barW = col.w - 18;
          const bx = x + pad;
          const by = y + rowH / 2 - 1.5;
          pdf.setFillColor(...LINE);
          pdf.roundedRect(bx, by, barW, 3, 1.2, 1.2, 'F');
          if (pct > 0) {
            pdf.setFillColor(...(pct >= 70 ? GREEN : pct >= 40 ? AMBER : RED));
            pdf.roundedRect(bx, by, Math.max(2, (Math.min(pct, 100) / 100) * barW), 3, 1.2, 1.2, 'F');
          }
          setFont(pdf, 8.5, 'bold', pct < 0 ? RED : TEXT);
          pdf.text(`${pct}%`, x + col.w - pad, midY, { align: 'right' });
          break;
        }
        case 'correct':
          setFont(pdf, 9, 'bold', GREEN);
          textAt(s.correct, col, x, midY);
          break;
        case 'wrong':
          setFont(pdf, 9, 'bold', RED);
          textAt(s.wrong, col, x, midY);
          break;
        case 'unattempted':
          setFont(pdf, 9, 'bold', MUTED);
          textAt(s.unattempted, col, x, midY);
          break;
        default:
          setFont(pdf, 8.5, 'normal');
          textAt(s.timeTaken, col, x, midY);
      }
      x += col.w;
    });
    pdf.setDrawColor(...LINE);
    pdf.setLineWidth(0.2);
    pdf.line(margin, y + rowH, margin + contentW, y + rowH);
    y += rowH;
  });

  // ---------------- Footer on every page
  const pages = pdf.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    pdf.setPage(p);
    pdf.setDrawColor(...LINE);
    pdf.setLineWidth(0.2);
    pdf.line(margin, pageH - 10, pageW - margin, pageH - 10);
    setFont(pdf, 7.5, 'normal', MUTED);
    pdf.text(fit(pdf, `MS Academy  |  ${report.title}`, contentW - 40), margin, pageH - 6);
    pdf.text(`Page ${p} of ${pages}`, pageW - margin, pageH - 6, { align: 'right' });
  }

  pdf.save(`${safeFileName(report.title)}.pdf`);
};
