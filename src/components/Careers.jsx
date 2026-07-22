import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GraduationCap, Briefcase, MapPin, Upload, X, CheckCircle2, 
  ArrowRight, Sparkles, FileText, AlertCircle, RefreshCw 
} from 'lucide-react';
import { ShinyButton } from "./ui/shiny-button";

export default function Careers() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState('GATE Coaching Teacher');
  
  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    experience: 'Fresher',
    specialization: '',
    message: ''
  });
  
  // File Upload State
  const [resumeFile, setResumeFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [panelState, setPanelState] = useState('form');

  const fileInputRef = useRef(null);
  const openingsRef = useRef(null);

  // Job openings list - focused, clean content
  const jobs = [
    {
      id: 'gate-teacher',
      title: 'GATE Coaching Teachers',
      status: 'ACTIVELY HIRING',
      details: 'Full Time / Part Time  •  Coimbatore, India',
      desc: 'Join our team of NIT/IIT alumni to mentor GATE aspirants in core engineering disciplines. We are seeking subject specialists who can simplify complex topics and design mock tests (CBT).'
    },
    {
      id: 'school-teacher',
      title: 'School Teachers (6th – 12th)',
      status: 'OPEN APPLICATION',
      details: 'Full Time  •  Coimbatore, India',
      desc: 'Teach high school students (CBSE/State Board) to build strong conceptual foundations in Mathematics, Physics, Chemistry, or Computer Science. Previous coaching experience is preferred.'
    }
  ];

  const handleScrollToOpenings = () => {
    openingsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleOpenApply = (jobTitle) => {
    setSelectedRole(jobTitle);
    setPanelState('form');
    setIsModalOpen(true);
  };

  // Form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Drag & drop file handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleFileSelection = (file) => {
    const allowedTypes = ['.pdf', '.doc', '.docx'];
    const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!allowedTypes.includes(extension)) {
      setFormErrors(prev => ({ 
        ...prev, 
        resume: 'Only PDF, DOC, or DOCX files are allowed.' 
      }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormErrors(prev => ({ 
        ...prev, 
        resume: 'File size must be under 5MB.' 
      }));
      return;
    }

    setFormErrors(prev => ({ ...prev, resume: '' }));
    setResumeFile(file);
    simulateFileUpload();
  };

  const simulateFileUpload = () => {
    setIsUploading(true);
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          return 100;
        }
        return prev + 10;
      });
    }, 150);
  };

  const removeFile = () => {
    setResumeFile(null);
    setUploadProgress(0);
    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const errors = {};
    if (!formData.fullName.trim()) errors.fullName = 'Full name is required';
    if (!formData.email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Invalid email address';
    }
    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required';
    } else if (!/^\+?[\d\s-]{10,15}$/.test(formData.phone.replace(/\s/g, ''))) {
      errors.phone = 'Invalid phone number';
    }
    if (!formData.specialization.trim()) errors.specialization = 'Subject or specialization is required';
    if (!resumeFile) errors.resume = 'Please upload your resume';
    if (isUploading) errors.resume = 'Please wait for upload to finish';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setPanelState('submitting');
    
    // Save to localStorage
    const newApplication = {
      id: 'app-' + Date.now(),
      fullName: formData.fullName,
      email: formData.email,
      phone: formData.phone,
      experience: formData.experience,
      specialization: formData.specialization,
      message: formData.message || 'No cover letter message provided.',
      role: selectedRole,
      date: new Date().toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }),
      status: 'Pending'
    };

    try {
      const existing = localStorage.getItem('career_applications');
      const apps = existing ? JSON.parse(existing) : [];
      apps.unshift(newApplication);
      localStorage.setItem('career_applications', JSON.stringify(apps));
    } catch (err) {
      console.error('Failed to save career application', err);
    }

    setTimeout(() => {
      setPanelState('success');
    }, 2000);
  };

  const handleCloseModal = () => {
    if (panelState !== 'submitting') {
      setIsModalOpen(false);
      handleReset();
    }
  };

  const handleReset = () => {
    setFormData({
      fullName: '',
      email: '',
      phone: '',
      experience: 'Fresher',
      specialization: '',
      message: ''
    });
    setResumeFile(null);
    setUploadProgress(0);
    setFormErrors({});
    setPanelState('form');
  };

  return (
    <div className="w-full flex flex-col items-center">
      
      {/* Hero Section */}
      <section className="relative w-full px-6 pt-4 pb-20 max-w-[1200px] mx-auto mt-2 flex flex-col lg:flex-row items-center justify-between gap-12">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-gradient-to-r from-blue-100/30 to-transparent blur-[80px] -z-10 pointer-events-none"></div>

        {/* Left Side: Text */}
        <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left">
          <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-blue-50 text-[#1d4ed8] font-bold text-xs uppercase tracking-wider w-fit border border-blue-100 mb-6">
            <Sparkles size={14} className="animate-pulse" />
            <span>We are hiring</span>
          </div>
          <h1 className="text-[46px] md:text-[64px] font-[900] text-slate-900 leading-[1.1] tracking-[-0.03em] mb-6">
            Teach at <span className="text-[#1d4ed8]">MS Academy</span>
          </h1>
          <p className="text-[18px] md:text-[20px] text-slate-500 leading-relaxed max-w-[600px] mb-10 font-medium">
            Join our team of NIT/IIT alumni and subject specialists. Help us deliver high-quality conceptual training to student batches in Coimbatore.
          </p>
          <div className="flex gap-4">
            <ShinyButton 
              onClick={handleScrollToOpenings}
              className="px-8 py-4 text-[17px] font-semibold text-white rounded-xl bg-gradient-to-b from-[#4a4a4a] via-[#2a2a2a] to-[#111111] shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:scale-[1.02] transition-transform border border-[#333333]"
            >
              Explore Openings
            </ShinyButton>
          </div>
        </div>

        {/* Right Side: Academy Logo Branding Container */}
        <div className="flex-1 w-full max-w-[480px] flex justify-center items-center lg:pl-8">
          <div 
            style={{ 
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.8), rgba(248, 250, 252, 0.5))',
              border: '1px solid rgba(226, 232, 240, 0.8)',
              backdropFilter: 'blur(12px)'
            }}
            className="w-full aspect-[1.1] rounded-[2.5rem] shadow-xl p-8 flex flex-col items-center justify-center text-center relative overflow-hidden group"
          >
            {/* Background glowing circle */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-blue-100/30 blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-700"></div>
            
            {/* Logo Wrapper with shadow */}
            <div className="w-32 h-32 rounded-[2rem] bg-white border border-slate-100 shadow-md flex items-center justify-center p-5 z-10 hover:scale-105 transition-transform duration-500">
              <img 
                src="/logo.png" 
                alt="MS Academy Logo" 
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.target.src = "https://placehold.co/150x150/fff5f0/f36b2b?text=MS+ACADEMY";
                }}
              />
            </div>

            {/* Academy Name */}
            <div className="flex flex-col gap-1 mt-6 z-10">
              <h2 className="text-2xl font-[900] text-slate-900 tracking-tight">MS Academy</h2>
              <p className="text-xs font-bold tracking-widest text-[#1d4ed8] uppercase">MOULDING SCHOLARS</p>
              <div className="flex items-center justify-center gap-1.5 mt-2 text-slate-400 text-[11px] font-bold">
                <MapPin size={12} className="text-[#1d4ed8]" />
                <span>Coimbatore, Tamil Nadu</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Job Openings Section - Core Focus */}
      <section ref={openingsRef} className="w-full bg-slate-50/40 border-y border-slate-100 py-24">
        <div className="w-full max-w-[1000px] mx-auto px-6 flex flex-col gap-12">
          
          <div className="text-center">
            <span className="text-[12px] md:text-[14px] font-bold text-[#1d4ed8] tracking-widest uppercase mb-3 block">CAREER OPPORTUNITIES</span>
            <h2 className="text-3xl md:text-5xl font-[900] text-slate-900 tracking-tight leading-[1.1]">Open Positions</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
            {jobs.map((job) => (
              <div 
                key={job.id}
                style={{ 
                  background: 'linear-gradient(to bottom right, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.9))', 
                  border: '1px solid rgba(226, 232, 240, 0.8)',
                  borderRadius: '24px'
                }}
                className="p-6 md:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_40px_rgba(243,107,43,0.06)] hover:-translate-y-0.5 transition-all duration-500 group flex flex-col gap-5 text-left h-full"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div 
                      style={{ backgroundColor: '#eff6ff', border: '1px solid #ffeadd' }}
                      className="w-12 h-12 rounded-xl text-[#1d4ed8] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-500 shadow-inner"
                    >
                      <GraduationCap size={22} strokeWidth={2} />
                    </div>
                    <div className="flex flex-col">
                      <h3 className="text-2xl md:text-[26px] font-[900] text-slate-900 group-hover:text-[#1d4ed8] transition-colors leading-tight tracking-tight">
                        {job.title}
                      </h3>
                      <p className="text-sm md:text-[15px] text-slate-500 font-bold mt-1.5 leading-none">
                        {job.details}
                      </p>
                    </div>
                  </div>
                  
                  {/* Status Pill Badge */}
                  <span 
                    style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      height: '24px', 
                      padding: '0 16px',
                      fontSize: '11px',
                      fontWeight: '900',
                      letterSpacing: '0.05em',
                      borderRadius: '9999px',
                      border: '1px solid',
                      borderColor: job.status === 'ACTIVELY HIRING' ? 'rgba(243, 107, 43, 0.25)' : 'rgba(124, 58, 237, 0.25)',
                      color: job.status === 'ACTIVELY HIRING' ? '#1d4ed8' : '#7c3aed',
                      backgroundColor: job.status === 'ACTIVELY HIRING' ? '#eff6ff' : '#f5f3ff',
                      width: 'fit-content',
                      lineHeight: '1'
                    }}
                    className="uppercase self-start sm:self-auto"
                  >
                    {job.status}
                  </span>
                </div>

                {/* Description */}
                <p className="text-slate-600 text-[16px] md:text-[18px] leading-relaxed font-semibold flex-grow mt-2">
                  {job.desc}
                </p>

                {/* Apply button */}
                <div className="flex items-center mt-auto pt-2">
                  <button 
                    onClick={() => handleOpenApply(job.title)}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 font-semibold text-white rounded-lg bg-gradient-to-b from-[#3a3a3a] to-[#1a1a1a] shadow-md hover:from-[#2a2a2a] hover:to-[#0a0a0a] transition-all border border-[#2a2a2a] cursor-pointer outline-none"
                  >
                    <span>Apply Now</span>
                    <ArrowRight size={18} />
                  </button>
                </div>

              </div>
            ))}
          </div>

        </div>
      </section>

      {/* Recrutement Contact Footer Link */}
      <section className="w-full max-w-[850px] mx-auto px-6 py-16 text-center">
        <p className="text-slate-500 text-xs md:text-sm leading-relaxed font-semibold">
          Questions about our recruitment? Reach us at <a href="mailto:msacademics.edu@gmail.com" className="text-[#1d4ed8] hover:underline font-bold">msacademics.edu@gmail.com</a> or call <a href="tel:+918012052331" className="text-slate-800 hover:text-[#1d4ed8] font-bold">+91 80120 52331</a>.
        </p>
      </section>

      {/* Interactive Modal Application Portal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-start justify-center p-4 overflow-y-auto">
            
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseModal}
              style={{ backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)' }}
              className="absolute inset-0"
            />
            
            {/* Modal Body container */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              style={{ 
                background: 'linear-gradient(to bottom, #ffffff, #fafafa)', 
                border: '1px solid #e2e8f0', 
                borderRadius: '24px',
                maxWidth: '520px',
                width: '100%',
                marginTop: '80px',
                marginBottom: '40px'
              }}
              className="relative z-10 shadow-2xl p-6 md:p-8 flex flex-col gap-5"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-3.5">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-[#1d4ed8] tracking-widest uppercase">ONLINE APPLICATION</span>
                  <h3 className="text-lg font-[900] text-slate-900 mt-0.5 leading-snug">
                    {selectedRole}
                  </h3>
                </div>
                {panelState !== 'submitting' && (
                  <button 
                    onClick={handleCloseModal}
                    className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer outline-none border-none mt-1"
                    title="Close"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>

              {/* Modal Content Switch */}
              <AnimatePresence mode="wait">
                {/* FORM STATE */}
                {panelState === 'form' && (
                  <motion.form 
                    key="form"
                    onSubmit={handleSubmit}
                    className="flex flex-col gap-4"
                  >
                    {/* Full Name */}
                    <div className="flex flex-col">
                      <label className="text-[10px] font-black text-slate-500 tracking-widest uppercase mb-1.5">Full Name *</label>
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        placeholder="Enter your full name"
                        style={{ border: '1px solid #e2e8f0', borderRadius: '12px', height: '44px', padding: '0 14px', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)' }}
                        className="w-full bg-white text-slate-800 text-sm font-semibold placeholder:text-slate-400 focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/15 outline-none transition-all"
                      />
                      {formErrors.fullName && (
                        <div className="flex items-center gap-1 mt-1 text-red-500 text-xs font-semibold">
                          <AlertCircle size={12} />
                          <span>{formErrors.fullName}</span>
                        </div>
                      )}
                    </div>

                    {/* Email & Phone grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Email */}
                      <div className="flex flex-col">
                        <label className="text-[10px] font-black text-slate-500 tracking-widest uppercase mb-1.5">Email Address *</label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="john@example.com"
                          style={{ border: '1px solid #e2e8f0', borderRadius: '12px', height: '44px', padding: '0 14px', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)' }}
                          className="w-full bg-white text-slate-800 text-sm font-semibold placeholder:text-slate-400 focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/15 outline-none transition-all"
                        />
                        {formErrors.email && (
                          <div className="flex items-center gap-1 mt-1 text-red-500 text-xs font-semibold">
                            <AlertCircle size={12} />
                            <span>{formErrors.email}</span>
                          </div>
                        )}
                      </div>

                      {/* Phone */}
                      <div className="flex flex-col">
                        <label className="text-[10px] font-black text-slate-500 tracking-widest uppercase mb-1.5">Phone Number *</label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          placeholder="10-digit number"
                          style={{ border: '1px solid #e2e8f0', borderRadius: '12px', height: '44px', padding: '0 14px', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)' }}
                          className="w-full bg-white text-slate-800 text-sm font-semibold placeholder:text-slate-400 focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/15 outline-none transition-all"
                        />
                        {formErrors.phone && (
                          <div className="flex items-center gap-1 mt-1 text-red-500 text-xs font-semibold">
                            <AlertCircle size={12} />
                            <span>{formErrors.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Experience & Specialization */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Experience Dropdown with Custom Chevron */}
                      <div className="flex flex-col">
                        <label className="text-[10px] font-black text-slate-500 tracking-widest uppercase mb-1.5">Experience *</label>
                        <div className="relative flex items-center w-full">
                          <select
                            name="experience"
                            value={formData.experience}
                            onChange={handleInputChange}
                            style={{ 
                              border: '1px solid #e2e8f0', 
                              borderRadius: '12px', 
                              height: '44px', 
                              padding: '0 14px', 
                              paddingRight: '40px', 
                              WebkitAppearance: 'none', 
                              MozAppearance: 'none', 
                              appearance: 'none',
                              backgroundImage: 'none',
                              backgroundColor: '#ffffff',
                              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)' 
                            }}
                            className="w-full text-slate-800 text-sm font-semibold focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/10 outline-none transition-all cursor-pointer"
                          >
                            <option value="Fresher">Fresher (Entry)</option>
                            <option value="1-2 Years">1 - 2 Years</option>
                            <option value="3-5 Years">3 - 5 Years</option>
                            <option value="5+ Years">5+ Years</option>
                          </select>
                          <div className="absolute right-3.5 h-full flex items-center pointer-events-none text-slate-400">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="m6 9 6 6 6-6"/>
                            </svg>
                          </div>
                        </div>
                      </div>

                      {/* Specialization */}
                      <div className="flex flex-col">
                        <label className="text-[10px] font-black text-slate-500 tracking-widest uppercase mb-1.5">Specialization *</label>
                        <input
                          type="text"
                          name="specialization"
                          value={formData.specialization}
                          onChange={handleInputChange}
                          placeholder="e.g. CSE, Mathematics"
                          style={{ border: '1px solid #e2e8f0', borderRadius: '12px', height: '44px', padding: '0 14px', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)' }}
                          className="w-full bg-white text-slate-800 text-sm font-semibold placeholder:text-slate-400 focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/15 outline-none transition-all"
                        />
                        {formErrors.specialization && (
                          <div className="flex items-center gap-1 mt-1 text-red-500 text-xs font-semibold">
                            <AlertCircle size={12} />
                            <span>{formErrors.specialization}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Resume Upload Dropzone */}
                    <div className="flex flex-col">
                      <label className="text-[10px] font-black text-slate-500 tracking-widest uppercase mb-1.5">Resume (PDF/DOCX) *</label>
                      
                      {!resumeFile ? (
                        <div 
                          onDragEnter={handleDrag}
                          onDragOver={handleDrag}
                          onDragLeave={handleDrag}
                          onDrop={handleDrop}
                          onClick={() => fileInputRef.current?.click()}
                          style={{ 
                            border: '2px dashed #ffd0b5', 
                            background: 'linear-gradient(to bottom right, #fffaf8, #fffdfc)', 
                            borderRadius: '16px',
                            padding: '24px'
                          }}
                          className="flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-blue-50/10 text-center"
                        >
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,.doc,.docx"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                          <div className="w-11 h-11 rounded-full bg-white border border-[#ffd0b5] text-[#1d4ed8] flex items-center justify-center mb-3 shadow-[0_2px_10px_rgba(243,107,43,0.05)]">
                            <Upload size={16} />
                          </div>
                          <span className="text-xs font-bold text-slate-700">Drag & drop or click to browse</span>
                          <span className="text-[10px] text-slate-400 mt-1 font-bold">Max size: 5MB</span>
                        </div>
                      ) : (
                        <div 
                          style={{ border: '1px solid #e2e8f0', borderRadius: '12px' }}
                          className="p-3.5 bg-slate-50 flex items-center justify-between gap-3 shadow-inner"
                        >
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1d4ed8] flex items-center justify-center flex-shrink-0 border border-blue-100">
                              {isUploading ? (
                                <RefreshCw size={14} className="animate-spin text-[#1d4ed8]" />
                              ) : (
                                <FileText size={14} />
                              )}
                            </div>
                            <div className="flex flex-col overflow-hidden">
                              <span className="text-xs font-bold text-slate-800 truncate max-w-[200px]">{resumeFile.name}</span>
                              <span className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">
                                {isUploading ? `Uploading... ${uploadProgress}%` : 'File Attached'}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={removeFile}
                            className="p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer outline-none border-none"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}
                      
                      {isUploading && (
                        <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden mt-1">
                          <div 
                            className="h-full bg-gradient-to-r from-[#1d4ed8] to-blue-400 transition-all duration-150"
                            style={{ width: `${uploadProgress}%` }}
                          ></div>
                        </div>
                      )}

                      {formErrors.resume && (
                        <div className="flex items-center gap-1 mt-1 text-red-500 text-xs font-semibold">
                          <AlertCircle size={12} />
                          <span>{formErrors.resume}</span>
                        </div>
                      )}
                    </div>

                    {/* Cover Letter Message */}
                    <div className="flex flex-col">
                      <label className="text-[10px] font-black text-slate-500 tracking-widest uppercase mb-1.5">Cover Letter / Message (Optional)</label>
                      <textarea
                        name="message"
                        value={formData.message}
                        onChange={handleInputChange}
                        rows={2}
                        placeholder="Tell us about yourself..."
                        style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 14px', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)' }}
                        className="w-full bg-white text-slate-850 text-sm font-semibold placeholder:text-slate-400 focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/10 outline-none transition-all resize-none"
                      />
                    </div>

                    {/* Submit Button */}
                    <button 
                      type="submit"
                      disabled={isUploading}
                      style={{ 
                        height: '46px' 
                      }}
                      className={`w-full inline-flex items-center justify-center gap-2 font-semibold text-white rounded-lg bg-gradient-to-b from-[#3a3a3a] to-[#1a1a1a] shadow-md hover:from-[#2a2a2a] hover:to-[#0a0a0a] transition-all border border-[#2a2a2a] cursor-pointer outline-none ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <span>Submit Application</span>
                      <ArrowRight size={16} />
                    </button>
                  </motion.form>
                )}

                {/* SUBMITTING STATE */}
                {panelState === 'submitting' && (
                  <motion.div 
                    key="submitting"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex flex-col items-center justify-center text-center gap-4 py-8 min-h-[300px]"
                  >
                    <div className="w-10 h-10 rounded-full border-2 border-blue-100 border-t-[#1d4ed8] animate-spin"></div>
                    <div className="flex flex-col gap-1.5">
                      <h4 className="text-base font-bold text-slate-800">Submitting Application</h4>
                      <p className="text-xs text-slate-500 max-w-xs leading-relaxed font-semibold">
                        Uploading your resume and credentials to the MS Academy recruiter portal.
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* SUCCESS STATE */}
                {panelState === 'success' && (
                  <motion.div 
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex flex-col items-center text-center gap-5 py-6 min-h-[300px] justify-center"
                  >
                    <div className="w-14 h-14 rounded-full bg-green-50 border border-green-100 text-green-500 flex items-center justify-center mb-1 shadow-inner animate-pulse">
                      <CheckCircle2 size={28} strokeWidth={2} />
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">Application Sent!</h3>
                      <p className="text-xs text-slate-500 leading-relaxed max-w-xs font-semibold">
                        Thank you for applying, <span className="font-bold text-slate-800">{formData.fullName}</span>! We have received your application for the role of <span className="font-bold text-[#1d4ed8]">{selectedRole}</span>.
                      </p>
                      <p className="text-[10px] text-slate-400 leading-relaxed max-w-xs mt-1 border-t border-slate-100 pt-3 font-semibold">
                        Our panel will contact you at <span className="font-bold text-slate-600">{formData.email}</span> or by phone soon.
                      </p>
                    </div>

                    <button 
                      onClick={handleCloseModal}
                      className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-slate-950 hover:bg-[#1d4ed8] text-white font-bold text-xs transition-all duration-300 shadow-md cursor-pointer outline-none"
                    >
                      <span>Close Window</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
