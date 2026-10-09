import React from 'react';
import { ChevronLeft, ChevronRight, Quote, Star } from 'lucide-react';
import { Autoplay, Navigation, Pagination } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/pagination';

// Card colour themes, used in turn. Full class strings so Tailwind keeps them.
const THEMES = [
  { card: 'bg-[#eff6ff] shadow-[-7px_7px_0_0_#bfdbfe]', blob: 'bg-[#dbeafe]', badge: 'bg-[#1d4ed8]', ring: 'border-[#93c5fd]' },
  { card: 'bg-[#FFFCE1] shadow-[-7px_7px_0_0_#fde68a]', blob: 'bg-[#fef3c7]', badge: 'bg-[#1e3a8a]', ring: 'border-[#fcd34d]' },
  { card: 'bg-[#f5f7ff] shadow-[-7px_7px_0_0_#c7d2fe]', blob: 'bg-[#e0e7ff]', badge: 'bg-[#4f46e5]', ring: 'border-[#a5b4fc]' }
];

// Longer than this and the card shows "Read more" (the text is clamped to fit the card)
const LONG_QUOTE = 170;

const css = `
  .reviews-swiper { padding: 12px 0 56px !important; }
  .reviews-swiper .swiper-slide { width: min(480px, 86vw); height: auto; }
  .reviews-swiper .swiper-pagination-bullet {
    width: 22px; height: 3px; border-radius: 2px; margin: 0 4px !important;
    background: #bfdbfe; opacity: 1; transition: background .3s, width .3s;
  }
  .reviews-swiper .swiper-pagination-bullet-active { width: 34px; background: #1d4ed8; }
  /* Phones: equal-size dots in a short sliding strip, so a long list stays on one line */
  @media (max-width: 639px) {
    .reviews-swiper { padding: 8px 0 44px !important; }
    .reviews-swiper .swiper-slide { width: calc(100vw - 48px); }
    .reviews-swiper .swiper-pagination-bullet { width: 8px; height: 8px; border-radius: 50%; margin: 0 4px !important; }
    .reviews-swiper .swiper-pagination-bullet-active { width: 8px; }
  }
`;

function ReviewCard({ review, theme, onReadMore }) {
  const isLong = review.quote.length > LONG_QUOTE;
  const stars = (
    <div className="flex gap-0.5">
      {[...Array(review.rating || 5)].map((_, i) => (
        <Star key={i} size={13} className="fill-amber-400 text-amber-400" />
      ))}
    </div>
  );
  const byline = (
    <>
      <div className="text-[15px] font-bold text-[#1d4ed8] truncate">{review.name}</div>
      <div className="text-[13px] text-slate-500 truncate">
        {[review.role, review.discipline].filter(Boolean).join(' · ')}
      </div>
    </>
  );
  return (
    <div className={`relative h-full sm:min-h-[270px] rounded-[22px] overflow-hidden ${theme.card}`}>
      {/* Soft corner blob */}
      <div aria-hidden="true" className={`absolute -right-16 -bottom-24 w-60 h-60 rounded-full ${theme.blob}`} />

      <div className="relative h-full flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 p-5 sm:p-7">
        {/* Avatar with quote badge - on phones the name and stars sit beside it */}
        <div className="flex items-center gap-4 sm:block sm:self-center shrink-0">
          <div className="relative shrink-0">
            <div className={`w-16 h-16 sm:w-[124px] sm:h-[124px] rounded-full border bg-white p-1 sm:p-1.5 ${theme.ring}`}>
              <div className={`w-full h-full rounded-full bg-gradient-to-br ${review.bgGradient || 'from-blue-500 to-indigo-600'} flex items-center justify-center text-white font-bold text-xl sm:text-4xl`}>
                {review.initials}
              </div>
            </div>
            <span className={`absolute -top-1 -right-1 sm:top-1 sm:right-0 w-7 h-7 sm:w-10 sm:h-10 rounded-full ${theme.badge} text-white flex items-center justify-center shadow-md`}>
              <Quote size={14} className="fill-white sm:w-4 sm:h-4" />
            </span>
          </div>
          <div className="min-w-0 flex-1 sm:hidden">
            <div className="mb-1">{stars}</div>
            {byline}
          </div>
        </div>

        {/* Review */}
        <div className="min-w-0 flex-1 flex flex-col">
          <div className="hidden sm:block mb-2">{stars}</div>
          <p className="text-[14px] sm:text-[15px] leading-[1.6] text-slate-700 line-clamp-5 whitespace-pre-line">{review.quote}</p>
          {isLong && onReadMore && (
            <button
              type="button"
              onClick={() => onReadMore(review)}
              className="self-start mt-1 text-[13px] font-semibold text-[#1d4ed8] hover:underline"
            >
              Read more
            </button>
          )}
          <div className="hidden sm:block mt-4">{byline}</div>
        </div>
      </div>
    </div>
  );
}

// onReadMore(review): open the full text of a long review
export default function TestimonialCarousel({ reviews = [], onReadMore }) {
  // Star-only ratings have nothing to show on a quote card
  const withText = reviews.filter(r => r.quote && r.quote.trim());
  if (withText.length === 0) return null;
  // The endless loop needs a few more slides than fit on screen - repeat a short list
  let slides = withText;
  while (slides.length < 8) slides = slides.concat(withText);
  // Colours go round in turn; where the loop joins, the last card mustn't match the first
  const themeFor = (i) => (i === slides.length - 1 && i % THEMES.length === 0 ? THEMES[1] : THEMES[i % THEMES.length]);

  const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const isPhone = typeof window !== 'undefined' && window.matchMedia?.('(max-width: 639px)').matches;

  return (
    <section className="relative w-full overflow-hidden bg-white py-14 sm:py-20">
      <style>{css}</style>

      <div className="max-w-[1200px] mx-auto px-4 text-center mb-8 sm:mb-12">
        <h2 className="text-[30px] sm:text-[36px] md:text-[48px] font-[900] text-[#0f172a] mb-3 tracking-tight">
          What Our Students Say
        </h2>
        <p className="text-[15px] sm:text-[17px] md:text-[18px] text-slate-500 font-medium">
          Real experiences from our GATE aspirants
        </p>
      </div>

      <div className="relative max-w-[1500px] mx-auto">
        <Swiper
          className="reviews-swiper"
          modules={[Autoplay, Navigation, Pagination]}
          slidesPerView="auto"
          centeredSlides
          loop
          spaceBetween={isPhone ? 14 : 28}
          speed={700}
          autoplay={reduceMotion ? false : { delay: 3500, disableOnInteraction: false, pauseOnMouseEnter: true }}
          pagination={isPhone ? { clickable: true, dynamicBullets: true, dynamicMainBullets: 3 } : { clickable: true }}
          navigation={{ prevEl: '.reviews-prev', nextEl: '.reviews-next' }}
        >
          {slides.map((review, i) => (
            <SwiperSlide key={review.name + i}>
              <ReviewCard review={review} theme={themeFor(i)} onReadMore={onReadMore} />
            </SwiperSlide>
          ))}
        </Swiper>

        {/* Arrows (phones swipe instead) */}
        <button
          type="button"
          aria-label="Previous review"
          className="reviews-prev absolute left-8 top-[calc(50%-22px)] -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-[#1d4ed8] hover:bg-[#1e3a8a] text-white hidden md:flex items-center justify-center shadow-[0_6px_18px_rgba(29,78,216,0.35)] transition-colors"
        >
          <ChevronLeft size={22} strokeWidth={2.5} />
        </button>
        <button
          type="button"
          aria-label="Next review"
          className="reviews-next absolute right-8 top-[calc(50%-22px)] -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-[#1d4ed8] hover:bg-[#1e3a8a] text-white hidden md:flex items-center justify-center shadow-[0_6px_18px_rgba(29,78,216,0.35)] transition-colors"
        >
          <ChevronRight size={22} strokeWidth={2.5} />
        </button>
      </div>
    </section>
  );
}
