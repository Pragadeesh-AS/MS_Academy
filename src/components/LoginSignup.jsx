import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Lock, TrendingUp, BookOpen, Trophy, Quote, Eye, EyeOff } from 'lucide-react';
import { auth } from '../firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

export default function LoginSignup() {
  const [isLogin, setIsLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
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
      // 1. Admin login interceptor
      if (isLogin && email.toLowerCase() === 'admin@msacademy.com') {
        if (password === 'admin123') {
          localStorage.setItem('auth_role', 'admin');
          localStorage.setItem('auth_email', 'admin@msacademy.com');
          localStorage.setItem('auth_name', 'MS Academy Admin');
          window.dispatchEvent(new Event('storage'));
          navigate('/admin');
          return;
        } else {
          setError('Invalid username/password');
          return;
        }
      }

      // 2. Regular Firebase flow
      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        localStorage.setItem('auth_role', 'student');
        localStorage.setItem('auth_email', user.email);
        localStorage.setItem('auth_name', user.displayName || user.email.split('@')[0]);
        window.dispatchEvent(new Event('storage'));
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        localStorage.setItem('auth_role', 'student');
        localStorage.setItem('auth_email', user.email);
        localStorage.setItem('auth_name', name || user.email.split('@')[0]);
        window.dispatchEvent(new Event('storage'));
      }
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      
      let errorMessage = "An unexpected error occurred. Please try again later.";
      
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        errorMessage = "Invalid username/password";
      } else if (err.code === 'auth/email-already-in-use') {
        errorMessage = "An account with this email address already exists. Please sign in instead.";
      } else if (err.code === 'auth/weak-password') {
        errorMessage = "Your password is too weak. Please use a stronger password (at least 6 characters).";
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = "Please enter a valid email address.";
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;
      localStorage.setItem('auth_role', 'student');
      localStorage.setItem('auth_email', user.email);
      localStorage.setItem('auth_name', user.displayName || user.email.split('@')[0]);
      window.dispatchEvent(new Event('storage'));
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("User is logged in:", user.email);
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen w-full flex bg-white font-sans text-slate-900">
      
      {/* ━━━━━━━━━━━━━━━━━━━━━━ LEFT SECTION (45%) ━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="w-full lg:w-[45%] flex flex-col justify-center px-8 sm:px-12 xl:px-24 py-12 relative h-screen overflow-y-auto">
        
        <div className="w-full max-w-[420px] mx-auto">
          {/* Logo & Subtitle */}
          <div className="flex items-center gap-4 mb-10">
            <img src="/logo.png" alt="MS Gate Academy Logo" className="w-12 h-12 object-contain" />
            <div>
              <h1 className="text-xl font-bold text-[#1e293b] leading-tight uppercase tracking-tight">MS Gate Academy</h1>
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-widest mt-0.5">Guiding Tomorrow's Leaders</p>
            </div>
          </div>

          {/* Headings */}
          <div className="mb-8">
            <h2 className="text-3xl sm:text-[32px] font-bold text-slate-900 mb-3 tracking-tight">
              {isLogin ? "Welcome back 👋" : "Create your account 👋"}
            </h2>
            <p className="text-slate-500 text-[15px]">
              {isLogin ? "Please enter your details to sign in." : "Join thousands of aspirants on their success journey."}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm font-medium">
              {error}
            </div>
          )}

          {/* Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <AnimatePresence mode="popLayout">
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-1.5"
                >
                  <label className="text-[13px] font-semibold text-slate-700">Full Name</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400 group-focus-within:text-[#2563EB] transition-colors">
                      <User size={18} />
                    </div>
                    <input 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required={!isLogin}
                      placeholder="Enter your full name"
                      className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10 transition-all text-[15px] placeholder:text-slate-400"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-slate-700">Email Address</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400 group-focus-within:text-[#2563EB] transition-colors">
                  <Mail size={18} />
                </div>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Enter your email address"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10 transition-all text-[15px] placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-slate-700">Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400 group-focus-within:text-[#2563EB] transition-colors">
                  <Lock size={18} />
                </div>
                <input 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder={isLogin ? "Enter your password" : "Create a password"}
                  className="w-full pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10 transition-all text-[15px] placeholder:text-slate-400"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <AnimatePresence mode="popLayout">
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-1.5"
                >
                  <label className="text-[13px] font-semibold text-slate-700">Confirm Password</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400 group-focus-within:text-[#2563EB] transition-colors">
                      <Lock size={18} />
                    </div>
                    <input 
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required={!isLogin}
                      placeholder="Confirm your password"
                      className="w-full pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10 transition-all text-[15px] placeholder:text-slate-400"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex justify-between items-center pt-1 pb-2">
              {!isLogin ? (
                <label className="flex items-start gap-2.5 cursor-pointer group">
                  <div className="relative flex items-center justify-center mt-0.5">
                    <input 
                      type="checkbox" 
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="peer appearance-none w-4 h-4 border border-slate-300 rounded-[4px] checked:bg-[#2563EB] checked:border-[#2563EB] transition-colors cursor-pointer"
                    />
                    <svg className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <span className="text-[13px] text-slate-600 leading-snug">
                    I agree to the <a href="#" className="text-[#2563EB] hover:underline font-medium">Terms & Conditions</a> and <a href="#" className="text-[#2563EB] hover:underline font-medium">Privacy Policy</a>
                  </span>
                </label>
              ) : (
                <>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <div className="relative flex items-center justify-center">
                      <input 
                        type="checkbox" 
                        className="peer appearance-none w-4 h-4 border border-slate-300 rounded-[4px] checked:bg-[#2563EB] checked:border-[#2563EB] transition-colors cursor-pointer"
                      />
                      <svg className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <span className="text-[13px] font-medium text-slate-600">Remember me</span>
                  </label>
                  <button type="button" className="text-[13px] font-semibold text-[#2563EB] hover:text-blue-800 transition-colors">
                    Forgot Password?
                  </button>
                </>
              )}
            </div>

            <button 
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#2563EB] to-[#1d4ed8] hover:from-[#1d4ed8] hover:to-[#1e40af] text-white font-semibold py-3.5 px-4 rounded-xl shadow-[0_8px_16px_rgba(37,99,235,0.2)] hover:shadow-[0_12px_20px_rgba(37,99,235,0.3)] hover:-translate-y-0.5 transition-all flex items-center justify-center disabled:opacity-70 disabled:hover:-translate-y-0"
            >
              {loading ? "Processing..." : (isLogin ? "Sign In" : "Create Account")}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-8 relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <span className="relative bg-white px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Or continue with
            </span>
          </div>

          {/* Google Button */}
          <div className="mt-6">
            <button 
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold py-3 px-4 rounded-xl transition-all shadow-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>
            
            <div className="text-center mt-8">
              <p className="text-slate-500 text-sm font-medium">
                {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
                <button 
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError('');
                  }}
                  className="text-[#2563EB] font-semibold hover:underline transition-all"
                >
                  {isLogin ? "Sign up" : "Sign In"}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━ RIGHT SECTION (55%) ━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="hidden lg:flex w-[55%] bg-gradient-to-br from-[#F5F9FF] to-[#EAF2FF] flex-col items-center justify-center p-12 relative overflow-hidden h-screen">
        
        <div className="max-w-[500px] w-full flex flex-col items-center z-10">
          
          {/* Illustration */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="w-full max-w-[400px] mb-10"
          >
            <img src="/illustration.png" alt="Education Illustration" className="w-full h-auto drop-shadow-2xl" />
          </motion.div>

          {/* Text Content */}
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-slate-800 mb-3 tracking-tight">
              Start your journey with us.
            </h2>
            <p className="text-slate-600 leading-relaxed text-[15px]">
              Get expert guidance, study materials, mock tests and mentorship to achieve your dream career.
            </p>
          </div>

          {/* Stats Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="w-full bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgba(37,99,235,0.06)] border border-blue-50 mb-6 flex justify-between items-center"
          >
            <div className="flex flex-col items-start gap-2">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-600/20">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-xl font-bold text-slate-800 leading-none">120K+</div>
                <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mt-1">Students</div>
              </div>
            </div>

            <div className="w-px h-12 bg-slate-100"></div>

            <div className="flex flex-col items-start gap-2">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-bold text-slate-800 leading-none">250+</div>
                <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mt-1">Courses</div>
              </div>
            </div>

            <div className="w-px h-12 bg-slate-100"></div>

            <div className="flex flex-col items-start gap-2">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-bold text-slate-800 leading-none">98%</div>
                <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mt-1">Success Rate</div>
              </div>
            </div>
          </motion.div>

          {/* Testimonial Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="w-full bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgba(37,99,235,0.06)] border border-blue-50 relative"
          >
            <div className="absolute top-6 left-6 text-blue-500/20">
              <Quote size={40} className="fill-current" />
            </div>
            <div className="pl-14 relative z-10">
              <p className="text-slate-600 text-sm font-medium leading-relaxed italic mb-4">
                "MS Gate Academy played a crucial role in my GATE success. The mentors, materials, and test series are excellent!"
              </p>
              <p className="text-xs font-bold text-[#2563EB] uppercase tracking-wide">
                — AIR 27, GATE 2024 (CSE)
              </p>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
