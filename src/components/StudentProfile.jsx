import React, { useEffect, useState } from 'react';
import Loader from './Loader';
import { useNavigate } from 'react-router-dom';
import { 
  User, Mail, Building2, School, Calendar, HelpCircle, ArrowLeft, GraduationCap, 
  Edit2, ShieldCheck, Link, Lock, Camera, Check, MapPin, BookOpen, Trophy, Flame, 
  Star, Search, Briefcase, FileText, Download, Smartphone, Share2, Settings, 
  CheckCircle2, AlertCircle, ExternalLink, Code, Zap
} from 'lucide-react';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { updatePassword } from 'firebase/auth';
import { motion } from 'framer-motion';
import { SKILLS } from './skillsList';

const SKILL_STYLES = [
  "text-blue-600 bg-blue-50",
  "text-orange-600 bg-orange-50",
  "text-yellow-600 bg-yellow-50",
  "text-cyan-600 bg-cyan-50",
  "text-green-600 bg-green-50",
  "text-purple-600 bg-purple-50",
  "text-pink-600 bg-pink-50"
];

const DEPARTMENT_OPTIONS = [
  "Computer Science (CSE)", "Electronics (ECE)", "Mechanical (ME)", "Civil (CE)", "Electrical (EE)",
  "Data Science & AI (DS)", "Production & Industrial Engg (PI)", "Instrumentation Engg (IN)",
  "Biotechnology (BT)", "Chemical Engineering (CH)", "Biomedical Engineering (BM)", "Physics (PH)",
  "Architecture & Planning (AR)", "Agricultural Engineering (AG)", "Metallurgical Engineering (MT)",
  "Environmental Science (ES)", "Life Sciences (XL)", "Aerospace Engineering (AE)", "Other"
];

const YEAR_OPTIONS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "Graduated / Working"];

const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-[14px] focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100 transition-all bg-slate-50 hover:bg-white focus:bg-white";

const AVATAR_SIZE = 256;
const MAX_UPLOAD_MB = 5;

const fileToAvatarDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(new Error('Could not read the selected file.'));
  reader.onload = () => {
    const img = new Image();
    img.onerror = () => reject(new Error('That file is not a valid image.'));
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const sx = (img.width - side) / 2;
      const sy = (img.height - side) / 2;
      const canvas = document.createElement('canvas');
      canvas.width = AVATAR_SIZE;
      canvas.height = AVATAR_SIZE;
      canvas.getContext('2d').drawImage(img, sx, sy, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
});

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function StudentProfile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [docId, setDocId] = useState(null);

  // Edit Mode States
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({
    avatarUrl: '',
    department: '',
    collegeName: '',
    yearOfStudy: '',
    cgpa: '',
    batch: '',
    location: '',
    skills: [],
    newPassword: '',
    githubUrl: '',
    linkedinUrl: '',
    portfolioUrl: '',
    resumeUrl: ''
  });
  const [skillSearch, setSkillSearch] = useState('');
  const [skillMenuOpen, setSkillMenuOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const role = sessionStorage.getItem('auth_role');
    const email = sessionStorage.getItem('auth_email');
    
    if (role !== 'student') {
      navigate('/login');
      return;
    }

    const fetchProfile = async () => {
      try {
        if (email) {
          const q = query(collection(db, 'joined_students'), where('email', '==', email));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const studentDoc = querySnapshot.docs[0];
            const data = studentDoc.data();
            setDocId(studentDoc.id);
            setProfileData(data);
            setEditFormData({
              avatarUrl: data.avatarUrl || '',
              department: data.department || '',
              collegeName: data.collegeName || '',
              yearOfStudy: data.yearOfStudy || '',
              cgpa: data.cgpa || '',
              batch: data.batch || '',
              location: data.location || '',
              skills: Array.isArray(data.skills) ? data.skills : [],
              newPassword: '',
              githubUrl: data.githubUrl || '',
              linkedinUrl: data.linkedinUrl || '',
              portfolioUrl: data.portfolioUrl || '',
              resumeUrl: data.resumeUrl || ''
            });
          }
        }
      } catch (e) {
        console.error("Failed to fetch profile details", e);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, [navigate]);

  const handleAvatarFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setErrorMsg('');
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please choose an image file (JPG, PNG, WebP...).');
      return;
    }
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setErrorMsg(`Image is too large. Please choose one under ${MAX_UPLOAD_MB} MB.`);
      return;
    }
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      setEditFormData(prev => ({ ...prev, avatarUrl: dataUrl }));
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const addSkill = (skill) => {
    if (!editFormData.skills.includes(skill)) {
      setEditFormData({ ...editFormData, skills: [...editFormData.skills, skill] });
    }
    setSkillSearch('');
  };

  const skillMatches = SKILLS
    .filter(sk => !editFormData.skills.includes(sk) && sk.toLowerCase().includes(skillSearch.trim().toLowerCase()))
    .sort((x, y) => {
      // Names that start with the search text come first
      const q = skillSearch.trim().toLowerCase();
      return Number(y.toLowerCase().startsWith(q)) - Number(x.toLowerCase().startsWith(q));
    })
    .slice(0, 50);

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (editFormData.newPassword) {
        if (auth.currentUser) {
          await updatePassword(auth.currentUser, editFormData.newPassword);
        } else {
          throw new Error("You must be logged in to update your password. Please sign out and sign in again.");
        }
      }

      if (docId) {
        const skills = editFormData.skills;

        const updates = {
          avatarUrl: editFormData.avatarUrl,
          department: editFormData.department,
          collegeName: editFormData.collegeName.trim(),
          yearOfStudy: editFormData.yearOfStudy,
          cgpa: String(editFormData.cgpa).trim(),
          batch: editFormData.batch.trim(),
          location: editFormData.location.trim(),
          skills,
          githubUrl: editFormData.githubUrl,
          linkedinUrl: editFormData.linkedinUrl,
          portfolioUrl: editFormData.portfolioUrl,
          resumeUrl: editFormData.resumeUrl
        };

        // Same joined_students record the admin panel and the rest of the site read from
        await updateDoc(doc(db, 'joined_students', docId), updates);
        setProfileData({ ...profileData, ...updates });
        setEditFormData(prev => ({ ...prev, skills }));
        if (updates.department) localStorage.setItem('student_department', updates.department);
      }

      setSuccessMsg("Profile updated successfully!");
      setEditFormData({ ...editFormData, newPassword: '' });
      setTimeout(() => setIsEditing(false), 1500);

    } catch (err) {
      console.error(err);
      if (err.code === 'auth/requires-recent-login') {
        setErrorMsg("For security reasons, please log out and log back in to change your password.");
      } else {
        setErrorMsg(err.message || "An error occurred while updating.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Profile Not Found</h2>
        <p className="text-slate-500 mb-6">We couldn't locate your profile details.</p>
        <button onClick={() => navigate('/student')} className="px-6 py-2.5 bg-[#2563EB] text-white rounded-xl font-bold">Go Back</button>
      </div>
    );
  }

 

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-12 font-sans text-slate-800">
      
      {/* Edit Modal Overlay */}
      {isEditing && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[24px] w-full max-w-md shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-900">Edit Profile</h2>
              <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-700 bg-white shadow-sm p-1.5 rounded-full transition-all">✕</button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {errorMsg && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium">{errorMsg}</div>}
              {successMsg && <div className="p-3 bg-green-50 text-green-700 rounded-xl text-sm font-medium">{successMsg}</div>}

              <div>
                <label className="block text-[13px] font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                  <Camera size={16} className="text-slate-400" /> Profile Photo
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center text-[#2563EB] text-3xl font-[900] shrink-0">
                    {editFormData.avatarUrl ? (
                      <img src={editFormData.avatarUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      profileData.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="cursor-pointer px-4 py-2 bg-blue-50 hover:bg-blue-100 text-[#2563EB] font-bold text-sm rounded-xl transition-colors inline-flex items-center gap-2 w-fit">
                      <Camera size={15} /> {editFormData.avatarUrl ? 'Change Photo' : 'Upload Photo'}
                      <input type="file" accept="image/*" onChange={handleAvatarFile} className="hidden" />
                    </label>
                    {editFormData.avatarUrl && (
                      <button
                        type="button"
                        onClick={() => setEditFormData({ ...editFormData, avatarUrl: '' })}
                        className="text-xs font-bold text-red-500 hover:text-red-600 text-left w-fit"
                      >
                        Remove photo
                      </button>
                    )}
                    <span className="text-[11px] text-slate-400 font-medium">JPG, PNG or WebP, up to {MAX_UPLOAD_MB} MB</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <School size={16} className="text-slate-400" /> Department
                </label>
                <select
                  value={editFormData.department}
                  onChange={(e) => setEditFormData({...editFormData, department: e.target.value})}
                  className={`${inputClass} appearance-none`}
                >
                  <option value="">Select Department...</option>
                  {[...new Set([editFormData.department, ...DEPARTMENT_OPTIONS])].filter(Boolean).map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[13px] font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Building2 size={16} className="text-slate-400" /> College
                </label>
                <input
                  type="text"
                  value={editFormData.collegeName}
                  onChange={(e) => setEditFormData({...editFormData, collegeName: e.target.value})}
                  placeholder="Your college name"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Calendar size={16} className="text-slate-400" /> Current Year
                  </label>
                  <select
                    value={editFormData.yearOfStudy}
                    onChange={(e) => setEditFormData({...editFormData, yearOfStudy: e.target.value})}
                    className={`${inputClass} appearance-none`}
                  >
                    <option value="">Select Year...</option>
                    {[...new Set([editFormData.yearOfStudy, ...YEAR_OPTIONS])].filter(Boolean).map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Star size={16} className="text-slate-400" /> CGPA
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    value={editFormData.cgpa}
                    onChange={(e) => setEditFormData({...editFormData, cgpa: e.target.value})}
                    placeholder="e.g. 8.84"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Briefcase size={16} className="text-slate-400" /> Batch
                  </label>
                  <input
                    type="text"
                    value={editFormData.batch}
                    onChange={(e) => setEditFormData({...editFormData, batch: e.target.value})}
                    placeholder="e.g. 2023 - 2027"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <MapPin size={16} className="text-slate-400" /> Location
                  </label>
                  <input
                    type="text"
                    value={editFormData.location}
                    onChange={(e) => setEditFormData({...editFormData, location: e.target.value})}
                    placeholder="City, State"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Code size={16} className="text-slate-400" /> Skills
                </label>
                {editFormData.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2.5">
                    {editFormData.skills.map((skill, idx) => (
                      <span key={skill} className={`px-3 py-1 rounded-lg text-sm font-semibold flex items-center gap-1.5 ${SKILL_STYLES[idx % SKILL_STYLES.length]}`}>
                        {skill}
                        <button
                          type="button"
                          onClick={() => setEditFormData({...editFormData, skills: editFormData.skills.filter(sk => sk !== skill)})}
                          className="opacity-60 hover:opacity-100 leading-none"
                          aria-label={`Remove ${skill}`}
                        >✕</button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="relative">
                  <div className="relative">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={skillSearch}
                      onChange={(e) => { setSkillSearch(e.target.value); setSkillMenuOpen(true); }}
                      onFocus={() => setSkillMenuOpen(true)}
                      onBlur={() => setTimeout(() => setSkillMenuOpen(false), 150)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (skillMatches.length > 0) addSkill(skillMatches[0]);
                        }
                      }}
                      placeholder="Search and select skills..."
                      className={`${inputClass} pl-10`}
                    />
                  </div>
                  {skillMenuOpen && (
                    <div className="absolute z-20 left-0 right-0 mt-1.5 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl py-1">
                      {skillMatches.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-slate-400 font-medium">No matching skills found</div>
                      ) : skillMatches.map(sk => (
                        <button
                          key={sk}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => addSkill(sk)}
                          className="w-full text-left px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                        >
                          {sk}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Lock size={16} className="text-slate-400" /> New Password
                </label>
                <input 
                  type="password" 
                  value={editFormData.newPassword}
                  onChange={(e) => setEditFormData({...editFormData, newPassword: e.target.value})}
                  placeholder="Leave blank to keep current password"
                  minLength={6}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-[14px] focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100 transition-all bg-slate-50 hover:bg-white focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[13px] font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Link size={16} className="text-slate-400" /> GitHub URL
                </label>
                <input 
                  type="url" 
                  value={editFormData.githubUrl}
                  onChange={(e) => setEditFormData({...editFormData, githubUrl: e.target.value})}
                  placeholder="https://github.com/yourusername"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-[14px] focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100 transition-all bg-slate-50 hover:bg-white focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[13px] font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Briefcase size={16} className="text-slate-400" /> LinkedIn URL
                </label>
                <input 
                  type="url" 
                  value={editFormData.linkedinUrl}
                  onChange={(e) => setEditFormData({...editFormData, linkedinUrl: e.target.value})}
                  placeholder="https://linkedin.com/in/yourusername"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-[14px] focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100 transition-all bg-slate-50 hover:bg-white focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[13px] font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <FileText size={16} className="text-slate-400" /> Portfolio URL
                </label>
                <input 
                  type="url" 
                  value={editFormData.portfolioUrl}
                  onChange={(e) => setEditFormData({...editFormData, portfolioUrl: e.target.value})}
                  placeholder="https://yourportfolio.com"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-[14px] focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100 transition-all bg-slate-50 hover:bg-white focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[13px] font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Download size={16} className="text-slate-400" /> Resume Link
                </label>
                <input 
                  type="url" 
                  value={editFormData.resumeUrl}
                  onChange={(e) => setEditFormData({...editFormData, resumeUrl: e.target.value})}
                  placeholder="Link to your resume"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-[14px] focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100 transition-all bg-slate-50 hover:bg-white focus:bg-white"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsEditing(false)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-3 bg-[#2563EB] hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-md shadow-blue-600/20 disabled:opacity-70">
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Top Navigation */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-slate-200/50 px-6 sm:px-10 py-4 flex items-center justify-between">
        <button onClick={() => navigate('/student')} className="flex items-center gap-2 text-slate-500 hover:text-[#2563EB] transition-colors font-semibold text-sm group">
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 flex flex-col lg:flex-row gap-8">
        
        {/* Main Content Column */}
        <motion.div 
          className="flex-1 min-w-0 flex flex-col gap-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Hero Banner */}
          <motion.div variants={itemVariants} className="relative rounded-[24px] overflow-hidden bg-gradient-to-r from-[#2563EB] to-[#14B8A6] p-8 sm:p-10 text-white shadow-lg shadow-blue-900/10">
            {/* Decorative waves & circles */}
            <div className="absolute inset-0 opacity-20 pointer-events-none">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                <path d="M0 100 C 20 0 50 0 100 100 Z" fill="currentColor" opacity="0.3"/>
                <path d="M0 100 C 50 0 80 0 100 100 Z" fill="currentColor" opacity="0.5"/>
              </svg>
            </div>
            
            <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-8">
              
              {/* Avatar */}
              <div className="relative group shrink-0">
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-white/20 backdrop-blur-md p-2 flex items-center justify-center shadow-2xl relative overflow-hidden">
                  <div className="w-full h-full rounded-full overflow-hidden bg-white flex items-center justify-center text-[#2563EB] text-5xl font-[900]">
                    {profileData.avatarUrl ? (
                      <img src={profileData.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      profileData.name.charAt(0).toUpperCase()
                    )}
                  </div>
                </div>
                {/* Status Dot */}
                <div className="absolute bottom-3 right-3 w-5 h-5 bg-green-400 border-4 border-white rounded-full"></div>
                {/* Camera Button */}
                <button onClick={() => setIsEditing(true)} className="absolute bottom-[-10px] left-1/2 -translate-x-1/2 w-10 h-10 bg-white text-[#14B8A6] rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                  <Camera size={18} />
                </button>
              </div>

              {/* Profile Details */}
              <div className="flex-1 text-center sm:text-left mt-2">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2 justify-center sm:justify-start">
                  <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{profileData.name}</h1>
                  <span className="inline-flex items-center justify-center w-6 h-6 bg-white/20 rounded-full">
                    <Check size={14} className="text-white" />
                  </span>
                </div>
                
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-white/90 text-sm font-medium mb-5">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full border border-white/20 backdrop-blur-sm">
                    <ShieldCheck size={14} /> Verified Student
                  </span>
                  <span>{profileData.department || 'Computer Science Student'}</span>
                </div>
                
                <div className="flex items-center justify-center sm:justify-start gap-2 text-white/80 text-sm mb-6">
                  <Mail size={16} /> {profileData.email}
                </div>

 
              </div>

              {/* Edit Button Desktop */}
              <button onClick={() => setIsEditing(true)} className="hidden sm:flex shrink-0 px-6 py-2.5 bg-white text-[#2563EB] hover:bg-slate-50 font-semibold rounded-full shadow-lg items-center gap-2 transition-transform hover:-translate-y-0.5">
                <Edit2 size={16} /> Edit Profile
              </button>
            </div>
          </motion.div>

 

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Academic Info */}
            <motion.div variants={itemVariants} className="bg-white rounded-[24px] p-7 shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <GraduationCap className="text-[#2563EB]" size={20} /> Academic Info
                </h3>
                <button onClick={() => setIsEditing(true)} className="text-xs font-bold text-[#2563EB] hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5">
                  <Edit2 size={12} /> Edit
                </button>
              </div>
              
              <div className="space-y-4">
                {[
                  { icon: <Building2 size={16} />, label: "College", value: profileData.collegeName },
                  { icon: <School size={16} />, label: "Department", value: profileData.department },
                  { icon: <Calendar size={16} />, label: "Current Year", value: profileData.yearOfStudy },
                  { icon: <Star size={16} />, label: "CGPA", value: profileData.cgpa ? `${profileData.cgpa} / 10` : '' },
                  { icon: <Briefcase size={16} />, label: "Batch", value: profileData.batch },
                  { icon: <MapPin size={16} />, label: "Location", value: profileData.location },
                ].map((item, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-slate-50 last:border-0 group">
                    <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-500 mb-1 sm:mb-0">
                      <span className="text-slate-400 group-hover:text-[#2563EB] transition-colors">{item.icon}</span> {item.label}
                    </div>
                    <div className={`text-sm font-semibold ${item.value ? 'text-slate-800' : 'text-slate-400 italic'}`}>{item.value || 'Not set'}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Skills Card */}
            <motion.div variants={itemVariants} className="bg-white rounded-[24px] p-7 shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Code className="text-[#14B8A6]" size={20} /> Skills
                </h3>
                <button onClick={() => setIsEditing(true)} className="text-xs font-bold text-[#2563EB] hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5">
                  <Edit2 size={12} /> Edit
                </button>
              </div>

              {Array.isArray(profileData.skills) && profileData.skills.length > 0 ? (
                <div className="flex flex-wrap gap-2.5">
                  {profileData.skills.map((skill, idx) => (
                    <div key={skill} className={`px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-all hover:scale-105 hover:shadow-sm cursor-default ${SKILL_STYLES[idx % SKILL_STYLES.length]}`}>
                      <Zap size={12} /> {skill}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 text-sm font-semibold border-2 border-dashed border-slate-100 rounded-xl">
                  No skills added yet.<br />
                  <button onClick={() => setIsEditing(true)} className="text-[#2563EB] mt-1 hover:underline">Add them now</button>
                </div>
              )}
            </motion.div>
          </div>
 
        </motion.div>

        {/* Right Sidebar Column */}
        <motion.div 
          className="w-full lg:w-80 shrink-0 flex flex-col gap-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
 

 

 

          {/* Social Links */}
          <motion.div variants={itemVariants} className="bg-white rounded-[24px] p-7 shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Link className="text-[#14B8A6]" size={20} /> Social Links
              </h3>
              <button onClick={() => setIsEditing(true)} className="text-xs font-bold text-[#2563EB] hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5">
                <Edit2 size={12} /> Edit
              </button>
            </div>
            
            <div className="space-y-3">
              {(() => {
                const links = [
                  { name: "GitHub", icon: <Link size={18} />, url: profileData.githubUrl },
                  { name: "LinkedIn", icon: <Briefcase size={18} />, url: profileData.linkedinUrl },
                  { name: "Portfolio", icon: <FileText size={18} />, url: profileData.portfolioUrl },
                  { name: "Resume", icon: <Download size={18} />, url: profileData.resumeUrl },
                ].filter(link => link.url);
                
                if (links.length === 0) {
                  return (
                    <div className="text-center py-6 text-slate-400 text-sm font-semibold border-2 border-dashed border-slate-100 rounded-xl">
                      No social links added yet.<br />
                      <button onClick={() => setIsEditing(true)} className="text-[#2563EB] mt-1 hover:underline">Add them now</button>
                    </div>
                  );
                }
                
                return links.map((link, idx) => (
                  <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 hover:border-blue-100 hover:bg-blue-50/50 hover:text-[#2563EB] transition-all group">
                    <div className="flex items-center gap-3 font-semibold text-sm text-slate-700 group-hover:text-[#2563EB]">
                      <span className="text-slate-400 group-hover:text-[#2563EB]">{link.icon}</span> {link.name}
                    </div>
                    <ExternalLink size={16} className="text-slate-300 group-hover:text-[#2563EB]" />
                  </a>
                ));
              })()}
            </div>
          </motion.div>

        </motion.div>
      </div>
    </div>
  );
}
