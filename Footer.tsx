import { Sparkles, MessageSquare, Shield, Clock } from 'lucide-react';

interface FooterProps {
  setCurrentPage: (page: string) => void;
  instaLink?: string;
  tiktokLink?: string;
  facebookLink?: string;
}

export default function Footer({
  setCurrentPage,
  instaLink = "https://www.instagram.com/jan_store2007?igsh=MXNndDR0enpqbjdyOA==",
  tiktokLink = "https://www.tiktok.com/@janstore7?_r=1&_t=ZS-97Gw3MuxvQw",
  facebookLink = "https://www.facebook.com/share/1Qh9ZmriZv/"
}: FooterProps) {
  return (
    <footer className="bg-black border-t border-neutral-900 pt-16 pb-12 overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_120%,rgba(255,106,0,0.04),transparent)]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          {/* Brand description column */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <span className="border border-[#FF6A00] px-3.5 py-0.5 text-white bg-black font-sans font-black text-xl tracking-tighter">JAN</span>
              <span className="font-sans font-black text-xs text-neutral-400 tracking-wider">STORE</span>
            </div>
            <p className="text-[#a3a3a3] text-sm leading-relaxed mb-6 max-w-sm">
              The ultimate destination for men's premium streetwear. Aggressive silhouettes, heavyweight loopback cotton, and engineered details crafted exclusively for men who demand presence.
            </p>
            <div className="flex items-center gap-4 text-xs font-mono font-bold tracking-[0.2em] text-[#FF6A00]">
              <Sparkles className="w-4 h-4" /> MENSWEAR LUXURY DROP // 01G
            </div>
          </div>

          {/* Social connections Column */}
          <div>
            <h4 className="font-sans font-extrabold text-white text-xs tracking-widest uppercase mb-6 border-b border-neutral-900 pb-2">
              SOCIAL FEED
            </h4>
            <ul className="space-y-4 text-sm font-mono text-[#a3a3a3]">
              <li>
                <a
                  href={instaLink}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white hover:underline hover:decoration-[#FF6A00] flex items-center gap-2 group"
                >
                  INSTAGRAM <span className="text-[10px] text-neutral-600 group-hover:text-[#FF6A00] transition-colors">↗</span>
                </a>
              </li>
              <li>
                <a
                  href={tiktokLink}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white hover:underline hover:decoration-[#FF6A00] flex items-center gap-2 group"
                >
                  TIKTOK <span className="text-[10px] text-neutral-600 group-hover:text-[#FF6A00] transition-colors">↗</span>
                </a>
              </li>
              <li>
                <a
                  href={facebookLink}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white hover:underline hover:decoration-[#FF6A00] flex items-center gap-2 group"
                >
                  FACEBOOK <span className="text-[10px] text-neutral-600 group-hover:text-[#FF6A00] transition-colors">↗</span>
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/201144585584"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white hover:underline hover:decoration-[#FF6A00] flex items-center gap-2 group font-bold text-[#FF6A00]"
                >
                  WHATSAPP DIRECT <span className="text-[10px] text-neutral-400 group-hover:text-[#FF6A00]">↗</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Core directories column */}
          <div>
            <h4 className="font-sans font-extrabold text-white text-xs tracking-widest uppercase mb-6 border-b border-neutral-900 pb-2">
              STATION DIRECTORY
            </h4>
            <ul className="space-y-4 text-sm font-sans text-[#a3a3a3]">
              <li>
                <button
                  onClick={() => setCurrentPage('home')}
                  className="hover:text-white transition-colors cursor-pointer text-left uppercase text-xs font-bold tracking-widest"
                >
                  HOMEPAGE
                </button>
              </li>
              <li>
                <button
                  onClick={() => setCurrentPage('shop')}
                  className="hover:text-white transition-colors cursor-pointer text-left uppercase text-xs font-bold tracking-widest"
                >
                  SHOP COUTURE
                </button>
              </li>
              <li>
                <button
                  onClick={() => setCurrentPage('contact')}
                  className="hover:text-white transition-colors cursor-pointer text-left uppercase text-xs font-bold tracking-widest"
                >
                  CONNECT DIRECT
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Feature widgets row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 py-8 border-t border-b border-neutral-900 my-8 text-xs font-mono font-bold tracking-widest text-neutral-500">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-[#FF6A00]" />
            <span>MASCULINE STYLES ONLY</span>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-[#FF6A00]" />
            <span>INSTAPAY & WALLET ONLY</span>
          </div>
          <div className="flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-[#FF6A00]" />
            <span>24/7 WHATSAPP HELP</span>
          </div>
        </div>

        {/* Legal copyright section info */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-neutral-600">
          <span>&copy; {new Date().getFullYear()} JAN STORE. ALL RIGHTS RESERVED. EXCLUSIVELY FOR MEN.</span>
          <span className="text-[10px] tracking-widest uppercase flex items-center gap-1.5 bg-neutral-950 px-3 py-1 border border-neutral-900 animate-pulse">
            ENGINEERED COUTURE
          </span>
        </div>
      </div>

      {/* Categories running marquee ticker */}
      <div className="w-full bg-zinc-950/80 border-t border-neutral-900 py-3.5 overflow-hidden mt-12 relative z-10 select-none">
        <div className="flex whitespace-nowrap text-zinc-500 text-[10px] font-black uppercase tracking-[0.4em] w-full items-center">
          <div className="animate-marquee inline-block whitespace-nowrap">
            <span className="mx-8">T-SHIRTS</span>
            <span className="text-[#FF6A00] text-sm">•</span>
            <span className="mx-8 text-white">HOODIES</span>
            <span className="text-[#FF6A00] text-sm">•</span>
            <span className="mx-8">JACKETS</span>
            <span className="text-[#FF6A00] text-sm">•</span>
            <span className="mx-8 text-white">PANTS</span>
            <span className="text-[#FF6A00] text-sm">•</span>
            <span className="mx-8">SNEAKERS</span>
            <span className="text-[#FF6A00] text-sm">•</span>
            
            {/* Loop duplicate */}
            <span className="mx-8">T-SHIRTS</span>
            <span className="text-[#FF6A00] text-sm">•</span>
            <span className="mx-8 text-white">HOODIES</span>
            <span className="text-[#FF6A00] text-sm">•</span>
            <span className="mx-8">JACKETS</span>
            <span className="text-[#FF6A00] text-sm">•</span>
            <span className="mx-8 text-white">PANTS</span>
            <span className="text-[#FF6A00] text-sm">•</span>
            <span className="mx-8">SNEAKERS</span>
            <span className="text-[#FF6A00] text-sm">•</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
