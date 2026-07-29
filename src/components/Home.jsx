import React, { useState } from 'react';
import { Carousel_003 } from "./ui/swiper-carousel";
import { ShinyButton } from "./ui/shiny-button";
import { BookOpen, Target, Users, Star, Quote } from 'lucide-react';
import homeImg from '../assets/home.jpeg';
import { motion, AnimatePresence } from 'framer-motion';
import SocialCard from './SocialCard';

const courses = [
  {
    src: "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=3000&auto=format&fit=crop",
    title: "Computer Science (CSE)",
    category: "CSE",
    path: "/courses/cse"
  },
  {
    src: "https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?q=80&w=3000&auto=format&fit=crop",
    title: "Electronics (ECE)",
    category: "ECE",
    path: "/courses/ece"
  },
  {
    src: "https://images.unsplash.com/photo-1537462715879-360eeb61a0ad?q=80&w=3000&auto=format&fit=crop",
    title: "Mechanical (ME)",
    category: "ME",
    path: "/courses/me"
  },
  {
    src: "https://images.unsplash.com/photo-1508450859948-4e04fabaa4ea?q=80&w=3000&auto=format&fit=crop",
    title: "Civil (CE)",
    category: "CE",
    path: "/courses/ce"
  },
  {
    src: "https://images.unsplash.com/photo-1498084393753-b411b2d26b34?q=80&w=3000&auto=format&fit=crop",
    title: "Electrical (EE)",
    category: "EE",
    path: "/courses/ee"
  },
  {
    src: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=3000&auto=format&fit=crop",
    title: "Data Science & AI (DS)",
    category: "DS",
    path: "/courses/ds"
  },
  {
    src: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=3000&auto=format&fit=crop",
    title: "Production & Industrial Engineering (PI)",
    category: "PI",
    path: "/courses/pi"
  },
  {
    src: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=3000&auto=format&fit=crop",
    title: "Instrumentation Engineering (IN)",
    category: "IN",
    path: "/courses/in"
  },
  {
    src: "https://images.unsplash.com/photo-1576086213369-97a306d36557?q=80&w=3000&auto=format&fit=crop",
    title: "Biotechnology (BT)",
    category: "BT",
    path: "/courses/bt"
  },
  {
    src: "https://images.unsplash.com/photo-1532187643603-ba119ca4109e?q=80&w=3000&auto=format&fit=crop",
    title: "Chemical Engineering (CH)",
    category: "CH",
    path: "/courses/ch"
  },
  {
    src: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=3000&auto=format&fit=crop",
    title: "Biomedical Engineering (BM)",
    category: "BM",
    path: "/courses/bm"
  },
  {
    src: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=3000&auto=format&fit=crop",
    title: "Physics (PH)",
    category: "PH",
    path: "/courses/ph"
  },
  {
    src: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=3000&auto=format&fit=crop",
    title: "Architecture & Planning (AR)",
    category: "AR",
    path: "/courses/ar"
  },
  {
    src: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?q=80&w=3000&auto=format&fit=crop",
    title: "Agricultural Engineering (AG)",
    category: "AG",
    path: "/courses/ag"
  },
  {
    src: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?q=80&w=3000&auto=format&fit=crop",
    title: "Metallurgical Engineering (MT)",
    category: "MT",
    path: "/courses/mt"
  },
  {
    src: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=3000&auto=format&fit=crop",
    title: "Environmental Science & Engg (ES)",
    category: "ES",
    path: "/courses/es"
  },
  {
    src: "https://images.unsplash.com/photo-1579154204601-01588f351e67?q=80&w=3000&auto=format&fit=crop",
    title: "Life Sciences (XL)",
    category: "XL",
    path: "/courses/xl"
  },
  {
    src: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=3000&auto=format&fit=crop",
    title: "Aerospace Engineering (AE)",
    category: "AE",
    path: "/courses/ae"
  }
];

const testimonials = [
  {
    name: "Rithikaa Kannan",
    role: "GATE Aspirant",
    discipline: "GATE Coaching",
    quote: "I am truly grateful to be a part of this academy. The GATE coaching is excellent, with well-structured classes and experienced faculty who explain every concept clearly. The teachers and staff are very kind, supportive, and always willing to interact with students and clear our doubts. The academy’s sir is also very humble, caring, and encourages every student to do their best. I feel truly blessed to have joined this academy, and I highly recommend it to anyone preparing for GATE. Thank you for your continuous support and guidance!",
    rating: 5,
    initials: "RK",
    bgGradient: "from-blue-500 to-indigo-600"
  },
  {
    name: "Priya",
    role: "GATE Aspirant",
    discipline: "One-to-One Online Classes",
    quote: "The teaching faculty is excellent and has a very friendly approach. The one to one online classes are highly effective and help me gain indepth knowledge. One of the special features of this academy is the constant support provided to students by its founder, Muthusamy Sir. When it comes to competitive exams, everyone needs someone who believes in them and supports them throughout the journey. Muthusamy Sir is truly a gem who supports me in every possible way. Apart from academics, he also takes care of the mental well-being of students, which is very important during exam preparation. I am grateful to be a part of this academy and for the guidance and support I receive every day. The encouragement and personal attention given to each student make a real difference and all this is possible because, here, passion has truly becomes a profession. As a aspirant i highly recommend this academy to anyone preparing for competitive exams like gate and other exams.",
    rating: 5,
    initials: "P",
    bgGradient: "from-purple-500 to-pink-600"
  },
  {
    name: "Kiruthika Krishnakumar",
    role: "GATE Aspirant",
    discipline: "GATE Preparation",
    quote: "The teaching at this GATE academy is excellent. Every concept is explained clearly and in a simple way, making even tough topics easy to understand. What I love most is that the classes feel more like a friendly conversation than a lecture. The faculty are very approachable and always ready to help with doubts. Highly recommended for anyone preparing for GATE.",
    rating: 5,
    initials: "KK",
    bgGradient: "from-emerald-500 to-teal-600"
  }
];

function TestimonialCard({ testimonial, onReadMore }) {
  const isLong = testimonial.quote.length > 200;
  const displayQuote = isLong ? testimonial.quote.slice(0, 185) + "..." : testimonial.quote;

  return (
    <motion.div
      whileHover={{ 
        y: -10, 
        rotateX: 4, 
        rotateY: -4, 
        scale: 1.025,
        z: 15
      }}
      style={{ transformStyle: "preserve-3d" }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className="group w-full bg-gradient-to-br from-white/80 via-white/70 to-slate-50/50 backdrop-blur-xl border border-white/60 rounded-[32px] p-7 shadow-[0_10px_35px_rgba(0,0,0,0.02)] hover:shadow-[0_30px_60px_rgba(37,99,235,0.08)] hover:border-blue-200/50 transition-all duration-300 flex flex-col justify-between min-h-[320px] h-full relative overflow-hidden"
    >
      {/* Laser neon line shine effects on hover */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/80 to-transparent transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-center pointer-events-none"></div>
      <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500/80 to-transparent transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-center pointer-events-none"></div>

      {/* Floating back-glow particles */}
      <div className="absolute -right-8 -bottom-8 w-24 h-24 rounded-full bg-gradient-to-br from-blue-400/20 to-purple-400/20 blur-xl group-hover:scale-150 transition-transform duration-700 pointer-events-none"></div>
      <div className="absolute -left-8 -top-8 w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-400/10 to-pink-400/10 blur-xl group-hover:scale-150 transition-transform duration-700 pointer-events-none"></div>

      {/* Floating Quote Icon Bubble */}
      <div 
        style={{ transform: "translateZ(30px)" }}
        className="absolute right-6 top-6 w-9 h-9 rounded-full bg-white/90 border border-slate-100/50 flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.02)] group-hover:shadow-[0_4px_12px_rgba(37,99,235,0.08)] group-hover:bg-blue-50 group-hover:border-blue-100 transition-all duration-300 pointer-events-none"
      >
        <Quote size={15} className="text-slate-400 group-hover:text-blue-500 transition-colors duration-300" />
      </div>

      <div>
        {/* Header: Profile & Stars */}
        <div className="flex items-start gap-4 mb-5">
          {/* Avatar with spinning neon ring */}
          <div className="relative shrink-0" style={{ transform: "translateZ(20px)" }}>
            <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-tr from-blue-500 via-indigo-500 to-purple-500 opacity-20 group-hover:opacity-100 group-hover:rotate-180 transition-all duration-700 blur-[1px]"></div>
            <div className={`relative w-12 h-12 rounded-2xl bg-gradient-to-br ${testimonial.bgGradient} flex items-center justify-center text-white font-bold text-lg shadow-inner`}>
              {testimonial.initials}
            </div>
          </div>
          <div style={{ transform: "translateZ(15px)" }} className="flex-1 min-w-0">
            <h4 className="text-[15px] font-bold text-slate-900 truncate mb-0.5 group-hover:text-blue-600 transition-colors duration-300">{testimonial.name}</h4>
            <p className="text-[12px] font-bold text-[#1d4ed8] uppercase tracking-wider mb-0.5">{testimonial.role}</p>
            <p className="text-[11px] font-semibold text-slate-400 truncate">{testimonial.discipline}</p>
          </div>
        </div>

        {/* Rating */}
        <div style={{ transform: "translateZ(10px)" }} className="flex items-center gap-0.5 mb-4">
          {[...Array(testimonial.rating)].map((_, i) => (
            <Star key={i} size={14} className="fill-amber-400 text-amber-400" />
          ))}
        </div>

        {/* Quote Content */}
        <p style={{ transform: "translateZ(10px)" }} className="text-slate-600 text-sm font-medium leading-relaxed italic relative z-10">
          "{displayQuote}"
        </p>
      </div>

      {/* Modern Capsule Action Button */}
      {isLong && (
        <button
          onClick={() => onReadMore(testimonial)}
          style={{ transform: "translateZ(25px)" }}
          className="text-xs font-bold text-[#1d4ed8] bg-blue-50/50 hover:bg-[#1d4ed8] hover:text-white px-4 py-2 rounded-full border border-blue-100/50 hover:border-transparent transition-all duration-300 mt-6 self-start flex items-center gap-1.5 group/btn cursor-pointer shadow-sm hover:shadow-[0_4px_15px_rgba(29,78,216,0.12)]"
        >
          Read full review
          <span className="transform group-hover/btn:translate-x-0.5 transition-transform duration-300">→</span>
        </button>
      )}
    </motion.div>
  );
}

export default function Home() {
  const [activeTestimonial, setActiveTestimonial] = useState(null);
  const swiperImages = courses.map(course => ({
    src: course.src,
    alt: course.title,
    category: course.category,
    path: course.path
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

      {/* Student Reviews Section */}
      <section className="relative z-10 w-full max-w-[1200px] mx-auto px-6 py-16">
        {/* Decorative background glow for the section */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-[70%] bg-gradient-to-tr from-blue-50/50 via-indigo-50/20 to-purple-50/50 blur-[100px] -z-10 rounded-full opacity-60 pointer-events-none"></div>

        <div className="text-center mb-12 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-[#1d4ed8] font-bold text-sm mb-4"
          >
            <Star size={16} className="fill-[#1d4ed8]" />
            <span>Student Success Stories</span>
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-4xl font-extrabold text-slate-900 tracking-tight mb-4"
          >
            What Our Students Say
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-slate-500 font-semibold max-w-xl mx-auto"
          >
            Hear from our alumni who achieved their dream GATE scores and PSU placements under the guidance of Dr. M. Muthu Samy.
          </motion.p>
        </div>

        <div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10 items-stretch"
          style={{ perspective: "1000px" }}
        >
          {testimonials.map((testimonial, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: idx * 0.1, ease: "easeOut" }}
              className="flex"
            >
              <TestimonialCard testimonial={testimonial} onReadMore={setActiveTestimonial} />
            </motion.div>
          ))}
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

      {/* Modal for full review */}
      <AnimatePresence>
        {activeTestimonial && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveTestimonial(null)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-md cursor-pointer"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="bg-white rounded-[32px] p-8 max-w-lg w-full shadow-[0_24px_70px_rgba(0,0,0,0.15)] border border-slate-100 relative z-[1000] max-h-[85vh] overflow-y-auto"
            >
              <button
                onClick={() => setActiveTestimonial(null)}
                className="absolute right-6 top-6 w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors font-bold text-lg cursor-pointer"
              >
                ×
              </button>

              <div className="flex items-center gap-4 mb-6">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${activeTestimonial.bgGradient} flex items-center justify-center text-white font-bold text-xl shadow-md`}>
                  {activeTestimonial.initials}
                </div>
                <div>
                  <h4 className="text-lg font-bold text-slate-900 leading-tight mb-1">{activeTestimonial.name}</h4>
                  <p className="text-sm font-semibold text-[#1d4ed8]">{activeTestimonial.role}</p>
                  <p className="text-xs font-semibold text-slate-400">{activeTestimonial.discipline}</p>
                </div>
              </div>

              <div className="flex items-center gap-1 mb-6">
                {[...Array(activeTestimonial.rating)].map((_, i) => (
                  <Star key={i} size={16} className="fill-amber-400 text-amber-400" />
                ))}
              </div>

              <p className="text-slate-600 font-medium leading-relaxed italic text-[15px] whitespace-pre-line">
                "{activeTestimonial.quote}"
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
