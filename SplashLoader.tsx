import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles } from 'lucide-react';

interface SplashLoaderProps {
  onComplete: () => void;
}

export default function SplashLoader({ onComplete }: SplashLoaderProps) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 400);

    const completeTimer = setTimeout(() => {
      onComplete();
    }, 2800);

    return () => {
      clearInterval(timer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <motion.div
      id="splash-loader"
      initial={{ opacity: 1 }}
      exit={{ 
        opacity: 0,
        y: -100,
        filter: "blur(20px)",
        transition: { duration: 0.8, ease: [0.76, 0, 0.24, 1] } 
      }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black overflow-hidden"
    >
      {/* Background Matrix/Grid Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(255,106,0,0.15),rgba(0,0,0,0))]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,106,0,0.03)_1px,transparent_1px),linear-gradient(rgba(255,106,0,0.03)_1px,transparent_1px)] bg-[size:100%_4px,32px_32px]" />

      <div className="relative z-10 flex flex-col items-center">
        {/* Animated Brand Emblem */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: [0.8, 1.1, 1], opacity: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="relative mb-8"
        >
          {/* Pulsing Backlight */}
          <div className="absolute -inset-4 bg-orange-600 rounded-full blur-2xl opacity-40 animate-pulse duration-1500" />
          
          <div className="relative flex items-baseline gap-1 py-4 px-6 border border-zinc-800 bg-neutral-950 shadow-[0_0_30px_rgba(255,106,0,0.15)]">
            <span className="text-6xl font-black tracking-tighter text-white">JAN</span>
            <span className="text-xl font-black text-[#FF6A00] uppercase tracking-widest">Store</span>
          </div>
        </motion.div>

        {/* Text Loader */}
        <div className="text-center overflow-hidden h-12">
          <motion.div
            initial={{ y: 40 }}
            animate={{ y: 0 }}
            transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
            className="flex flex-col items-center"
          >
            <h2 className="font-sans font-semibold tracking-[0.25em] text-[#FF6A00] text-sm uppercase flex items-center gap-2">
              <Sparkles className="w-4 h-4 animate-spin text-[#FF6A00]" />
              ESTABLISHED 2007
            </h2>
            <p className="font-mono text-[10px] text-gray-500 tracking-[0.4em] uppercase mt-2">
              LOADING SYSTEM{dots}
            </p>
          </motion.div>
        </div>

        {/* Cinematic progress bar */}
        <div className="w-48 h-[1px] bg-neutral-900 overflow-hidden relative mt-8">
          <motion.div
            initial={{ left: "-100%" }}
            animate={{ left: "100%" }}
            transition={{ duration: 2.2, ease: "easeInOut", repeat: 0 }}
            className="absolute top-0 bottom-0 w-24 bg-gradient-to-r from-transparent via-[#FF6A00] to-transparent shadow-[0_0_8px_#FF6A00]"
          />
        </div>
      </div>

      {/* Side Decorative Numbers inspired by cryptowl */}
      <div className="absolute bottom-6 left-8 font-mono text-[10px] text-neutral-800 tracking-widest hidden md:block">
        MASCULINE_COUTURE // ID_2007_OCT
      </div>
      <div className="absolute bottom-6 right-8 font-mono text-[10px] text-neutral-800 tracking-widest hidden md:block">
        LOC.EGY.CAI // INT_FCR_820
      </div>
    </motion.div>
  );
}
