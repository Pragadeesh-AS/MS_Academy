import React, { useState } from 'react';
import { User, Mail, Lock, TrendingUp, BookOpen, Trophy, Quote } from 'lucide-react';
import signupImage from '../assets/signup2.png';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, sendPasswordResetEmail } from 'firebase/auth';
import { collection, getDocs, query, where, updateDoc, doc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

export default function LoginSignup() {
  const [isLogin, setIsLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const markStudentAsActive = async (email, name) => {
    try {
      const q = query(collection(db, 'joined_students'), where('email', '==', email));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const docId = querySnapshot.docs[0].id;
        await updateDoc(doc(db, 'joined_students', docId), { status: 'Active' });
      } else {
        const newStudentRef = doc(collection(db, 'joined_students'));
        await setDoc(newStudentRef, {
          id: Date.now(),
          name: name,
          email: email,
          joinedDate: new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }),
          status: "Active"
        });
      }
    } catch (e) {
      console.error("Failed to update student database in Firestore:", e);
    }
  };

  const checkTeacherRole = async (email) => {
    try {
      const q = query(collection(db, 'invited_teachers'), where('email', '==', email));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const docId = querySnapshot.docs[0].id;
        await updateDoc(doc(db, 'invited_teachers', docId), { status: 'Accepted' });
        return true;
      }
    } catch (e) {
      console.error("Failed to check teacher database in Firestore:", e);
    }
    return false;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResetMessage('');
    
    if (!isLogin && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    
    if (!isLogin && !agreedToTerms) {
      setError("You must agree to the Terms & Conditions.");
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        // Authenticate all logins using Firebase Authentication
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Check if the authenticated user has the registered admin email
        const adminEmails = ['msgateacademy2026@gmail.com', 'msacademy2026@gmail.com', 'msgateacademy@gmail.com'];
        if (adminEmails.includes(user.email.toLowerCase())) {
          localStorage.setItem('auth_role', 'admin');
          localStorage.setItem('auth_email', user.email);
          localStorage.setItem('auth_name', 'MS Academy Admin');
          window.dispatchEvent(new Event('storage'));
          navigate('/admin');
        } else {
          const userName = user.displayName || user.email.split('@')[0];
          const isTeacher = await checkTeacherRole(user.email);
          
          if (isTeacher) {
            localStorage.setItem('auth_role', 'teacher');
            localStorage.setItem('auth_email', user.email);
            localStorage.setItem('auth_name', userName);
            window.dispatchEvent(new Event('storage'));
            navigate('/teacher-dashboard');
          } else {
            // Regular student auth
            await markStudentAsActive(user.email, userName);
            localStorage.setItem('auth_role', 'student');
            localStorage.setItem('auth_email', user.email);
            localStorage.setItem('auth_name', userName);
            window.dispatchEvent(new Event('storage'));
            navigate('/dashboard');
          }
        }
      } else {
        // Registration / signup flow
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const userName = name || user.email.split('@')[0];
        
        const isTeacher = await checkTeacherRole(user.email);
        if (isTeacher) {
          localStorage.setItem('auth_role', 'teacher');
          localStorage.setItem('auth_email', user.email);
          localStorage.setItem('auth_name', userName);
          window.dispatchEvent(new Event('storage'));
          navigate('/teacher-dashboard');
        } else {
          // Always student if not an invited teacher
          await markStudentAsActive(user.email, userName);
          localStorage.setItem('auth_role', 'student');
          localStorage.setItem('auth_email', user.email);
          localStorage.setItem('auth_name', userName);
          window.dispatchEvent(new Event('storage'));
          navigate('/dashboard');
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setResetMessage('');
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;
      
      // Check admin emails for Google Login
      const adminEmails = ['msgateacademy2026@gmail.com', 'msacademy2026@gmail.com', 'msgateacademy@gmail.com'];
      if (adminEmails.includes(user.email.toLowerCase())) {
        localStorage.setItem('auth_role', 'admin');
        localStorage.setItem('auth_email', user.email);
        localStorage.setItem('auth_name', 'MS Academy Admin');
        window.dispatchEvent(new Event('storage'));
        navigate('/admin');
        return;
      }

      const userName = user.displayName || user.email.split('@')[0];
      const isTeacher = await checkTeacherRole(user.email);
      
      if (isTeacher) {
        localStorage.setItem('auth_role', 'teacher');
        localStorage.setItem('auth_email', user.email);
        localStorage.setItem('auth_name', userName);
        window.dispatchEvent(new Event('storage'));
        navigate('/teacher-dashboard');
      } else {
        await markStudentAsActive(user.email, userName);
        localStorage.setItem('auth_role', 'student');
        localStorage.setItem('auth_email', user.email);
        localStorage.setItem('auth_name', userName);
        window.dispatchEvent(new Event('storage'));
        navigate('/dashboard');
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  const handleForgotPassword = async () => {
    setError('');
    setResetMessage('');
    if (!email) {
      setError('Please enter your email address first to reset your password.');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetMessage('Password reset email sent! Please check your inbox (spam).');
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/user-not-found') {
        setError('No account found with this email address.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else {
        setError(err.message || 'Failed to send reset email. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-white flex overflow-hidden font-sans text-slate-900">
      
      {/* ==================================================
          LEFT PANEL (55%) 
          ================================================== */}
      <div className="w-full lg:w-[55%] min-h-screen flex flex-col justify-center px-8 lg:px-16 xl:px-24 py-6 relative overflow-hidden">
        
        <div className="w-full max-w-[500px] mx-auto">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <img src="/logo.png" alt="MS Academy Logo" className="w-12 h-12 object-contain" />
            <div className="flex flex-col justify-center">
              <span className="text-[22px] font-bold text-[#1e293b] leading-none tracking-tight">MS Academy</span>
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-[32px] xl:text-[38px] font-extrabold text-[#111827] leading-tight tracking-tight" style={{ fontFamily: 'Inter, sans-serif' }}>
            {isLogin ? "Welcome back 👋" : "Create your account 👋"}
          </h1>

          {/* Subheading */}
          <p className="text-[14px] xl:text-[15px] text-[#667085] mt-1 mb-6 font-normal" style={{ fontFamily: 'Inter, sans-serif' }}>
            {isLogin ? "Please enter your details to sign in." : "Join thousands of aspirants on their success journey."}
          </p>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm w-full">
              {error}
            </div>
          )}

          {/* Reset Message */}
          {resetMessage && (
            <div className="mb-4 p-3 bg-green-50 border border-green-100 text-green-700 rounded-lg text-sm w-full font-medium">
              {resetMessage}
            </div>
          )}

          {/* Form */}
          <form className="flex flex-col w-full" onSubmit={handleSubmit}>
            
            {/* Full Name */}
            {!isLogin && (
              <div className="relative mb-3.5">
                <div className="absolute inset-y-0 left-0 pl-[16px] flex items-center pointer-events-none text-[#98A2B3]">
                  <User size={18} />
                </div>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={!isLogin}
                  placeholder="Full Name"
                  className="w-full h-[46px] pl-[46px] pr-4 bg-white border border-[#E5E7EB] rounded-[10px] outline-none focus:border-[#2563EB] text-[14px] placeholder:text-[#98A2B3] transition-colors"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                />
              </div>
            )}

            {/* Email Address */}
            <div className="relative mb-3.5">
              <div className="absolute inset-y-0 left-0 pl-[16px] flex items-center pointer-events-none text-[#98A2B3]">
                <Mail size={18} />
              </div>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Email Address"
                className="w-full h-[46px] pl-[46px] pr-4 bg-white border border-[#E5E7EB] rounded-[10px] outline-none focus:border-[#2563EB] text-[14px] placeholder:text-[#98A2B3] transition-colors"
                style={{ fontFamily: 'Inter, sans-serif' }}
              />
            </div>

            {/* Password */}
            <div className="relative mb-3.5">
              <div className="absolute inset-y-0 left-0 pl-[16px] flex items-center pointer-events-none text-[#98A2B3]">
                <Lock size={18} />
              </div>
              <input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Password"
                className="w-full h-[46px] pl-[46px] pr-4 bg-white border border-[#E5E7EB] rounded-[10px] outline-none focus:border-[#2563EB] text-[14px] placeholder:text-[#98A2B3] transition-colors"
                style={{ fontFamily: 'Inter, sans-serif' }}
              />
            </div>

            {/* Confirm Password */}
            {!isLogin && (
              <div className="relative mb-3.5">
                <div className="absolute inset-y-0 left-0 pl-[16px] flex items-center pointer-events-none text-[#98A2B3]">
                  <Lock size={18} />
                </div>
                <input 
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required={!isLogin}
                  placeholder="Confirm Password"
                  className="w-full h-[46px] pl-[46px] pr-4 bg-white border border-[#E5E7EB] rounded-[10px] outline-none focus:border-[#2563EB] text-[14px] placeholder:text-[#98A2B3] transition-colors"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                />
              </div>
            )}

            {/* Checkbox / Remember Me */}
            {!isLogin ? (
              <label className="flex items-start gap-3 cursor-pointer w-full mb-5">
                <input 
                  type="checkbox" 
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="w-[15px] h-[15px] mt-0.5 border-[#E5E7EB] rounded cursor-pointer accent-[#2563EB]"
                />
                <span className="text-[13px] text-[#667085] leading-snug" style={{ fontFamily: 'Inter, sans-serif' }}>
                  I agree to the <a href="#" className="text-[#2563EB] hover:underline font-medium">Terms & Conditions</a> and <a href="#" className="text-[#2563EB] hover:underline font-medium">Privacy Policy</a>
                </span>
              </label>
            ) : (
              <div className="flex items-center justify-between w-full mb-5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="w-[15px] h-[15px] border-[#E5E7EB] rounded cursor-pointer accent-[#2563EB]"
                  />
                  <span className="text-[13px] text-[#667085] font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>Remember me</span>
                </label>
                <button 
                  type="button" 
                  onClick={handleForgotPassword} 
                  className="text-[13px] font-semibold text-[#2563EB] hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
            )}

            {/* Submit Button */}
            <button 
              disabled={loading}
              className="w-full h-[46px] bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] rounded-[10px] shadow-[0_8px_20px_rgba(37,99,235,0.18)] text-white text-[15px] font-bold flex items-center justify-center hover:opacity-95 transition-opacity disabled:opacity-70"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              {loading ? "Processing..." : (isLogin ? "Sign In" : "Create Account")}
            </button>
          </form>

          {/* Divider */}
          <div className="w-full mt-6 mb-6 relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E5E7EB]"></div>
            </div>
            <span className="relative bg-white px-4 text-[12px] text-[#667085] uppercase tracking-wide font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
              or continue with
            </span>
          </div>

          {/* Google Button */}
          <button 
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full h-[46px] bg-white border border-[#D0D5DD] rounded-[10px] flex items-center justify-center gap-3 text-[#111827] text-[14px] font-semibold hover:bg-gray-50 transition-colors shadow-sm"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>

          {/* Bottom Text */}
          <div className="w-full mt-6 text-center text-[13px] text-[#667085]" style={{ fontFamily: 'Inter, sans-serif' }}>
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <span 
              onClick={() => { setIsLogin(!isLogin); setError(''); setResetMessage(''); }}
              className="text-[#2563EB] cursor-pointer hover:underline font-semibold"
            >
              {isLogin ? "Sign up" : "Sign In"}
            </span>
          </div>

        </div>
      </div>


      {/* ==================================================
          RIGHT PANEL (45%) 
          ================================================== */}
      <div className="hidden lg:flex w-[45%] bg-gradient-to-b from-[#F8FBFF] to-[#EDF4FF] flex-col items-center justify-center relative min-h-screen shrink-0 p-6 xl:p-8">
        
        {/* Radial Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(90,155,255,0.08)_0%,transparent_70%)] pointer-events-none"></div>

        <div className="w-full max-w-[480px] flex flex-col items-center z-10 relative">
          
          {/* Illustration */}
          <img 
            src={signupImage} 
            alt="Start your journey" 
            className="w-[340px] h-auto object-contain mb-6 mix-blend-multiply"
          />

          {/* Heading */}
          <h2 className="text-[28px] xl:text-[34px] font-extrabold text-[#122B66] text-center leading-tight tracking-tight mb-3" style={{ fontFamily: 'Inter, sans-serif' }}>
            Start your journey with us.
          </h2>

          {/* Description */}
          <p className="text-[15px] text-[#4B5563] text-center leading-relaxed mb-6 max-w-[420px]" style={{ fontFamily: 'Inter, sans-serif' }}>
            Get the best guidance, study materials, and mentorship to achieve your dreams.
          </p>

          {/* Stat Card */}
          <div className="w-full bg-white rounded-[16px] shadow-[0_12px_30px_rgba(15,23,42,0.06)] flex items-center justify-between p-5 mb-5">
            {/* Col 1 */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-[10px] flex items-center justify-center shadow-sm shadow-blue-600/20">
                <TrendingUp size={20} className="text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-[18px] font-bold text-[#111827] leading-none mb-1">120K+</span>
                <span className="text-[11px] font-medium uppercase tracking-wide text-[#667085]">Students</span>
              </div>
            </div>

            {/* Divider */}
            <div className="w-[1px] h-[40px] bg-[#E5E7EB]"></div>

            {/* Col 2 */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-[10px] flex items-center justify-center">
                <BookOpen size={20} className="text-[#2563EB]" />
              </div>
              <div className="flex flex-col">
                <span className="text-[18px] font-bold text-[#111827] leading-none mb-1">250+</span>
                <span className="text-[11px] font-medium uppercase tracking-wide text-[#667085]">Courses</span>
              </div>
            </div>

            {/* Divider */}
            <div className="w-[1px] h-[40px] bg-[#E5E7EB]"></div>

            {/* Col 3 */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-[10px] flex items-center justify-center">
                <Trophy size={20} className="text-[#2563EB]" />
              </div>
              <div className="flex flex-col">
                <span className="text-[18px] font-bold text-[#111827] leading-none mb-1">98%</span>
                <span className="text-[11px] font-medium uppercase tracking-wide text-[#667085]">Success</span>
              </div>
            </div>
          </div>

          {/* Testimonial Card */}
          <div className="w-full bg-white rounded-[16px] shadow-[0_12px_30px_rgba(15,23,42,0.06)] p-5 relative">
            <Quote size={24} className="text-[#2563EB]/20 absolute top-5 left-5 fill-current" />
            
            <p className="pl-10 text-[13px] text-[#667085] leading-relaxed italic mb-3">
              "MS Gate Academy played a crucial role in my GATE success. The mentors, materials, and test series are excellent!"
            </p>
            
            <p className="pl-10 text-[11px] font-bold text-[#2563EB] uppercase tracking-wide">
              — AIR 27, GATE 2024 (CSE)
            </p>
          </div>

        </div>
      </div>

    </div>
  );
}
