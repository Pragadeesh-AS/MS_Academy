import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import './index.css';
import { ShinyButton } from "./components/ui/shiny-button";
import { motion } from "motion/react";
import { ChevronDown, GraduationCap, TrendingUp, Settings, Database, Monitor, Cpu, Cog, Building2, Zap, Gauge, Dna, FlaskConical, HeartPulse, Atom, DraftingCompass, Sprout, Anvil, Leaf, Microscope, Plane, Sparkles } from 'lucide-react';
import Home from './components/Home';
import AboutUs from './components/AboutUs';
import Contact from './components/Contact';
import CseCourse from './components/courses/Cse';
import EceCourse from './components/courses/Ece';
import MeCourse from './components/courses/Me';
import CeCourse from './components/courses/Ce';
import EeCourse from './components/courses/Ee';
import PiCourse from './components/courses/Pi';
import DsCourse from './components/courses/Ds';
import InCourse from './components/courses/In';
import BtCourse from './components/courses/Bt';
import ChCourse from './components/courses/Ch';
import BmCourse from './components/courses/Bm';
import PhCourse from './components/courses/Ph';
import ArCourse from './components/courses/Ar';
import AgCourse from './components/courses/Ag';
import MtCourse from './components/courses/Mt';
import EsCourse from './components/courses/Es';
import XlCourse from './components/courses/Xl';
import AeCourse from './components/courses/Ae';
import MorphPanel from './components/ui/ai-input';
import EnquiryForm from './components/ui/EnquiryForm';
import ProgrammingCourses from './components/ProgrammingCourses';
import Footer from './components/Footer';
import Careers from './components/Careers';

const gateCoursesDropdown = [
  { name: "GATE Computer Science (CSE)", icon: Monitor, path: "/courses/cse" },
  { name: "GATE Electronics (ECE)", icon: Cpu, path: "/courses/ece" },
  { name: "GATE Mechanical (ME)", icon: Cog, path: "/courses/me" },
  { name: "GATE Civil (CE)", icon: Building2, path: "/courses/ce" },
  { name: "GATE Electrical (EE)", icon: Zap, path: "/courses/ee" },
  { name: "GATE Production & Industrial (PI)", icon: Settings, path: "/courses/pi" },
  { name: "GATE Data Science & AI (DS)", icon: Database, path: "/courses/ds" },
  { name: "GATE Instrumentation (IN)", icon: Gauge, path: "/courses/in" },
  { name: "GATE Biotechnology (BT)", icon: Dna, path: "/courses/bt" },
  { name: "GATE Chemical (CH)", icon: FlaskConical, path: "/courses/ch" },
  { name: "GATE Biomedical (BM)", icon: HeartPulse, path: "/courses/bm" },
  { name: "GATE Physics (PH)", icon: Atom, path: "/courses/ph" },
  { name: "GATE Architecture (AR)", icon: DraftingCompass, path: "/courses/ar" },
  { name: "GATE Agricultural (AG)", icon: Sprout, path: "/courses/ag" },
  { name: "GATE Metallurgical (MT)", icon: Anvil, path: "/courses/mt" },
  { name: "GATE Environmental (ES)", icon: Leaf, path: "/courses/es" },
  { name: "GATE Life Sciences (XL)", icon: Microscope, path: "/courses/xl" },
  { name: "GATE Aerospace (AE)", icon: Plane, path: "/courses/ae" }
];

export default function App() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isDropdownHovered, setIsDropdownHovered] = useState(false);
  const [isDropdownPinned, setIsDropdownPinned] = useState(false);
  const isDropdownVisible = isDropdownHovered || isDropdownPinned;
  const location = useLocation();
  const dropdownRef = useRef(null);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownPinned(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Reset scroll and dropdown on route change
  useEffect(() => {
    window.scrollTo(0, 0);
    setIsDropdownPinned(false);
    setIsDropdownHovered(false);
  }, [location.pathname]);

  const getDynamicLink = () => {
    const defaultLink = { path: '/programming', label: 'Programming Courses' };
    
    // Only show dynamic link when scrolled (navbar is small)
    if (!isScrolled) return defaultLink;

    switch (location.pathname) {
      case '/about':
        return { path: '/about', label: 'About Us' };
      case '/contact':
        return { path: '/contact', label: 'Contact' };
      case '/careers':
        return { path: '/careers', label: 'Careers' };
      case '/blog':
        return { path: '/blog', label: 'Blog' };
      default:
        return defaultLink;
    }
  };

  const dynamicLink = getDynamicLink();

  return (
    <div className="min-h-screen bg-[#fafafa] relative overflow-hidden font-sans text-slate-900 z-0 flex flex-col pt-24">
      {/* Background Dotted Pattern */}
      <div className="absolute inset-0 z-[-1] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMCwwLDAsMC4wNSkiLz48L3N2Zz4=')] [mask-image:linear-gradient(to_bottom,white_20%,transparent_90%)] pointer-events-none"></div>

      {/* Soft Gradient Orbs */}
      <div className="absolute top-[-10%] left-[-5%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] rounded-full bg-gradient-to-br from-blue-200/20 to-transparent blur-[80px] -z-10 pointer-events-none"></div>
      <div className="absolute top-[40%] right-[-10%] w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] rounded-full bg-gradient-to-tl from-slate-200/40 to-transparent blur-[100px] -z-10 pointer-events-none"></div>
      
      {/* Background GIF Animation */}
      <div className="fixed inset-0 w-full h-full -z-20 pointer-events-none overflow-hidden">
        <img
          src="https://cdn.dribbble.com/userupload/40544684/file/original-ca49f169331ee9c82833452b691e14f3.gif"
          alt="Background Animation"
          className="w-full h-full object-cover opacity-30" 
        />
      </div>
      
      {/* Navbar Container */}
      <div className="w-full fixed top-2 inset-x-0 z-50">
        <motion.nav 
          initial={false}
          animate={{
            width: isScrolled ? "60%" : "80%",
            backgroundColor: isScrolled ? "rgba(255, 255, 255, 0.7)" : "rgba(255, 255, 255, 0.4)",
            backdropFilter: isScrolled ? "blur(24px) saturate(180%)" : "blur(16px) saturate(150%)",
            boxShadow: isScrolled 
              ? "rgba(0, 0, 0, 0.08) 0px 20px 40px -10px, inset 0px 1px 1px rgba(255, 255, 255, 0.8), inset 0px 0px 0px 1px rgba(255, 255, 255, 0.4)" 
              : "rgba(0, 0, 0, 0) 0px 0px 0px, inset 0px 1px 1px rgba(255, 255, 255, 0.3), inset 0px 0px 0px 1px rgba(255, 255, 255, 0.2)",
            y: isScrolled ? 4 : 0
          }}
          transition={{
            duration: 0.8,
            ease: [0.16, 1, 0.3, 1] // Custom smooth spring-like curve
          }}
          className="hidden md:flex flex-row self-center items-center justify-between py-3 mx-auto px-8 rounded-full relative z-[100]"
        >
          <Link to="/" className="flex flex-row items-center gap-3 whitespace-nowrap">
            <img src="/logo.png" alt="MS Academy Logo" className="w-12 h-12 object-contain" />
            <div className="flex flex-col justify-center">
              <span className="font-black text-[17px] text-slate-900 uppercase tracking-wide leading-none">MS GATE ACADEMY</span>
              <span className="font-bold text-[10px] text-[#1d4ed8] uppercase tracking-[0.15em] mt-1 leading-none">COIMBATORE</span>
            </div>
          </Link>
          
          <div className="hidden lg:flex gap-2 text-[14px] font-semibold text-slate-700 whitespace-nowrap items-center">
            
            {/* Home Link */}
            <Link to="/" className={`relative group px-4 py-2 transition-colors duration-300 ${location.pathname === '/' ? 'text-[#1d4ed8]' : 'hover:text-slate-900'}`}>
              <span className="relative z-10">Home</span>
              <div className={`absolute inset-0 rounded-full border transition-all duration-300 ${location.pathname === '/' ? 'border-[#1d4ed8]/20 bg-blue-50/80 shadow-[0_0_15px_rgba(243,107,43,0.1)]' : 'border-transparent group-hover:border-slate-900/10 group-hover:bg-slate-900/5 group-hover:shadow-[0_0_15px_rgba(0,0,0,0.05)]'} backdrop-blur-md`}></div>
            </Link>
            
            {/* GATE Courses Dropdown */}
            <div 
              ref={dropdownRef}
              className="relative flex items-center cursor-pointer group/nav"
              onMouseEnter={() => setIsDropdownHovered(true)}
              onMouseLeave={() => setIsDropdownHovered(false)}
            >
              <div 
                className="relative group px-4 py-2 flex items-center gap-1 transition-colors duration-300 hover:text-slate-900"
                onClick={(e) => {
                  e.preventDefault();
                  setIsDropdownPinned(!isDropdownPinned);
                }}
              >
                <span className="relative z-10">GATE Courses</span>
                <ChevronDown size={14} strokeWidth={2.5} className={`relative z-10 transition-transform duration-200 ${isDropdownVisible ? 'rotate-180' : ''}`} />
                <div className="absolute inset-0 rounded-full border border-transparent group-hover:border-slate-900/10 group-hover:bg-slate-900/5 group-hover:shadow-[0_0_15px_rgba(0,0,0,0.05)] backdrop-blur-md transition-all duration-300"></div>
              </div>
              
              {/* Dropdown Menu */}
              <div className={`absolute top-full left-1/2 -translate-x-1/2 mt-3 w-[340px] bg-white/90 backdrop-blur-xl border border-slate-100 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.12)] transition-all duration-300 z-[110] overflow-hidden transform origin-top ${isDropdownVisible ? 'opacity-100 visible scale-100 pointer-events-auto' : 'opacity-0 invisible scale-95 pointer-events-none'}`}>
                <div className="absolute -top-6 left-0 right-0 h-6 bg-transparent" />
                
                <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                  <span className="text-[11px] font-bold text-slate-500 tracking-widest uppercase">GATE SPECIALIZATIONS</span>
                </div>
                <div className="flex flex-col p-2 bg-transparent gap-1 max-h-[480px] overflow-y-auto overscroll-contain">
                  {gateCoursesDropdown.map((course, idx) => {
                    const Icon = course.icon;
                    return (
                      <Link key={idx} to={course.path || "#"} className="relative flex items-center gap-4 p-2.5 group/item transition-colors">
                        <div className="absolute inset-0 rounded-xl border border-transparent group-hover/item:border-slate-900/10 group-hover/item:bg-slate-900/5 group-hover/item:shadow-[0_0_15px_rgba(0,0,0,0.05)] backdrop-blur-md transition-all duration-300 pointer-events-none"></div>
                        <div className="relative z-10 w-[42px] h-[42px] rounded-xl bg-slate-50 flex flex-shrink-0 items-center justify-center border border-slate-100 group-hover/item:border-slate-300 group-hover/item:bg-white transition-colors shadow-sm">
                          <Icon size={18} strokeWidth={2} className="text-slate-500 group-hover/item:text-slate-900 transition-colors" />
                        </div>
                        <span className="relative z-10 text-[15px] font-medium text-slate-700 group-hover/item:text-slate-900 transition-colors">{course.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Dynamic Link (Programming Courses / Active Page) */}
            <Link to={dynamicLink.path} className={`relative group px-4 py-2 transition-colors duration-300 ${location.pathname === dynamicLink.path ? 'text-[#1d4ed8]' : 'hover:text-slate-900'}`}>
              <span className="relative z-10">{dynamicLink.label}</span>
              <div className={`absolute inset-0 rounded-full border transition-all duration-300 ${location.pathname === dynamicLink.path ? 'border-[#1d4ed8]/20 bg-blue-50/80 shadow-[0_0_15px_rgba(243,107,43,0.1)]' : 'border-transparent group-hover:border-slate-900/10 group-hover:bg-slate-900/5 group-hover:shadow-[0_0_15px_rgba(0,0,0,0.05)]'} backdrop-blur-md`}></div>
            </Link>
            
            {/* Collapsible Links based on Scroll */}
            <div className={`flex items-center gap-2 overflow-hidden transition-all duration-700 ${isScrolled ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
              <Link to="/about" className={`relative group px-4 py-2 transition-colors duration-300 ${location.pathname === '/about' ? 'text-[#1d4ed8]' : 'hover:text-slate-900'}`}>
                <span className="relative z-10">About Us</span>
                <div className={`absolute inset-0 rounded-full border transition-all duration-300 ${location.pathname === '/about' ? 'border-[#1d4ed8]/20 bg-blue-50/80 shadow-[0_0_15px_rgba(243,107,43,0.1)]' : 'border-transparent group-hover:border-slate-900/10 group-hover:bg-slate-900/5 group-hover:shadow-[0_0_15px_rgba(0,0,0,0.05)]'} backdrop-blur-md`}></div>
              </Link>
              
              <Link to="/careers" className={`relative group px-4 py-2 transition-colors duration-300 ${location.pathname === '/careers' ? 'text-[#1d4ed8]' : 'hover:text-slate-900'}`}>
                <span className="relative z-10">Careers</span>
                <div className={`absolute inset-0 rounded-full border transition-all duration-300 ${location.pathname === '/careers' ? 'border-[#1d4ed8]/20 bg-blue-50/80 shadow-[0_0_15px_rgba(243,107,43,0.1)]' : 'border-transparent group-hover:border-slate-900/10 group-hover:bg-slate-900/5 group-hover:shadow-[0_0_15px_rgba(0,0,0,0.05)]'} backdrop-blur-md`}></div>
              </Link>
              
              <Link to="/blog" className={`relative group px-4 py-2 transition-colors duration-300 ${location.pathname === '/blog' ? 'text-[#1d4ed8]' : 'hover:text-slate-900'}`}>
                <span className="relative z-10">Blog</span>
                <div className={`absolute inset-0 rounded-full border transition-all duration-300 ${location.pathname === '/blog' ? 'border-[#1d4ed8]/20 bg-blue-50/80 shadow-[0_0_15px_rgba(243,107,43,0.1)]' : 'border-transparent group-hover:border-slate-900/10 group-hover:bg-slate-900/5 group-hover:shadow-[0_0_15px_rgba(0,0,0,0.05)]'} backdrop-blur-md`}></div>
              </Link>
              
              <Link to="/contact" className={`relative group px-4 py-2 transition-colors duration-300 ${location.pathname === '/contact' ? 'text-[#1d4ed8]' : 'hover:text-slate-900'}`}>
                <span className="relative z-10">Contact</span>
                <div className={`absolute inset-0 rounded-full border transition-all duration-300 ${location.pathname === '/contact' ? 'border-[#1d4ed8]/20 bg-blue-50/80 shadow-[0_0_15px_rgba(243,107,43,0.1)]' : 'border-transparent group-hover:border-slate-900/10 group-hover:bg-slate-900/5 group-hover:shadow-[0_0_15px_rgba(0,0,0,0.05)]'} backdrop-blur-md`}></div>
              </Link>
            </div>
          </div>
          
          <div className="flex items-center transition-all duration-700 whitespace-nowrap opacity-100 gap-4">
            <ShinyButton className={`font-semibold text-white rounded-lg bg-gradient-to-b from-[#3a3a3a] to-[#1a1a1a] shadow-md hover:from-[#2a2a2a] hover:to-[#0a0a0a] transition-all border border-[#2a2a2a] ${isScrolled ? 'px-4 py-2 text-[14px]' : 'px-6 py-2.5 text-[15px]'}`}>
              Student Portal
            </ShinyButton>
          </div>
        </motion.nav>
      </div>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/courses/cse" element={<CseCourse />} />
        <Route path="/courses/ece" element={<EceCourse />} />
        <Route path="/courses/me" element={<MeCourse />} />
        <Route path="/courses/ce" element={<CeCourse />} />
        <Route path="/courses/ee" element={<EeCourse />} />
        <Route path="/courses/pi" element={<PiCourse />} />
        <Route path="/courses/ds" element={<DsCourse />} />
        <Route path="/courses/in" element={<InCourse />} />
        <Route path="/courses/bt" element={<BtCourse />} />
        <Route path="/courses/ch" element={<ChCourse />} />
        <Route path="/courses/bm" element={<BmCourse />} />
        <Route path="/courses/ph" element={<PhCourse />} />
        <Route path="/courses/ar" element={<ArCourse />} />
        <Route path="/courses/ag" element={<AgCourse />} />
        <Route path="/courses/mt" element={<MtCourse />} />
        <Route path="/courses/es" element={<EsCourse />} />
        <Route path="/courses/xl" element={<XlCourse />} />
        <Route path="/courses/ae" element={<AeCourse />} />
        <Route path="/programming" element={<ProgrammingCourses />} />
        <Route path="/careers" element={<Careers />} />
      </Routes>

      <Footer />

      {/* Floating Quote Badge */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1, duration: 0.8 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] pointer-events-none"
      >
        <div className="px-5 py-2.5 rounded-full bg-white/70 backdrop-blur-md border border-[#1d4ed8]/20 shadow-[0_8px_30px_rgba(29,78,216,0.15)] flex items-center gap-2">
          <Sparkles size={14} className="text-[#1d4ed8] animate-pulse" />
          <span className="text-[13px] font-black tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-r from-[#1d4ed8] to-blue-500">
            Ignite your dreams
          </span>
          <Sparkles size={14} className="text-[#1d4ed8] animate-pulse" />
        </div>
      </motion.div>

      {/* Global Floating Components */}
      {location.pathname === '/' || location.pathname === '/contact' ? <EnquiryForm /> : <MorphPanel />}
    </div>
  );
}

