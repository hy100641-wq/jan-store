import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

interface BannerSlide {
  id: number;
  title: string;
  subtitle: string;
  image: string;
  promo: string;
}

const DESIGN_SLIDES: BannerSlide[] = [
  {
    id: 1,
    title: "PREMIUM COUTURE DROP 01G",
    subtitle: "Heavyweight utility layerings for the modern urban landscape. Engineered for active masculine stance.",
    image: "https://images.unsplash.com/photo-1516257984-b1b4d707412e?auto=format&fit=crop&w=1600&q=80",
    promo: "MENS UTILITY WEAR ONLY"
  },
  {
    id: 2,
    title: "SHOES RUNNERS REVOLUTION",
    subtitle: "Air cushioned translucent thick orange soles made from advanced shock polymer compounds. Run Cairo's night.",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1600&q=80",
    promo: "FOOTWEAR EVOLUTION"
  },
  {
    id: 3,
    title: "LUXURY RAW INDESTRUCTIBLE",
    subtitle: "Oversized organic cotton jackets and industrial cargo setups. Built to dominate any backdrop.",
    image: "https://images.unsplash.com/photo-1488161628813-04466f872be2?auto=format&fit=crop&w=1600&q=80",
    promo: "STRENGTH & LUXURY UNIFIED"
  }
];

interface BannerSliderProps {
  onBrowseShop: () => void;
  overrideConfig?: {
    heroTitle?: string;
    heroSubtitle?: string;
    heroBannerImg?: string;
    heroPromoText?: string;
  };
}

export default function BannerSlider({ onBrowseShop, overrideConfig }: BannerSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto cycling
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % DESIGN_SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + DESIGN_SLIDES.length) % DESIGN_SLIDES.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % DESIGN_SLIDES.length);
  };

  // If there are overrides from the control panel, customize the first slide to display this configuration
  const currentSlides = [...DESIGN_SLIDES];
  if (overrideConfig) {
    if (overrideConfig.heroTitle) currentSlides[0].title = overrideConfig.heroTitle;
    if (overrideConfig.heroSubtitle) currentSlides[0].subtitle = overrideConfig.heroSubtitle;
    if (overrideConfig.heroBannerImg) currentSlides[0].image = overrideConfig.heroBannerImg;
    if (overrideConfig.heroPromoText) currentSlides[0].promo = overrideConfig.heroPromoText;
  }

  const activeSlide = currentSlides[currentIndex];

  return (
    <div className="relative w-full h-[85vh] sm:h-[90vh] bg-black overflow-hidden border-b border-neutral-900">
      {/* Background Matrix & Lighting Grid */}
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black to-transparent z-10" />
      <div className="absolute inset-0 bg-black/40 z-10" />

      {/* Slide Visuals */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="absolute inset-0"
        >
          <img
            src={activeSlide.image}
            alt={activeSlide.title}
            className="w-full h-full object-cover object-center brightness-110 contrast-105"
            referrerPolicy="no-referrer"
          />
        </motion.div>
      </AnimatePresence>

      {/* Static Visual Overlays (Cybergrid) */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.15)_50%),linear-gradient(90deg,rgba(255,106,0,0.015)_1px,transparent_1px),linear-gradient(rgba(255,106,0,0.015)_1px,transparent_1px)] bg-[size:100%_4px,24px_24px] z-10 pointer-events-none" />

      {/* Content Drawer */}
      <div className="absolute inset-0 z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-center text-left relative">
        
        {/* Giant Watermark Background Text mimicking the streetwear editorial layout */}
        <div className="absolute top-1/2 left-0 -translate-y-1/2 w-full h-full opacity-5 pointer-events-none select-none z-0 overflow-hidden flex items-center">
          <div className="text-[170px] sm:text-[260px] md:text-[340px] font-black leading-none -ml-16 tracking-tighter uppercase text-white font-sans">
            {activeSlide.title.split(' ').slice(-1)[0] || "STREET"}
          </div>
        </div>

        <div className="max-w-2xl space-y-6 relative z-10">
          {/* Animated Promo Label */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`promo-${currentIndex}`}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-3 py-1 bg-black border border-neutral-800 text-[#FF6A00] font-mono text-[9px] font-black tracking-[0.25em] uppercase w-fit"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF6A00] animate-ping" />
              {activeSlide.promo}
            </motion.div>
          </AnimatePresence>

          {/* Bold Display Heading */}
          <AnimatePresence mode="wait">
            <motion.h1
              key={`heading-${currentIndex}`}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -40 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="font-sans font-black text-5xl sm:text-7xl md:text-[100px] text-white tracking-tighter uppercase leading-[0.85] mb-4"
            >
              {(() => {
                const words = activeSlide.title.split(' ');
                if (words.length > 1) {
                  const last = words.pop();
                  return (
                    <>
                      {words.join(' ')}<br />
                      <span className="text-outline-white">{last}</span>
                    </>
                  );
                }
                return activeSlide.title;
              })()}
            </motion.h1>
          </AnimatePresence>

          {/* Subtitle Description */}
          <AnimatePresence mode="wait">
            <motion.p
              key={`subtitle-${currentIndex}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: 0.15, duration: 0.8 }}
              className="text-neutral-300 font-sans text-sm sm:text-base leading-relaxed tracking-wide font-medium"
            >
              {activeSlide.subtitle}
            </motion.p>
          </AnimatePresence>

          {/* Call to action */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="pt-4"
          >
            <button
              onClick={onBrowseShop}
              className="px-10 py-5 bg-[#FF6A00] text-black font-sans font-black tracking-widest text-sm uppercase hover:translate-y-[-2px] hover:shadow-[0_10px_30px_-10px_rgba(255,106,0,0.5)] transition-all flex items-center gap-3 rounded-none group cursor-pointer"
            >
              LOCATE COUTURE DROP <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1.5 text-black" />
            </button>
          </motion.div>
        </div>
      </div>

      {/* Carousel Micro Controller Arrows */}
      <div className="absolute right-4 sm:right-12 bottom-12 z-20 flex gap-2">
        <button
          onClick={handlePrev}
          className="p-3 border border-neutral-800 bg-black/80 hover:bg-[#FF6A00] hover:text-black hover:border-[#FF6A00] text-neutral-400 transition-colors cursor-pointer rounded-none"
          title="Previous Slide"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={handleNext}
          className="p-3 border border-neutral-800 bg-black/80 hover:bg-[#FF6A00] hover:text-black hover:border-[#FF6A00] text-neutral-400 transition-colors cursor-pointer rounded-none"
          title="Next Slide"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Aesthetic status coordinates */}
      <div className="absolute left-8 lg:left-12 bottom-12 z-20 font-mono text-[9px] text-neutral-600 hidden md:block">
        ACTIVE_INDEX: 0{activeSlide.id} // SEC_CYCLE: 6.0S
      </div>
    </div>
  );
}
