import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, Award, Users, BookOpen, Sparkles, TrendingUp, Target } from 'lucide-react';
import slide1 from '../assets/slideshow1.jpeg';
import slide2 from '../assets/slideshow2.jpeg';
import slide3 from '../assets/slideshow3.jpeg';
import SocialCard from './SocialCard';
import aboutImg from '../assets/about.jpeg';

export default function AboutUs() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const images = [slide1, slide2, slide3];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 4000); // Change image every 4 seconds
    return () => clearInterval(interval);
  }, [images.length]);

  const stats = [
    { label: "GATE Qualifications", value: "4+", icon: Award, desc: "Consecutive Years (2021-2024)" },
    { label: "Institution", value: "NIT", icon: GraduationCap, desc: "Trichy Alumnus" },
    { label: "Students Mentored", value: "10k+", icon: Users, desc: "Across various disciplines" },
    { label: "Experience", value: "4+ Yrs", icon: TrendingUp, desc: "Expert GATE coaching" }
  ];

  const features = [
    { title: "Concept Simplification", icon: BookOpen, desc: "Breaking down difficult concepts for clarity." },
    { title: "Personal Attention", icon: Target, desc: "Focused mentorship in a friendly environment." },
    { title: "Updated Materials", icon: Sparkles, desc: "Comprehensive educational support." }
  ];

  return (
    <>
      {/* Fixed Social Sidebar */}
      <div className="fixed left-4 top-1/2 -translate-y-1/2 z-50 hidden xl:block">
        <SocialCard />
      </div>

      <div className="w-full relative z-10 pb-16 pt-4 lg:pb-24 lg:pt-8 max-w-[1200px] mx-auto px-6 flex flex-col gap-24">
      {/* Hero Section */}
      <section className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex-1 flex flex-col gap-6"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-[#1d4ed8] font-semibold text-sm w-fit border border-blue-100">
            <Sparkles size={16} />
            <span>Ignite your dreams</span>
          </div>
          <h1 className="text-4xl lg:text-6xl font-black text-slate-900 leading-tight tracking-tight">
            Comprehensive <br />
            <span className="text-[#1d4ed8]">Educational Support</span>
          </h1>
          <p className="text-lg text-slate-500 leading-relaxed max-w-xl">
            MS Academy provides comprehensive educational support with clear concepts, personal attention, and updated study materials in a friendly environment. We aim to help students prepare with clarity and confidence.
          </p>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex-1 w-full lg:w-auto h-[400px] relative rounded-3xl overflow-hidden shadow-2xl border border-slate-100 flex items-center justify-center bg-slate-100"
        >
          <AnimatePresence mode="wait">
            <motion.img
              key={currentImageIndex}
              src={images[currentImageIndex]}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="absolute inset-0 w-full h-full object-cover"
              alt="MS Academy Slideshow"
            />
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent z-10 pointer-events-none"></div>
        </motion.div>
      </section>

      {/* Founder Section */}
      <section className="relative">
        <div className="absolute inset-0 bg-slate-50 rounded-[3rem] -z-10 transform -rotate-1 scale-105 opacity-50"></div>
        <div className="bg-white rounded-[3rem] p-8 lg:p-16 shadow-[0_20px_60px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col lg:flex-row gap-16 items-center">
          
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex-1 w-full"
          >
            <div className="relative w-full aspect-square max-w-[400px] mx-auto lg:mx-0">
              <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-[#1d4ed8] to-blue-400 rotate-6 opacity-20"></div>
              <img 
                src={aboutImg}
                alt="Dr. M. Muthu Samy"
                className="absolute inset-0 w-full h-full object-cover object-top rounded-[2.5rem] shadow-lg grayscale-[20%] hover:grayscale-0 transition-all duration-500"
              />
              <div className="absolute -bottom-6 -right-6 bg-white p-4 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-[#1d4ed8]">
                  <Award size={24} />
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-sm">GATE 2021-24</p>
                  <p className="text-xs text-slate-500 font-medium">Qualified</p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex-1 flex flex-col gap-8"
          >
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-2">Dr. M. Muthu Samy</h2>
              <p className="text-[#1d4ed8] font-semibold text-lg flex items-center gap-2">
                <GraduationCap size={20} /> Founder, MS Academy | NIT Trichy Alumnus
              </p>
            </div>
            
            <p className="text-slate-600 leading-relaxed text-lg">
              A dedicated educator and researcher known for his strong academic record and repeated GATE qualifications from 2021 to 2024. He is skilled at breaking down difficult concepts, motivating learners, and offering focused mentorship. His exam experience and teaching approach help students prepare with clarity and confidence.
            </p>

            <blockquote className="border-l-4 border-[#1d4ed8] pl-6 py-2 my-2 bg-gradient-to-r from-blue-50 to-transparent rounded-r-xl">
              <p className="text-xl text-slate-800 font-medium italic leading-relaxed">
                "Success in GATE comes from understanding concepts deeply, not just memorizing formulas."
              </p>
            </blockquote>

            <div className="flex flex-col sm:flex-row gap-4 mt-2">
              {features.map((feat, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="mt-1 text-[#1d4ed8] bg-blue-50 p-1.5 rounded-lg">
                    <feat.icon size={16} />
                  </div>
                  <span className="text-slate-700 font-medium text-sm leading-tight pt-1">{feat.title}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
        {stats.map((stat, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: idx * 0.1 }}
            className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgba(243,107,43,0.1)] transition-all duration-300 group flex flex-col items-center text-center"
          >
            <div className="w-14 h-14 bg-slate-50 group-hover:bg-blue-50 text-slate-600 group-hover:text-[#1d4ed8] rounded-2xl flex items-center justify-center mb-4 transition-colors">
              <stat.icon size={28} strokeWidth={1.5} />
            </div>
            <h3 className="text-3xl font-black text-slate-900 mb-1">{stat.value}</h3>
            <p className="font-bold text-slate-700 text-sm mb-1">{stat.label}</p>
            <p className="text-xs text-slate-500">{stat.desc}</p>
          </motion.div>
        ))}
      </section>
    </div>
    </>
  );
}
