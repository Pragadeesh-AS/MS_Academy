import React from 'react';
import { Carousel_003 } from "./ui/swiper-carousel";
import { ShinyButton } from "./ui/shiny-button";
import { BookOpen, Target, Users } from 'lucide-react';
import homeImg from '../assets/home.jpeg';
import { motion } from 'framer-motion';
import SocialCard from './SocialCard';

const courses = [
  {
    src: "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=3000&auto=format&fit=crop",
    title: "Computer Science (CSE)",
    category: "CSE",
  },
  {
    src: "https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?q=80&w=3000&auto=format&fit=crop",
    title: "Electronics (ECE)",
    category: "ECE",
  },
  {
    src: "https://images.unsplash.com/photo-1537462715879-360eeb61a0ad?q=80&w=3000&auto=format&fit=crop",
    title: "Mechanical (ME)",
    category: "ME",
  },
  {
    src: "https://images.unsplash.com/photo-1508450859948-4e04fabaa4ea?q=80&w=3000&auto=format&fit=crop",
    title: "Civil (CE)",
    category: "CE",
  },
  {
    src: "https://images.unsplash.com/photo-1498084393753-b411b2d26b34?q=80&w=3000&auto=format&fit=crop",
    title: "Electrical (EE)",
    category: "EE",
  },
  {
    src: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=3000&auto=format&fit=crop",
    title: "Coimbatore Offline",
    category: "OFFLINE",
  }
];

export default function Home() {
  const swiperImages = courses.map(course => ({
    src: course.src,
    alt: course.title,
    category: course.category
  }));

  return (
    <>
      {/* Fixed Social Sidebar */}
      <div className="fixed left-4 top-1/2 -translate-y-1/2 z-50 hidden xl:block">
        <SocialCard />
      </div>

      {/* Hero Section */}
      <main className="relative flex flex-col lg:flex-row items-center justify-between text-center lg:text-left px-4 pt-4 pb-12 max-w-[1200px] w-full mx-auto gap-12">
        <div className="flex-1 flex flex-col items-center lg:items-start max-w-2xl">
          <h1 className="text-[52px] md:text-[72px] font-[900] text-slate-900 leading-[1.1] tracking-[-0.03em] mb-6">
            Best <span className="text-[#1D4ED8]">GATE Coaching</span> in Coimbatore <br />
            <span className="text-[32px] md:text-[42px] text-slate-600 font-bold block mt-4 tracking-tight">| Online & Offline Classes</span>
          </h1>

          <p className="text-[17px] font-bold text-slate-700 mb-10 leading-relaxed">
            Learn directly from Dr. M. Muthu Samy (NIT Trichy Alumnus). Go from average scores to your dream PSU or IIT with ease using MS Gate Academy, your favourite coaching platform.
          </p>

          <ShinyButton className="px-8 py-4 text-[17px] font-semibold text-white rounded-xl bg-gradient-to-b from-[#4a4a4a] via-[#2a2a2a] to-[#111111] shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:scale-[1.02] transition-transform border border-[#333333]">
            Get Started
          </ShinyButton>
        </div>

        <motion.div 
          animate={{ y: [0, -15, 0] }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          className="w-full lg:w-[900px] xl:w-[600px] relative flex justify-center items-center mt-12 lg:mt-0 lg:ml-auto"
        >
          {/* Decorative background glow behind the image */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-blue-400/20 blur-[60px] rounded-full -z-10 pointer-events-none"></div>
          
          <img 
            src={homeImg} 
            alt="MS GATE Academy Coaching" 
            className="w-full h-auto object-contain rounded-[32px] drop-shadow-2xl hover:scale-105 transition-transform duration-500"
          />
        </motion.div>
      </main>

      {/* Features Section */}
      <section className="relative z-10 w-full max-w-[1100px] mx-auto px-6 py-16 md:py-24">
        {/* Subtle background glow for the section */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-gradient-to-r from-[#dbeafe]/30 via-transparent to-[#dbeafe]/30 blur-[80px] -z-10 rounded-[100%] opacity-50 pointer-events-none"></div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
          {/* Feature 1 */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
            viewport={{ once: true, margin: "-50px" }}
            className="flex flex-col items-center text-center group bg-white/70 backdrop-blur-md border border-slate-100 rounded-[32px] p-8 shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_40px_rgba(243,107,43,0.08)] hover:-translate-y-2 hover:bg-white transition-all duration-500"
          >
            <div className="w-16 h-16 rounded-[20px] bg-gradient-to-br from-[#eff6ff] to-blue-50 text-[#1d4ed8] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-inner">
              <BookOpen size={28} strokeWidth={2} />
            </div>
            <h3 className="text-[20px] font-bold text-slate-900 mb-3 tracking-tight">Expert Mentorship</h3>
            <p className="text-[15px] text-slate-500 leading-relaxed font-medium">
              Learn directly from NIT Trichy alumni. Get the right guidance from someone who has cracked GATE 4 times consecutively.
            </p>
          </motion.div>

          {/* Feature 2 */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            viewport={{ once: true, margin: "-50px" }}
            className="flex flex-col items-center text-center group bg-white/70 backdrop-blur-md border border-slate-100 rounded-[32px] p-8 shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_40px_rgba(243,107,43,0.08)] hover:-translate-y-2 hover:bg-white transition-all duration-500 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
            <div className="w-16 h-16 rounded-[20px] bg-gradient-to-br from-slate-50 to-slate-100 text-slate-700 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:text-[#1d4ed8] group-hover:from-[#eff6ff] group-hover:to-blue-50 transition-all duration-500 shadow-inner border border-slate-200/50 group-hover:border-transparent">
              <Target size={28} strokeWidth={2} />
            </div>
            <h3 className="text-[20px] font-bold text-slate-900 mb-3 tracking-tight">Mock Test Series</h3>
            <p className="text-[15px] text-slate-500 leading-relaxed font-medium">
              Real GATE-level CBT practice. Evaluate your performance with our in-depth analytics and stay ahead of the competition.
            </p>
          </motion.div>

          {/* Feature 3 */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
            viewport={{ once: true, margin: "-50px" }}
            className="flex flex-col items-center text-center group bg-white/70 backdrop-blur-md border border-slate-100 rounded-[32px] p-8 shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_40px_rgba(243,107,43,0.08)] hover:-translate-y-2 hover:bg-white transition-all duration-500"
          >
            <div className="w-16 h-16 rounded-[20px] bg-gradient-to-br from-[#eff6ff] to-blue-50 text-[#1d4ed8] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-inner">
              <Users size={28} strokeWidth={2} />
            </div>
            <h3 className="text-[20px] font-bold text-slate-900 mb-3 tracking-tight">Personalized Attention</h3>
            <p className="text-[15px] text-slate-500 leading-relaxed font-medium">
              Premium offline coaching in Coimbatore with small batches. Never get lost in a crowd again.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Courses Carousel Section */}
      <section className="w-full relative z-10 py-12 flex-1 overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-8 mb-4">
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Explore Courses</h2>
          <p className="text-slate-500 font-medium">Find the perfect GATE program for your engineering discipline.</p>
        </div>
        <div className="mt-8">
          <Carousel_003 images={swiperImages} showPagination={true} autoplay={true} loop={true} showNavigation={true} />
        </div>
      </section>
    </>
  );
}
