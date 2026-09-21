import React, { useState, useRef } from 'react';
import { Download, Plus, Trash2, Printer, FileText } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import logoImg from '../../assets/msgate_logo.png';

const amountToWords = (amount) => {
  if (amount === 0) return "Zero Rupees Only";
  const a = ["", "One ", "Two ", "Three ", "Four ", "Five ", "Six ", "Seven ", "Eight ", "Nine ", "Ten ", "Eleven ", "Twelve ", "Thirteen ", "Fourteen ", "Fifteen ", "Sixteen ", "Seventeen ", "Eighteen ", "Nineteen "];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const inWords = (num) => {
      if ((num = num.toString()).length > 9) return "overflow";
      const n = ("000000000" + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
      if (!n) return;
      let str = "";
      str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + " " + a[n[1][1]]) + "Crore " : "";
      str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + " " + a[n[2][1]]) + "Lakh " : "";
      str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + " " + a[n[3][1]]) + "Thousand " : "";
      str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + " " + a[n[4][1]]) + "Hundred " : "";
      str += (n[5] != 0) ? ((str != "") ? "and " : "") + (a[Number(n[5])] || b[n[5][0]] + " " + a[n[5][1]]) : "";
      return str.trim();
  };
  return inWords(Math.floor(amount)) + " Rupees Only";
};

export default function InvoiceGenerator() {
  const [toAddress, setToAddress] = useState('');
  const [department, setDepartment] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState([{ id: 1, particulars: '', rate: 0, quantity: 1 }]);
  const invoiceRef = useRef(null);

  const addItem = () => {
    setItems([...items, { id: Date.now(), particulars: '', rate: 0, quantity: 1 }]);
  };

  const removeItem = (id) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const handleItemChange = (id, field, value) => {
    setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const calculateSubTotal = () => {
    return items.reduce((total, item) => total + (Number(item.rate) * Number(item.quantity)), 0);
  };

  const generatePDF = async () => {
    const element = invoiceRef.current;
    if (!element) return null;

    try {
      const originalWidth = element.style.width;
      const originalMaxWidth = element.style.maxWidth;
      element.style.width = '210mm';
      element.style.maxWidth = 'none';

      const canvas = await html2canvas(element, { scale: 2, useCORS: true });

      element.style.width = originalWidth;
      element.style.maxWidth = originalMaxWidth;

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const ratio = Math.min(pdfWidth / canvas.width, pdfHeight / canvas.height);
      const imgWidth = canvas.width * ratio;
      const finalPdfHeight = canvas.height * ratio;
      
      const marginX = (pdfWidth - imgWidth) / 2;
      
      pdf.addImage(imgData, 'PNG', marginX, 0, imgWidth, finalPdfHeight);
      return pdf;
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert(`Failed to generate PDF: ${error.message || error}`);
      return null;
    }
  };

  const handleDownloadPDF = async () => {
    const pdf = await generatePDF();
    if (pdf) {
      pdf.save(`Invoice_${date}.pdf`);
    }
  };

  const handlePrint = async () => {
    const pdf = await generatePDF();
    if (pdf) {
      pdf.autoPrint();
      window.open(pdf.output('bloburl'), '_blank');
    }
  };

  const totalAmount = calculateSubTotal();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <FileText className="text-[#2563eb]" /> Invoice Generator
        </h2>
        <div className="flex gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors"
          >
            <Printer size={18} /> Print
          </button>
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 px-4 py-2 bg-[#2563eb] hover:bg-blue-700 text-[#ffffff] font-semibold rounded-lg transition-colors shadow-md"
          >
            <Download size={18} /> Download PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Editor Form */}
        <div className="bg-[#ffffff] p-6 rounded-2xl shadow-sm border border-[#e2e8f0]">
          <h3 className="text-lg font-semibold text-[#1e293b] mb-4 border-b pb-2">Invoice Details</h3>
          
          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[#334155] mb-1">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#334155] mb-1">Department</label>
                <input
                  type="text"
                  placeholder="e.g. Chemical"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#334155] mb-1">To Address</label>
              <textarea
                value={toAddress}
                onChange={(e) => setToAddress(e.target.value)}
                placeholder="Recipient Name&#10;Company Name&#10;Address..."
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-h-[100px]"
              />
            </div>
          </div>

          <div className="mb-4 flex items-center justify-between border-b pb-2">
            <h3 className="text-lg font-semibold text-[#1e293b]">Particulars</h3>
            <button
              onClick={addItem}
              className="flex items-center gap-1 text-sm text-[#2563eb] hover:text-blue-700 font-medium"
            >
              <Plus size={16} /> Add Item
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={item.id} className="flex gap-2 items-start bg-[#f8fafc] p-3 rounded-lg border border-[#f1f5f9] relative group">
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    placeholder="Particulars / Item Description"
                    value={item.particulars}
                    onChange={(e) => handleItemChange(item.id, 'particulars', e.target.value)}
                    className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                  />
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-[11px] font-semibold text-[#64748b] mb-1 uppercase">Rate (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={item.rate}
                        onChange={(e) => handleItemChange(item.id, 'rate', e.target.value)}
                        className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                      />
                    </div>
                    <div className="w-24">
                      <label className="block text-[11px] font-semibold text-[#64748b] mb-1 uppercase">Qty</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                        className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                      />
                    </div>
                    <div className="w-28 bg-[#ffffff] border border-[#e2e8f0] rounded-lg px-3 py-2 flex items-end justify-end shadow-inner">
                      <span className="text-sm font-bold text-[#334155]">₹{(item.rate * item.quantity).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                {items.length > 1 && (
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-2 text-[#f87171] hover:text-[#dc2626] hover:bg-[#fef2f2] rounded-lg transition-colors self-center mt-6"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Invoice Preview */}
        <div className="bg-[#f1f5f9] p-4 sm:p-8 rounded-2xl overflow-x-auto print:bg-[#ffffff] print:p-0">
          <div 
            ref={invoiceRef}
            className="bg-[#ffffff] p-8 sm:p-10 shadow-lg print:shadow-none mx-auto w-full max-w-[210mm] min-h-[297mm] text-black flex flex-col relative z-0 overflow-hidden"
          >
            {/* Watermark */}
            <div className="absolute inset-0 flex flex-col items-center justify-center opacity-[0.04] pointer-events-none select-none -z-10">
              <img src={logoImg} alt="Watermark Logo" className="w-[400px] h-[400px] object-contain mb-8" />
              <h2 className="text-6xl font-black text-[#1e293b] uppercase tracking-[0.2em] text-center w-full whitespace-nowrap">MS GATE ACADEMY</h2>
            </div>

            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-[#1e293b] pb-6 mb-8">
              <div className="flex items-start gap-4">
                <img src={logoImg} alt="Academy Logo" className="w-16 h-16 object-contain" />
                <div>
                  <h1 className="text-3xl font-black text-[#1e40af] tracking-tight mb-1 uppercase">MS Gate Academy</h1>
                  <p className="text-[#475569] font-medium">Coimbatore, Tamil Nadu</p>
                  <p className="text-[#64748b] text-sm mt-1">contact@msacademy.example.com</p>
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-4xl font-bold text-[#e2e8f0] tracking-wider uppercase">Invoice</h2>
                <div className="mt-4">
                  <p className="text-sm font-semibold text-[#475569]">Date:</p>
                  <p className="font-bold text-[#1e293b]">{new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="mb-10">
              <h3 className="text-sm font-bold text-[#94a3b8] uppercase tracking-wider mb-2">Billed To</h3>
              <div className="text-[#1e293b] font-medium whitespace-pre-wrap leading-relaxed min-h-[60px]">
                {toAddress || <span className="text-[#cbd5e1] italic">Recipient details will appear here...</span>}
              </div>
              {department && (
                <div className="mt-2 text-[#1e293b] font-medium">
                  <span className="text-[#64748b]">Department:</span> {department}
                </div>
              )}
            </div>

            {/* Table */}
            <table className="w-full mb-8">
              <thead>
                <tr className="bg-[#1e293b] text-[#ffffff]">
                  <th className="py-3 px-4 text-left text-sm font-semibold w-12">#</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold">Particulars</th>
                  <th className="py-3 px-4 text-right text-sm font-semibold w-32">Rate</th>
                  <th className="py-3 px-4 text-right text-sm font-semibold w-24">Qty</th>
                  <th className="py-3 px-4 text-right text-sm font-semibold w-36">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={item.id} className="border-b border-[#e2e8f0]">
                    <td className="py-4 px-4 text-[#64748b] text-sm">{index + 1}</td>
                    <td className="py-4 px-4 text-[#1e293b] font-medium">{item.particulars || '-'}</td>
                    <td className="py-4 px-4 text-[#475569] text-right">₹{Number(item.rate).toFixed(2)}</td>
                    <td className="py-4 px-4 text-[#475569] text-right">{item.quantity}</td>
                    <td className="py-4 px-4 text-[#1e293b] font-bold text-right">₹{(item.rate * item.quantity).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Total and Words */}
            <div className="flex flex-col mb-16">
              <div className="flex justify-end mb-6">
                <div className="w-72">
                  <div className="flex justify-between items-center py-2 border-b border-[#e2e8f0]">
                    <span className="text-[#475569] font-medium">Subtotal</span>
                    <span className="text-[#1e293b] font-bold">₹{totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center py-4 bg-[#f8fafc] px-4 mt-2 rounded-lg">
                    <span className="text-lg font-bold text-[#1e293b]">Total</span>
                    <span className="text-xl font-black text-[#2563eb]">₹{totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              <div className="bg-[#eff6ff] p-4 rounded-lg border border-[#dbeafe] w-full">
                <p className="text-sm text-[#64748b] font-semibold mb-1 uppercase tracking-wider">Amount in Words:</p>
                <p className="text-[#1e293b] font-bold capitalize">{amountToWords(totalAmount)}</p>
              </div>
            </div>

            {/* Signature & Stamp */}
            <div className="mt-auto pt-10 flex justify-end">
              <div className="text-center w-64">
                <div className="h-24 border-b-2 border-[#cbd5e1] relative mb-2">
                  <div className="absolute inset-0 flex items-center justify-center opacity-10">
                    <img src={logoImg} alt="Stamp Placeholder" className="w-20 h-20 object-contain" />
                  </div>
                </div>
                <p className="font-bold text-[#1e293b]">Authorized Signature</p>
                <p className="text-sm text-[#64748b]">MS Gate Academy</p>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-8 border-t border-[#e2e8f0] mt-10 text-center">
              <p className="text-[#64748b] font-medium mb-1">Thank you for your business!</p>
              <p className="text-[#94a3b8] text-sm">For any inquiries, please contact us at support@msacademy.example.com</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
