import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, Sparkles, Quote, Star, Target, BookOpen, Monitor, Code2, Brain, Flame } from 'lucide-react';
import loginImage from '../assets/login.jpeg';
import { auth } from '../firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

export default function LoginSignup() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
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
      await signInWithPopup(auth, provider);
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("Firebase connected successfully!");
      if (user) {
        console.log("User is logged in:", user.email);
      } else {
        console.log("No user is logged in.");
      }
    }, (error) => {
      console.error("Firebase connection error:", error);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen w-full flex overflow-hidden bg-white relative z-0">
      
      {/* Container */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full min-h-screen flex flex-col md:flex-row relative z-10"
      >
        {/* Left Panel - Form */}
        <div className="w-full md:w-1/2 py-6 px-8 lg:py-12 lg:px-16 flex flex-col justify-center bg-white">
          <div className="max-w-sm w-full mx-auto">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-8">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                  <User className="text-white w-5 h-5" />
                </div>
                <h1 className="text-xl font-black text-slate-800 tracking-tight">MS Gate Academy</h1>
              </div>
              <h2 className="text-3xl font-bold text-slate-800 mb-2">
                {isLogin ? "Welcome back 👋" : "Create Account"}
              </h2>
              <p className="text-slate-500 font-medium">
                {isLogin ? "Login to your account with email and password." : "Join our learning community today."}
              </p>
            </div>

            {error && (
              <div className="mb-4 p-2.5 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-semibold">
                {error}
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <AnimatePresence mode="popLayout">
                {!isLogin && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-1"
                  >
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider ml-1">Full Name <span className="text-red-500">*</span></label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                        <User size={18} />
                      </div>
                      <input 
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required={!isLogin}
                        placeholder="John Doe"
                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all font-medium text-slate-700 placeholder:text-slate-400"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider ml-1">Email Id <span className="text-red-500">*</span></label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                    <Mail size={18} />
                  </div>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="Enter your Email ID"
                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all font-medium text-slate-700 placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider ml-1">Password <span className="text-red-500">*</span></label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                    <Lock size={18} />
                  </div>
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter your password"
                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all font-medium text-slate-700 placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600" />
                  <span className="text-sm font-medium text-slate-600">Remember me</span>
                </label>
                <button type="button" className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors">
                  Forgot Password?
                </button>
              </div>

              <button 
                disabled={loading}
                className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:hover:-translate-y-0"
              >
                {loading ? "Processing..." : (isLogin ? "Login" : "Sign Up")}
              </button>
            </form>

            <div className="mt-6 relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <span className="relative bg-white px-4 text-sm font-semibold text-slate-400">
                Or continue with
              </span>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <button 
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-bold py-3 px-4 rounded-xl transition-all shadow-sm"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </button>
              
              <div className="text-center mt-2">
                <p className="text-slate-500 text-sm font-medium">
                  {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
                  <button 
                    onClick={() => {
                      setIsLogin(!isLogin);
                      setError('');
                    }}
                    className="text-blue-600 font-bold hover:text-blue-800 transition-colors"
                  >
                    {isLogin ? "Register now" : "Login"}
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Premium EdTech Overlay */}
        <div className="hidden md:block w-full md:w-1/2 relative bg-slate-900 overflow-hidden">
          {/* Base Image */}
          <img 
            src={loginImage} 
            alt="Welcome to MS Gate Academy" 
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Dark Gradient Overlay for Readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a]/95 via-[#0f172a]/60 to-[#0f172a]/20 z-10"></div>

          {/* Floating Particles and Circuit Lines */}
          <div className="absolute inset-0 z-10 opacity-10 pointer-events-none overflow-hidden">
            <div className="absolute top-[15%] left-[10%] w-1.5 h-1.5 rounded-full bg-[#18C6D9] shadow-[0_0_10px_#18C6D9] animate-pulse"></div>
            <div className="absolute top-[35%] right-[15%] w-2 h-2 rounded-full bg-[#18C6D9] shadow-[0_0_10px_#18C6D9] animate-pulse" style={{ animationDelay: '1s' }}></div>
            <div className="absolute bottom-[40%] left-[20%] w-2.5 h-2.5 rounded-full bg-[#18C6D9] shadow-[0_0_10px_#18C6D9] animate-pulse" style={{ animationDelay: '0.5s' }}></div>
            <div className="absolute top-[60%] right-[10%] w-1 h-1 rounded-full bg-white shadow-[0_0_5px_white] animate-pulse" style={{ animationDelay: '1.2s' }}></div>
            
            {/* Circuit Lines */}
            <div className="absolute top-0 right-16 w-px h-40 bg-gradient-to-b from-[#18C6D9] to-transparent"></div>
            <div className="absolute top-40 right-4 w-12 h-px bg-gradient-to-l from-[#18C6D9] to-transparent"></div>
            <div className="absolute bottom-32 left-0 w-24 h-px bg-gradient-to-r from-[#18C6D9] to-transparent"></div>
            <div className="absolute bottom-12 left-24 w-px h-20 bg-gradient-to-t from-[#18C6D9] to-transparent"></div>
          </div>

          {/* Content Overlay */}
          <div className="relative z-20 w-full h-full p-8 lg:p-10 flex flex-col justify-between">
            
            {/* Top Section: Quote */}
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="mt-2"
            >
              <div className="text-[#18C6D9] mb-3">
                <Quote size={36} className="opacity-90 fill-current" />
              </div>
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-2 leading-tight">
                Success begins <br/>with <span className="text-[#18C6D9]">consistency.</span>
              </h2>
              <div className="w-12 h-1 bg-[#18C6D9] rounded-full mt-3 mb-3"></div>
              <p className="text-slate-200 text-base font-medium">Keep learning, keep growing!</p>
            </motion.div>

            {/* Bottom Section: Stats and Courses */}
            <div className="mt-8 space-y-6">
              
              {/* Stats Card */}
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="bg-[rgba(15,23,42,0.55)] backdrop-blur-[18px] border border-white/10 rounded-[18px] p-5 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
              >
                <div className="flex justify-between items-center text-center">
                  <div className="flex-1">
                    <Star className="w-5 h-5 text-[#18C6D9] mx-auto mb-2 fill-current" />
                    <div className="text-white font-bold text-lg">4.9/5</div>
                    <div className="text-slate-300 text-[10px] uppercase tracking-wider font-semibold mt-1">Rating</div>
                  </div>
                  <div className="w-px h-10 bg-white/10"></div>
                  <div className="flex-1">
                    <Target className="w-5 h-5 text-[#18C6D9] mx-auto mb-2" />
                    <div className="text-white font-bold text-lg">98%</div>
                    <div className="text-slate-300 text-[10px] uppercase tracking-wider font-semibold mt-1">Success Rate</div>
                  </div>
                  <div className="w-px h-10 bg-white/10"></div>
                  <div className="flex-1">
                    <BookOpen className="w-5 h-5 text-[#18C6D9] mx-auto mb-2" />
                    <div className="text-white font-bold text-lg">18</div>
                    <div className="text-slate-300 text-[10px] uppercase tracking-wider font-semibold mt-1">Courses</div>
                  </div>
                </div>
              </motion.div>

              {/* Trending Courses Section */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Flame className="w-5 h-5 text-orange-500 fill-orange-500" />
                  <h3 className="text-white font-bold text-base">Trending Courses</h3>
                </div>

                <div className="flex flex-row gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  
                  {/* Card 1 */}
                  <motion.div 
                    whileHover={{ y: -6 }}
                    className="group min-w-[140px] flex-1 flex flex-col items-start bg-[rgba(20,30,48,0.55)] backdrop-blur-[18px] border border-white/10 rounded-2xl p-3 transition-all duration-300 hover:border-[#18C6D9] hover:shadow-[0_20px_40px_rgba(24,198,217,0.25)]"
                  >
                    <div className="flex w-full items-start justify-between mb-3">
                      <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-[#18C6D9]/20 transition-colors">
                        <Monitor className="w-4 h-4 text-[#18C6D9]" />
                      </div>
                      <div className="px-2 py-0.5 rounded bg-green-500/20 border border-green-500/30 text-green-400 text-[9px] font-bold uppercase tracking-wide">
                        Popular
                      </div>
                    </div>
                    <div>
                      <h4 className="text-white font-semibold text-xs group-hover:text-[#18C6D9] transition-colors leading-tight line-clamp-2">GATE CSE 2027</h4>
                      <p className="text-slate-400 text-[10px] mt-1">98K Students</p>
                    </div>
                  </motion.div>

                  {/* Card 2 */}
                  <motion.div 
                    whileHover={{ y: -6 }}
                    className="group min-w-[140px] flex-1 flex flex-col items-start bg-[rgba(20,30,48,0.55)] backdrop-blur-[18px] border border-white/10 rounded-2xl p-3 transition-all duration-300 hover:border-[#18C6D9] hover:shadow-[0_20px_40px_rgba(24,198,217,0.25)]"
                  >
                    <div className="flex w-full items-start justify-between mb-3">
                      <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-[#18C6D9]/20 transition-colors">
                        <Code2 className="w-4 h-4 text-[#18C6D9]" />
                      </div>
                      <div className="px-2 py-0.5 rounded bg-green-500/20 border border-green-500/30 text-green-400 text-[9px] font-bold uppercase tracking-wide">
                        Popular
                      </div>
                    </div>
                    <div>
                      <h4 className="text-white font-semibold text-xs group-hover:text-[#18C6D9] transition-colors leading-tight line-clamp-2">Data Structures & Algorithms</h4>
                      <p className="text-slate-400 text-[10px] mt-1">76K Students</p>
                    </div>
                  </motion.div>

                  {/* Card 3 */}
                  <motion.div 
                    whileHover={{ y: -6 }}
                    className="group min-w-[140px] flex-1 flex flex-col items-start bg-[rgba(20,30,48,0.55)] backdrop-blur-[18px] border border-white/10 rounded-2xl p-3 transition-all duration-300 hover:border-[#18C6D9] hover:shadow-[0_20px_40px_rgba(24,198,217,0.25)]"
                  >
                    <div className="flex w-full items-start justify-between mb-3">
                      <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-[#18C6D9]/20 transition-colors">
                        <Brain className="w-4 h-4 text-[#18C6D9]" />
                      </div>
                      <div className="px-2 py-0.5 rounded bg-blue-500/20 border border-blue-500/30 text-blue-400 text-[9px] font-bold uppercase tracking-wide">
                        New
                      </div>
                    </div>
                    <div>
                      <h4 className="text-white font-semibold text-xs group-hover:text-[#18C6D9] transition-colors leading-tight line-clamp-2">AI & Machine Learning</h4>
                      <p className="text-slate-400 text-[10px] mt-1">65K Students</p>
                    </div>
                  </motion.div>

                </div>
              </motion.div>
            </div>
          </div>
        </div>

      </motion.div>
    </div>
  );
}
