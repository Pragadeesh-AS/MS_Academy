import React from 'react';
import { Carousel_003 } from "./ui/swiper-carousel";
import { ShinyButton } from "./ui/shiny-button";
import { BookOpen, Target, Users } from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

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
      {/* Hero Section */}
      <main className="relative flex flex-col lg:flex-row items-center justify-between text-center lg:text-left px-4 pt-10 pb-12 max-w-[1200px] w-full mx-auto gap-12 mt-12">
        <div className="flex-1 flex flex-col items-center lg:items-start max-w-2xl">
          <h1 className="text-[52px] md:text-[72px] font-[900] text-slate-900 leading-[1.1] tracking-[-0.03em] mb-6">
            Best <span className="text-[#f36b2b]">GATE Coaching</span> in Coimbatore <br />
            <span className="text-[32px] md:text-[42px] text-slate-600 font-bold block mt-4 tracking-tight">| Online & Offline Classes</span>
          </h1>

          <p className="text-[17px] text-slate-500 mb-10 leading-relaxed">
            Learn directly from Mr. M. Muthu Samy (NIT Trichy Alumnus). Go from average scores to your dream PSU or IIT with ease using MS Gate Academy, your favourite coaching platform.
          </p>

          <ShinyButton className="px-8 py-4 text-[17px] font-semibold text-white rounded-xl bg-gradient-to-b from-[#4a4a4a] via-[#2a2a2a] to-[#111111] shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:scale-[1.02] transition-transform border border-[#333333]">
            Get Started
          </ShinyButton>
        </div>

        <div className="w-full lg:w-[550px] xl:w-[700px] flex justify-center items-center">
          <DotLottieReact
            src="https://lottie.host/a5950b64-131e-4719-ad3f-d507b18b464f/evcOXBnTv7.lottie"
            loop
            autoplay
          />
        </div>
      </main>

      {/* Features Section */}
      <section className="relative z-10 w-full max-w-[1100px] mx-auto px-6 py-16 md:py-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8 lg:gap-16">
          {/* Feature 1 */}
          <div className="flex flex-col items-center text-center group">
            <div className="w-16 h-16 rounded-[20px] bg-[#fff5f0] text-[#f36b2b] flex items-center justify-center mb-6 group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-300">
              <BookOpen size={30} strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3 tracking-tight">Expert Mentorship</h3>
            <p className="text-[15px] text-slate-500 leading-relaxed">
              Learn directly from NIT Trichy alumni. Get the right guidance from someone who has cracked GATE 4 times consecutively.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="flex flex-col items-center text-center group">
            <div className="w-16 h-16 rounded-[20px] bg-slate-50 text-slate-700 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-300 border border-slate-100 shadow-sm">
              <Target size={30} strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3 tracking-tight">Mock Test Series</h3>
            <p className="text-[15px] text-slate-500 leading-relaxed">
              Real GATE-level CBT practice. Evaluate your performance with our in-depth analytics and stay ahead of the competition.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="flex flex-col items-center text-center group">
            <div className="w-16 h-16 rounded-[20px] bg-[#fff5f0] text-[#f36b2b] flex items-center justify-center mb-6 group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-300">
              <Users size={30} strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3 tracking-tight">Personalized Attention</h3>
            <p className="text-[15px] text-slate-500 leading-relaxed">
              Premium offline coaching in Coimbatore with small batches. Never get lost in a crowd again.
            </p>
          </div>
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
