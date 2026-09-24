import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Quote, CheckCircle2, Star } from 'lucide-react';

export default function TestimonialCarousel({ reviews }) {
  const [activeIndex, setActiveIndex] = useState(0);

  // Default reviews if none provided
  const testimonials = reviews && reviews.length > 0 ? reviews : [
    {
      name: "Rithikaa Kannan",
      role: "GATE ASPIRANT",
      discipline: "One-to-One Online Classes",
      quote: "I am truly grateful to be a part of this academy. The GATE coaching is excellent, with well-structured classes and experienced faculty.",
      rating: 5,
      initials: "RK",
      bgGradient: "from-blue-500 to-indigo-600"
    },
    {
      name: "Priya",
      role: "GATE ASPIRANT",
      discipline: "GATE Coaching",
      quote: "The teaching faculty is excellent and has a very friendly approach. The one to one online classes are highly effective and help me gain indepth knowledge.",
      rating: 5,
      initials: "P",
      bgGradient: "from-purple-500 to-pink-600"
    },
    {
      name: "Kiruthika Krishnakumar",
      role: "GATE ASPIRANT",
      discipline: "GATE Preparation",
      quote: "The teaching at this GATE academy is excellent. Every concept is explained clearly and in a simple way, making even tough topics easy to understand.",
      rating: 5,
      initials: "KK",
      bgGradient: "from-emerald-500 to-teal-600"
    },
    {
      name: "Sanjay Kumar",
      role: "GATE ASPIRANT",
      discipline: "GATE Preparation",
      quote: "Amazing experience! The mock tests and personalized attention helped me secure a top rank in my discipline. Highly recommend this academy.",
      rating: 5,
      initials: "SK",
      bgGradient: "from-cyan-500 to-blue-500"
    },
    {
      name: "Anita Desai",
      role: "GATE ASPIRANT",
      discipline: "GATE Coaching",
      quote: "The best coaching institute for GATE. The study materials are top-notch and the faculty is always available for doubt clearance.",
      rating: 5,
      initials: "AD",
      bgGradient: "from-teal-400 to-emerald-500"
    }
  ];

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % testimonials.length);
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const getVisibleCards = () => {
    const total = testimonials.length;
    // We want 3 cards visible: prev, current, next
    let prevIndex = (activeIndex - 1 + total) % total;
    let nextIndex = (activeIndex + 1) % total;
    
    // For mapping to UI, return array with relative positions
    return [
      { item: testimonials[prevIndex], position: 'prev', index: prevIndex },
      { item: testimonials[activeIndex], position: 'center', index: activeIndex },
      { item: testimonials[nextIndex], position: 'next', index: nextIndex }
    ];
  };

  const visibleCards = getVisibleCards();

  return (
    <section className="relative w-full overflow-hidden bg-white py-20">
      {/* Background soft abstract glow effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-cyan-100/40 rounded-full blur-[100px] pointer-events-none -z-10" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-50/50 rounded-full blur-[80px] pointer-events-none -z-10" />

      <div className="max-w-[1200px] mx-auto px-4 relative z-10">
        {/* Headings */}
        <div className="text-center mb-16">
          <h2 className="text-[40px] md:text-[48px] font-[900] text-[#0f172a] mb-3 tracking-tight">
            What Our Students Say
          </h2>
          <p className="text-[18px] text-slate-500 font-medium">
            Real experiences from our GATE aspirants
          </p>
        </div>

        {/* Carousel Container */}
        <div className="relative flex items-center justify-center min-h-[450px]">
          
          {/* Navigation - Left Arrow */}
          <button 
            onClick={handlePrev}
            className="absolute left-0 md:left-4 z-20 w-12 h-12 flex items-center justify-center bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:bg-slate-50 hover:scale-105 transition-all text-slate-700 border border-slate-100 hidden md:flex"
            aria-label="Previous testimonial"
          >
            <ChevronLeft size={24} />
          </button>

          {/* Cards Area */}
          <div className="relative w-full max-w-[900px] h-[400px] flex justify-center items-center perspective-[1200px]">
            <AnimatePresence mode="popLayout">
              {visibleCards.map((card) => {
                const isCenter = card.position === 'center';
                const isLeft = card.position === 'prev';
                const isRight = card.position === 'next';

                // Assign background color based on position (matching the image)
                const backdropColor = isLeft ? 'bg-[#1E88E5]' : isCenter ? 'bg-[#66BB6A]' : 'bg-[#26A69A]';
                // Rotation for the backdrop
                const backdropRotation = isLeft ? 'rotate-[-6deg]' : isCenter ? 'rotate-[4deg]' : 'rotate-[-8deg]';

                return (
                  <motion.div
                    key={card.index}
                    layout
                    initial={{ 
                      opacity: 0, 
                      x: isLeft ? -200 : isRight ? 200 : 0,
                      scale: 0.8,
                      z: -100
                    }}
                    animate={{ 
                      opacity: isCenter ? 1 : 0.6, 
                      x: isLeft ? '-105%' : isRight ? '105%' : '0%',
                      scale: isCenter ? 1 : 0.85,
                      z: isCenter ? 0 : -50
                    }}
                    exit={{ 
                      opacity: 0,
                      scale: 0.8,
                      z: -100
                    }}
                    transition={{ 
                      duration: 0.5, 
                      ease: [0.32, 0.72, 0, 1] 
                    }}
                    className="absolute w-full max-w-[320px] md:max-w-[350px] flex flex-col items-center"
                  >
                    {/* Tilted Colorful Backdrop */}
                    <div className={`absolute inset-0 rounded-[30px] ${backdropColor} ${backdropRotation} transition-all duration-500 z-0 opacity-80`}></div>

                    {/* Main White Card */}
                    <div className="relative w-full bg-white rounded-[30px] pt-14 pb-8 px-6 flex flex-col items-center text-center shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] z-10 h-[380px]">
                      
                      {/* Avatar Overlapping Top Edge */}
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2">
                        <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${card.item.bgGradient} flex items-center justify-center text-white text-2xl font-bold shadow-md border-[5px] border-white overflow-hidden`}>
                           {card.item.initials}
                        </div>
                      </div>

                      {/* Name & Role (Position) */}
                      <div className="mt-2 mb-4 shrink-0">
                        <h3 className="text-xl font-medium text-slate-800 mb-0.5">{card.item.name}</h3>
                        <p className="text-[14px] italic text-slate-500 font-serif">
                          {card.item.role || "position"}
                        </p>
                      </div>

                      {/* Text (Scrollable) */}
                      <div className="flex-1 w-full overflow-y-auto px-1 mb-4 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
                        <p className="text-slate-600 text-[13px] leading-relaxed">
                          {card.item.quote}
                        </p>
                      </div>

                      {/* Star Badge at bottom for center card */}
                      {isCenter && (
                        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-[0_4px_10px_rgba(0,0,0,0.1)] border border-slate-50 z-20">
                          <Star size={20} className="fill-amber-400 text-amber-400" />
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Navigation - Right Arrow */}
          <button 
            onClick={handleNext}
            className="absolute right-0 md:right-4 z-20 w-12 h-12 flex items-center justify-center bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:bg-slate-50 hover:scale-105 transition-all text-slate-700 border border-slate-100 hidden md:flex"
            aria-label="Next testimonial"
          >
            <ChevronRight size={24} />
          </button>
        </div>

        {/* Pagination Dots */}
        <div className="flex justify-center items-center gap-2 mt-8">
          {[...Array(Math.min(5, testimonials.length))].map((_, i) => {
            // For > 5 items, we can just show 5 dots and highlight the one corresponding to activeIndex modulo 5
            const dotIndex = testimonials.length > 5 ? activeIndex % 5 : i;
            const isActive = testimonials.length > 5 ? (activeIndex % 5 === i) : (activeIndex === i);
            
            return (
              <button
                key={i}
                onClick={() => setActiveIndex(i)}
                className={`transition-all duration-300 rounded-full ${
                  isActive 
                  ? 'w-6 h-2 bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]' 
                  : 'w-2 h-2 bg-slate-200 hover:bg-slate-300'
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            )
          })}
        </div>
        
        {/* Mobile Nav Arrows (Visible only on small screens) */}
        <div className="flex justify-center gap-4 mt-6 md:hidden">
          <button onClick={handlePrev} className="p-3 bg-white rounded-full shadow-sm border border-slate-100 text-slate-700"><ChevronLeft size={20}/></button>
          <button onClick={handleNext} className="p-3 bg-white rounded-full shadow-sm border border-slate-100 text-slate-700"><ChevronRight size={20}/></button>
        </div>

      </div>
    </section>
  );
}
