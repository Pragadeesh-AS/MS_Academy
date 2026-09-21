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

  const handleDownloadPDF = async () => {
    const element = invoiceRef.current;
    if (!element) return;

    try {
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, allowTaint: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Invoice_${date}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const totalAmount = calculateSubTotal();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <FileText className="text-blue-600" /> Invoice Generator
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
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors shadow-md"
          >
            <Download size={18} /> Download PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Editor Form */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b pb-2">Invoice Details</h3>
          
          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Department</label>
                <input
                  type="text"
                  placeholder="e.g. Chemical"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">To Address</label>
              <textarea
                value={toAddress}
                onChange={(e) => setToAddress(e.target.value)}
                placeholder="Recipient Name&#10;Company Name&#10;Address..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-h-[100px]"
              />
            </div>
          </div>

          <div className="mb-4 flex items-center justify-between border-b pb-2">
            <h3 className="text-lg font-semibold text-slate-800">Particulars</h3>
            <button
              onClick={addItem}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              <Plus size={16} /> Add Item
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={item.id} className="flex gap-2 items-start bg-slate-50 p-3 rounded-lg border border-slate-100 relative group">
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    placeholder="Particulars / Item Description"
                    value={item.particulars}
                    onChange={(e) => handleItemChange(item.id, 'particulars', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                  />
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase">Rate (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={item.rate}
                        onChange={(e) => handleItemChange(item.id, 'rate', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                      />
                    </div>
                    <div className="w-24">
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase">Qty</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                      />
                    </div>
                    <div className="w-28 bg-white border border-slate-200 rounded-lg px-3 py-2 flex items-end justify-end shadow-inner">
                      <span className="text-sm font-bold text-slate-700">₹{(item.rate * item.quantity).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                {items.length > 1 && (
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors self-center mt-6"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Invoice Preview */}
        <div className="bg-slate-100 p-4 sm:p-8 rounded-2xl overflow-x-auto print:bg-white print:p-0">
          <div 
            ref={invoiceRef}
            className="bg-white p-8 sm:p-10 shadow-lg print:shadow-none mx-auto w-full max-w-[210mm] min-h-[297mm] text-black flex flex-col relative"
          >
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-8">
              <div className="flex items-start gap-4">
                <img src={logoImg} alt="Academy Logo" className="w-16 h-16 object-contain" />
                <div>
                  <h1 className="text-3xl font-black text-blue-800 tracking-tight mb-1 uppercase">MS Gate Academy</h1>
                  <p className="text-slate-600 font-medium">Coimbatore, Tamil Nadu</p>
                  <p className="text-slate-500 text-sm mt-1">contact@msacademy.example.com</p>
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-4xl font-bold text-slate-200 tracking-wider uppercase">Invoice</h2>
                <div className="mt-4">
                  <p className="text-sm font-semibold text-slate-600">Date:</p>
                  <p className="font-bold text-slate-800">{new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="mb-10">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Billed To</h3>
              <div className="text-slate-800 font-medium whitespace-pre-wrap leading-relaxed min-h-[60px]">
                {toAddress || <span className="text-slate-300 italic">Recipient details will appear here...</span>}
              </div>
              {department && (
                <div className="mt-2 text-slate-800 font-medium">
                  <span className="text-slate-500">Department:</span> {department}
                </div>
              )}
            </div>

            {/* Table */}
            <table className="w-full mb-8">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="py-3 px-4 text-left text-sm font-semibold w-12">#</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold">Particulars</th>
                  <th className="py-3 px-4 text-right text-sm font-semibold w-32">Rate</th>
                  <th className="py-3 px-4 text-right text-sm font-semibold w-24">Qty</th>
                  <th className="py-3 px-4 text-right text-sm font-semibold w-36">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={item.id} className="border-b border-slate-200">
                    <td className="py-4 px-4 text-slate-500 text-sm">{index + 1}</td>
                    <td className="py-4 px-4 text-slate-800 font-medium">{item.particulars || '-'}</td>
                    <td className="py-4 px-4 text-slate-600 text-right">₹{Number(item.rate).toFixed(2)}</td>
                    <td className="py-4 px-4 text-slate-600 text-right">{item.quantity}</td>
                    <td className="py-4 px-4 text-slate-800 font-bold text-right">₹{(item.rate * item.quantity).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Total and Words */}
            <div className="flex flex-col mb-16">
              <div className="flex justify-end mb-6">
                <div className="w-72">
                  <div className="flex justify-between items-center py-2 border-b border-slate-200">
                    <span className="text-slate-600 font-medium">Subtotal</span>
                    <span className="text-slate-800 font-bold">₹{totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center py-4 bg-slate-50 px-4 mt-2 rounded-lg">
                    <span className="text-lg font-bold text-slate-800">Total</span>
                    <span className="text-xl font-black text-blue-600">₹{totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 w-full">
                <p className="text-sm text-slate-500 font-semibold mb-1 uppercase tracking-wider">Amount in Words:</p>
                <p className="text-slate-800 font-bold capitalize">{amountToWords(totalAmount)}</p>
              </div>
            </div>

            {/* Signature & Stamp */}
            <div className="mt-auto pt-10 flex justify-end">
              <div className="text-center w-64">
                <div className="h-24 border-b-2 border-slate-300 relative mb-2">
                  <div className="absolute inset-0 flex items-center justify-center opacity-10">
                    <img src={logoImg} alt="Stamp Placeholder" className="w-20 h-20 object-contain" />
                  </div>
                </div>
                <p className="font-bold text-slate-800">Authorized Signature</p>
                <p className="text-sm text-slate-500">MS Gate Academy</p>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-8 border-t border-slate-200 mt-10 text-center">
              <p className="text-slate-500 font-medium mb-1">Thank you for your business!</p>
              <p className="text-slate-400 text-sm">For any inquiries, please contact us at support@msacademy.example.com</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Hide elements when printing */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #root, #root * {
            visibility: hidden;
          }
          .print\\:bg-white {
            background-color: white !important;
          }
          .print\\:p-0 {
            padding: 0 !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .min-h-\\[297mm\\] {
             min-height: auto !important;
          }
          
          /* The actual invoice container to print */
          .text-black { 
             color: black !important;
          }
          div[style*="max-width: 210mm"], div[class*="max-w-[210mm]"] {
            visibility: visible;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          div[style*="max-width: 210mm"] *, div[class*="max-w-[210mm]"] * {
            visibility: visible;
          }
        }
      `}</style>
    </div>
  );
}

