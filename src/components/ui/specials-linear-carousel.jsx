"use client";

import React, {
  useEffect,
  useRef,
  useState,
  createContext,
  useContext,
} from "react";

import { cn } from "../../lib/utils";
import { motion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const CarouselContext = createContext({
  onCardClose: () => {},
  currentIndex: 0,
});

export const Carousel = ({
  items,
  initialScroll = 0,
  autoplay = false,
  autoplaySpeed = 0.5,
}) => {
  const carouselRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const animationRef = useRef(null);
  // Use items directly without duplicating for infinite effect
  const loopedItems = items;

  useEffect(() => {
    if (carouselRef.current) {
      carouselRef.current.scrollLeft = initialScroll;
      checkScrollability();
    }
  }, [initialScroll]);

  // Auto-scroll logic
  useEffect(() => {
    if (!autoplay || isHovered) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }

    const scroll = () => {
      if (carouselRef.current) {
        // Scroll by speed
        carouselRef.current.scrollLeft += autoplaySpeed;

        checkScrollability();
        
        // Stop autoplay if we reach the end
        const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
        if (scrollLeft >= scrollWidth - clientWidth) {
          return;
        }

        animationRef.current = requestAnimationFrame(scroll);
      }
    };

    animationRef.current = requestAnimationFrame(scroll);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [autoplay, autoplaySpeed, isHovered]);

  const checkScrollability = () => {
    if (carouselRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth);
    }
  };

  const scrollLeft = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollTo({ left: 0, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (carouselRef.current) {
      const container = carouselRef.current;
      container.scrollTo({ left: container.scrollWidth, behavior: "smooth" });
    }
  };

  const handleCardClose = (index) => {
    if (carouselRef.current) {
      const cardWidth = isMobile() ? 230 : 320; // (md:w-80)
      const gap = isMobile() ? 4 : 8;
      const scrollPosition = (cardWidth + gap) * (index + 1);
      carouselRef.current.scrollTo({
        left: scrollPosition,
        behavior: "smooth",
      });
      setCurrentIndex(index);
    }
  };

  const isMobile = () => {
    return window && window.innerWidth < 768;
  };

  // Drag to scroll logic
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setStartX(e.pageX - (carouselRef.current?.offsetLeft || 0));
    setScrollLeftState(carouselRef.current?.scrollLeft || 0);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - (carouselRef.current?.offsetLeft || 0);
    const walk = (x - startX) * 2; // Scroll-fast
    if (carouselRef.current) {
      carouselRef.current.scrollLeft = scrollLeftState - walk;
    }
  };

  return (
    <CarouselContext.Provider
      value={{ onCardClose: handleCardClose, currentIndex }}
    >
      <div
        className="relative w-full mx-auto px-4 md:px-8"
        onTouchStart={() => setIsHovered(true)}
        onTouchEnd={() => setIsHovered(false)}
      >
        <div
          className={cn(
            "flex w-full overflow-x-scroll overscroll-x-auto scroll-smooth py-10 [scrollbar-width:none] md:py-20 cursor-grab active:cursor-grabbing",
            isDragging && "cursor-grabbing scroll-auto",
          )}
          ref={carouselRef}
          onScroll={checkScrollability}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
        >
          <div
            className={cn(
              "absolute right-0 z-1000 h-auto w-[5%] overflow-hidden bg-gradient-to-l from-white to-transparent pointer-events-none",
            )}
          ></div>

          <div className={cn("flex flex-row justify-start gap-4")}>
            {loopedItems.map((item, index) => (
              <motion.div
                initial={{
                  opacity: 0,
                  y: 20,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  duration: 0.5,
                  delay: 0.2 * (index % items.length), // Stagger only relevant to original set length ideally
                  ease: "easeOut",
                }}
                key={"card" + index}
                className="rounded-3xl"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                {item}
              </motion.div>
            ))}
          </div>
        </div>
        <div className="flex justify-center gap-3 mt-4 relative z-10">
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm"
            onClick={scrollLeft}
            disabled={!canScrollLeft}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <ChevronLeft className="h-6 w-6 text-slate-600" />
          </button>
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm"
            onClick={scrollRight}
            disabled={!canScrollRight}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <ChevronRight className="h-6 w-6 text-slate-600" />
          </button>
        </div>
      </div>
    </CarouselContext.Provider>
  );
};

export const Card = ({
  card,
  index,
  layout = false,
}) => {
  return (
    <motion.button
      layoutId={layout ? `card-${card.title}-${index}` : undefined}
      className="relative z-10 flex h-60 w-56 flex-col items-start justify-end overflow-hidden rounded-3xl bg-slate-100 md:h-96 md:w-80"
    >
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-2/3 bg-gradient-to-t from-white via-white/80 to-transparent" />
      <div className="relative z-40 p-8 w-full">
        {card.category && (
          <motion.p
            layoutId={layout ? `category-${card.category}-${index}` : undefined}
            className="text-left font-sans text-sm font-bold text-orange-600 md:text-base"
          >
            {card.category}
          </motion.p>
        )}
        <motion.p
          layoutId={layout ? `title-${card.title}-${index}` : undefined}
          className="mt-2 max-w-xs text-left font-sans text-xl font-bold [text-wrap:balance] text-slate-900 md:text-3xl"
        >
          {card.title}
        </motion.p>
      </div>
      <img
        src={card.src}
        alt={card.title}
        className="absolute inset-0 z-10 w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500"
      />
    </motion.button>
  );
};

export default Carousel;
