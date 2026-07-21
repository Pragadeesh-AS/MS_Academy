import React from 'react';
import { Phone, Mail, MapPin, Send } from 'lucide-react';
import { ShinyButton } from "./ui/shiny-button";
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import SocialCard from './SocialCard';

export default function Contact() {
  return (
    <>
      {/* Fixed Social Sidebar */}
      <div className="fixed left-4 top-1/2 -translate-y-1/2 z-50 hidden xl:block">
        <SocialCard />
      </div>

      <main className="relative flex flex-col items-center justify-center px-4 pt-2 pb-16 w-full max-w-[1200px] mx-auto min-h-[calc(100vh-100px)]">


      <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        
        {/* Contact Information */}
        <div className="flex flex-col justify-center space-y-12">
          <div>
            <h1 className="text-[42px] md:text-[56px] font-[900] text-slate-900 mb-6 tracking-tight leading-[1.1]">Contact Information</h1>
            <p className="text-[18px] md:text-[20px] text-slate-500 leading-relaxed max-w-[500px]">
              We're here to help and answer any question you might have. We look forward to hearing from you.
            </p>
          </div>

          <div className="space-y-10">
            {/* Phone */}
            <div className="flex items-start gap-6 group">
              <div className="w-16 h-16 rounded-2xl bg-[#eff6ff] text-[#1d4ed8] flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-sm border border-[#ffeadd]">
                <Phone size={30} strokeWidth={1.5} />
              </div>
              <div className="flex flex-col justify-center">
                <span className="text-[16px] font-bold text-slate-400 uppercase tracking-wider mb-2">Phone</span>
                <span className="text-[22px] md:text-[24px] font-semibold text-slate-800">+91 8012052331</span>
              </div>
            </div>

            {/* Email */}
            <div className="flex items-start gap-6 group">
              <div className="w-16 h-16 rounded-2xl bg-slate-50 text-slate-700 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-sm border border-slate-100">
                <Mail size={30} strokeWidth={1.5} />
              </div>
              <div className="flex flex-col justify-center">
                <span className="text-[16px] font-bold text-slate-400 uppercase tracking-wider mb-2">Email</span>
                <span className="text-[22px] md:text-[24px] font-semibold text-slate-800 break-all">msacademics.edu@gmail.com</span>
              </div>
            </div>

            {/* Address */}
            <div className="flex items-start gap-6 group">
              <div className="w-16 h-16 rounded-2xl bg-[#eff6ff] text-[#1d4ed8] flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-sm border border-[#ffeadd]">
                <MapPin size={30} strokeWidth={1.5} />
              </div>
              <div className="flex flex-col justify-center">
                <span className="text-[16px] font-bold text-slate-400 uppercase tracking-wider mb-2">Address</span>
                <span className="text-[20px] md:text-[22px] font-medium text-slate-700 leading-relaxed max-w-[400px]">
                  9 Vinayagar Koil Street, RC Nagar, Othakkalmandapam (P.O), Coimbatore - 641032
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Animation Container */}
        <div className="relative flex justify-center items-center w-full lg:w-[110%] xl:w-[120%] h-full transform lg:translate-x-4">
          <DotLottieReact
            src="https://lottie.host/c55b41b0-7ebd-49f3-8503-c09fbcc556b3/r82htSwswC.lottie"
            loop
            autoplay
            className="w-full h-full object-contain scale-110"
          />
        </div>

      </div>
    </main>
    </>
  );
}
