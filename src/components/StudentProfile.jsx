import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Building2, School, Calendar, HelpCircle, ArrowLeft, GraduationCap, Edit2, ShieldCheck, Link, Lock } from 'lucide-react';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { updatePassword } from 'firebase/auth';

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
    newPassword: ''
  });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const role = localStorage.getItem('auth_role');
    const email = localStorage.getItem('auth_email');
    
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
              newPassword: ''
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

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // 1. Update Password if provided
      if (editFormData.newPassword) {
        if (auth.currentUser) {
          await updatePassword(auth.currentUser, editFormData.newPassword);
        } else {
          throw new Error("You must be logged in to update your password. Please sign out and sign in again.");
        }
      }

      // 2. Update Profile details in Firestore
      if (docId) {
        await updateDoc(doc(db, 'joined_students', docId), {
          avatarUrl: editFormData.avatarUrl,
          department: editFormData.department
        });
        
        // Update local state
        setProfileData({
          ...profileData,
          avatarUrl: editFormData.avatarUrl,
          department: editFormData.department
        });
      }

      setSuccessMsg("Profile updated successfully!");
      setEditFormData({ ...editFormData, newPassword: '' }); // clear password field
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Profile Not Found</h2>
        <p className="text-slate-500 mb-6">We couldn't locate your profile details.</p>
        <button onClick={() => navigate('/student')} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold">Go Back</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-8">
      
      {/* Edit Modal Overlay */}
      {isEditing && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">Edit Profile</h2>
              <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-6 space-y-5">
              
              {errorMsg && (
                <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium">
                  {errorMsg}
                </div>
              )}
              {successMsg && (
                <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm font-medium">
                  {successMsg}
                </div>
              )}

              <div>
                <label className="block text-[13px] font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Link size={16} className="text-slate-400" /> Profile Image URL
                </label>
                <input 
                  type="url" 
                  value={editFormData.avatarUrl}
                  onChange={(e) => setEditFormData({...editFormData, avatarUrl: e.target.value})}
                  placeholder="https://example.com/my-photo.jpg"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-[14px] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                />
                <p className="text-xs text-slate-500 mt-1">Provide a direct link to an image to use as your avatar.</p>
              </div>

              <div>
                <label className="block text-[13px] font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <School size={16} className="text-slate-400" /> Department
                </label>
                <select 
                  value={editFormData.department}
                  onChange={(e) => setEditFormData({...editFormData, department: e.target.value})}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-[14px] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-white"
                >
                  <option value="">Select Department...</option>
                  <option value="Computer Science (CSE)">Computer Science (CSE)</option>
                  <option value="Electronics (ECE)">Electronics (ECE)</option>
                  <option value="Mechanical (ME)">Mechanical (ME)</option>
                  <option value="Civil (CE)">Civil (CE)</option>
                  <option value="Electrical (EE)">Electrical (EE)</option>
                  <option value="Data Science & AI (DS)">Data Science & AI (DS)</option>
                  <option value="Production & Industrial Engg (PI)">Production & Industrial Engg (PI)</option>
                  <option value="Instrumentation Engg (IN)">Instrumentation Engg (IN)</option>
                  <option value="Biotechnology (BT)">Biotechnology (BT)</option>
                  <option value="Chemical Engineering (CH)">Chemical Engineering (CH)</option>
                  <option value="Biomedical Engineering (BM)">Biomedical Engineering (BM)</option>
                  <option value="Physics (PH)">Physics (PH)</option>
                  <option value="Architecture & Planning (AR)">Architecture & Planning (AR)</option>
                  <option value="Agricultural Engineering (AG)">Agricultural Engineering (AG)</option>
                  <option value="Metallurgical Engineering (MT)">Metallurgical Engineering (MT)</option>
                  <option value="Environmental Science (ES)">Environmental Science (ES)</option>
                  <option value="Life Sciences (XL)">Life Sciences (XL)</option>
                  <option value="Aerospace Engineering (AE)">Aerospace Engineering (AE)</option>
                  <option value="Other">Other</option>
                </select>
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
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-[14px] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all disabled:opacity-70"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        
        {/* Navigation */}
        <button 
          onClick={() => navigate('/student')}
          className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors font-semibold mb-8 group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" /> 
          Back to Dashboard
        </button>

        {/* Profile Header Card */}
        <div className="bg-white rounded-[32px] p-8 sm:p-12 shadow-sm border border-slate-200 mb-8 relative overflow-hidden flex flex-col sm:flex-row items-center gap-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-[80px] -z-10 pointer-events-none"></div>
          
          <div className="w-32 h-32 rounded-[24px] bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-blue-700 shadow-inner shrink-0 relative overflow-hidden">
            {profileData.avatarUrl ? (
              <img src={profileData.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-6xl font-[900]">{profileData.name.charAt(0).toUpperCase()}</span>
            )}
            <div className="absolute -bottom-3 -right-3 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md z-10">
              <ShieldCheck size={20} className="text-green-500" />
            </div>
          </div>
          
          <div className="text-center sm:text-left flex-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-bold uppercase tracking-wider mb-3">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> {profileData.status || 'Active Student'}
            </div>
            <h1 className="text-3xl sm:text-4xl font-[900] text-slate-900 tracking-tight mb-2">{profileData.name}</h1>
            <p className="text-slate-500 font-medium flex items-center justify-center sm:justify-start gap-2">
              <Mail size={16} /> {profileData.email}
            </p>
          </div>
          
          <button 
            onClick={() => setIsEditing(true)}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors flex items-center gap-2 shrink-0"
          >
            <Edit2 size={16} /> Edit Profile
          </button>
        </div>

        {/* Profile Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Academic Info */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-6 pb-4 border-b border-slate-100">
              <GraduationCap className="text-blue-600" /> Academic Information
            </h3>
            
            <div className="space-y-6">
              <div>
                <p className="text-[13px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5 mb-1">
                  <Building2 size={14} /> College Name
                </p>
                <p className="text-slate-800 font-semibold">{profileData.collegeName || 'Not specified'}</p>
              </div>
              
              <div>
                <p className="text-[13px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5 mb-1">
                  <School size={14} /> Department
                </p>
                <p className="text-slate-800 font-semibold">{profileData.department || 'Not specified'}</p>
              </div>
              
              <div>
                <p className="text-[13px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5 mb-1">
                  <Calendar size={14} /> Current Year
                </p>
                <p className="text-slate-800 font-semibold">{profileData.yearOfStudy || 'Not specified'}</p>
              </div>
            </div>
          </div>

          {/* Account Details */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-6 pb-4 border-b border-slate-100">
              <User className="text-blue-600" /> Account Details
            </h3>
            
            <div className="space-y-6">
              <div>
                <p className="text-[13px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5 mb-1">
                  <Calendar size={14} /> Member Since
                </p>
                <p className="text-slate-800 font-semibold">{profileData.joinedDate || 'Unknown'}</p>
              </div>
              
              <div>
                <p className="text-[13px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5 mb-1">
                  <HelpCircle size={14} /> Referral Source
                </p>
                <p className="text-slate-800 font-semibold inline-flex px-3 py-1 bg-slate-100 rounded-lg text-sm">{profileData.referralSource || 'Organic'}</p>
              </div>
              
              <div className="pt-4">
                <button 
                  onClick={() => {
                    localStorage.removeItem('auth_role');
                    localStorage.removeItem('auth_email');
                    localStorage.removeItem('auth_name');
                    window.dispatchEvent(new Event('storage'));
                    navigate('/');
                  }}
                  className="text-red-500 hover:text-red-600 font-bold text-sm transition-colors"
                >
                  Sign Out of all devices
                </button>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
