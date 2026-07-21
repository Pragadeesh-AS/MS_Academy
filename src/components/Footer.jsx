import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, Camera, Briefcase, Tv, Globe, ChevronRight } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative mt-20 pt-16 pb-8 bg-[#FFFCE1]/30 border-t border-[#f36b2b]/20 overflow-hidden text-slate-600">
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#f36b2b]/50 to-transparent"></div>
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#f36b2b]/10 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-blue-500/10 blur-[100px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          
          {/* Brand Section */}
          <div className="flex flex-col gap-6">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white rounded-xl p-1 flex items-center justify-center">
                <img src="/logo.png" alt="MS Academy Logo" className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col">
                <span className="font-black text-[18px] text-slate-900 uppercase tracking-wide leading-none">MS GATE ACADEMY</span>
                <span className="font-bold text-[11px] text-[#f36b2b] uppercase tracking-[0.15em] mt-1 leading-none">COIMBATORE</span>
              </div>
            </Link>
            <p className="text-slate-600 text-sm leading-relaxed">
              Empowering engineers to achieve their dreams with top-tier coaching for GATE and programming excellence. Your success is our mission.
            </p>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-[#f36b2b] hover:text-white transition-all duration-300 shadow-sm hover:shadow-[0_0_15px_rgba(243,107,43,0.3)]">
                <Globe size={18} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-[#f36b2b] hover:text-white transition-all duration-300 shadow-sm hover:shadow-[0_0_15px_rgba(243,107,43,0.3)]">
                <Camera size={18} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-[#f36b2b] hover:text-white transition-all duration-300 shadow-sm hover:shadow-[0_0_15px_rgba(243,107,43,0.3)]">
                <Tv size={18} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-[#f36b2b] hover:text-white transition-all duration-300 shadow-sm hover:shadow-[0_0_15px_rgba(243,107,43,0.3)]">
                <Briefcase size={18} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="flex flex-col gap-6">
            <h3 className="text-slate-900 font-bold text-lg tracking-wide">Quick Links</h3>
            <ul className="flex flex-col gap-3">
              {[
                { name: 'Home', path: '/' },
                { name: 'About Us', path: '/about' },
                { name: 'Careers', path: '#' },
                { name: 'Blog', path: '#' },
                { name: 'Contact', path: '/contact' }
              ].map((link, idx) => (
                <li key={idx}>
                  <Link to={link.path} className="flex items-center gap-2 text-slate-600 hover:text-[#f36b2b] transition-colors group">
                    <ChevronRight size={14} className="text-[#f36b2b] opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300" />
                    <span className="-translate-x-3 group-hover:translate-x-0 transition-all duration-300">{link.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Popular Courses */}
          <div className="flex flex-col gap-6">
            <h3 className="text-slate-900 font-bold text-lg tracking-wide">Popular Courses</h3>
            <ul className="flex flex-col gap-3">
              {[
                { name: 'GATE Computer Science', path: '/courses/cse' },
                { name: 'GATE Electronics', path: '/courses/ece' },
                { name: 'GATE Mechanical', path: '/courses/me' },
                { name: 'Programming Courses', path: '/programming' },
                { name: 'Data Science & AI', path: '/courses/ds' }
              ].map((link, idx) => (
                <li key={idx}>
                  <Link to={link.path} className="flex items-center gap-2 text-slate-600 hover:text-[#f36b2b] transition-colors group">
                    <ChevronRight size={14} className="text-[#f36b2b] opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300" />
                    <span className="-translate-x-3 group-hover:translate-x-0 transition-all duration-300">{link.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div className="flex flex-col gap-6">
            <h3 className="text-slate-900 font-bold text-lg tracking-wide">Contact Us</h3>
            <ul className="flex flex-col gap-4">
              <li className="flex items-start gap-3">
                <MapPin className="text-[#f36b2b] flex-shrink-0 mt-1" size={18} />
                <span className="text-slate-600 text-sm leading-relaxed">
                 9 Vinayagar Koil Street, RC Nagar,<br />
                  Othakkalmandapam (P.O), Coimbatore - 641032
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="text-[#f36b2b] flex-shrink-0" size={18} />
                <span className="text-slate-600 text-sm">+91 8012052331</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="text-[#f36b2b] flex-shrink-0" size={18} />
                <span className="text-slate-600 text-sm">msacademics.edu@gmail.com</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-slate-500 text-sm">
            &copy; {currentYear} MS GATE Academy. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm">
            <a href="#" className="text-slate-500 hover:text-[#f36b2b] transition-colors">Privacy Policy</a>
            <a href="#" className="text-slate-500 hover:text-[#f36b2b] transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
